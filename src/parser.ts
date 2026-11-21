import { LogEntry, CharSetting, TabSetting, TabFormat } from './types';

const rgbToHex = (colorStr: string) => {
  if (!colorStr) return '';
  if (colorStr.startsWith('#')) return colorStr;
  const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return '';
  return '#' + match.slice(1).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
};

export const parseLogFile = async (file: File) => {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  
  const newLogs: LogEntry[] = [];
  const newChars: Record<string, CharSetting> = {};
  const newCharOrder: string[] = [];
  const newTabs: Record<string, TabSetting> = {};
  const newTabOrder: string[] = [];
  const colorsFound = new Set<string>();

  const articleRows = doc.querySelectorAll('article.message');

  if (articleRows.length > 0) {
    // ==========================================
    // ✨ 신형 파서 (최신 코코포리아 포맷 대응)
    // ==========================================
    let tabCounter = 0;
    let charCounter = 0;
    const fallbackTabIds = new Map<string, string>();
    const fallbackCharIds = new Map<string, string>();

    Array.from(articleRows).forEach((article, index) => {
      // 1. 탭(채널) 고유 이름 추출
      let rawTabName = 'Main';
      const channelNameEl = article.querySelector('.channel-name');
      if (channelNameEl) {
        rawTabName = channelNameEl.textContent?.trim() || 'Main';
      } else {
        // 단일 채널 다운로드 시 (채널명이 없을 경우) 제목에서 괄호 안의 이름 추출
        const titleEl = doc.querySelector('.log-title');
        if (titleEl) {
          const tText = titleEl.textContent?.trim() || '';
          const tMatch = tText.match(/\[(.*?)\]/);
          if (tMatch) rawTabName = tMatch[1].trim();
        }
      }

      // 2. 채널 ID와 탭 서식 매핑
      const channelId = article.getAttribute('data-channel') || rawTabName;
      let tabId = fallbackTabIds.get(channelId);
      
      if (!tabId) {
        tabId = `tab_${++tabCounter}`;
        fallbackTabIds.set(channelId, tabId);
        
        let format: TabFormat = 'main';
        const lowerTab = rawTabName.toLowerCase();
        if (lowerTab.includes('other') || lowerTab.includes('잡담')) format = 'other';
        else if (lowerTab.includes('info') || lowerTab.includes('정보')) format = 'info';
        else if (lowerTab.includes('secret') || lowerTab.includes('비밀')) format = 'secret';
        
        newTabs[tabId] = { id: tabId, name: rawTabName, format, visible: true, color: '#ffd400' };
        newTabOrder.push(tabId);
      }
      const tab = newTabs[tabId].name;

      // 3. 화자 이름 & 색상 추출
      let name = 'system';
      let color = '';
      const speakerEl = article.querySelector('.speaker');
      if (speakerEl) {
        name = speakerEl.textContent?.trim() || 'Unknown';
        const styleAttr = speakerEl.getAttribute('style') || '';
        const colorMatch = styleAttr.match(/--speaker-color\s*:\s*([^;"\s]+)/i);
        color = colorMatch ? rgbToHex(colorMatch[1].trim()) : '';
      } else if (article.classList.contains('system')) {
        name = 'system';
      }

      if (color && color !== '#000000' && color !== '#000') colorsFound.add(color.toUpperCase());

      // 4. ✨ 핵심 개선: 오직 [이름 + 색상] 조합으로만 캐릭터를 고유 식별합니다!
      const charKey = `${name}_${color}`;
      let charId = fallbackCharIds.get(charKey);
      if (!charId) {
        charId = `char_${++charCounter}`;
        fallbackCharIds.set(charKey, charId);
        newChars[charId] = { id: charId, name, color, imageUrl: '', visible: true };
        newCharOrder.push(charId);
      }

      // 5. 대사 내용 & 주사위 결과 묶기
      const contentNodes = article.querySelectorAll('.message-text, .roll-result');
      const content = Array.from(contentNodes).map(node => node.innerHTML.trim()).join('<br>');
      const isCommand = article.classList.contains('system') || article.querySelector('.roll-result') !== null;

      newLogs.push({
        id: `log-${index}`,
        color,
        tabId,
        tab,
        charId,
        name,
        content,
        isCommand
      });
    });

  } else {
    // ==========================================
    // ⚙️ 구형 파서 (과거 호환성 유지용)
    // ==========================================
    const allElements = doc.querySelectorAll('*');
    const logRows = Array.from(allElements).filter((el) => {
      const tagName = el.tagName.toLowerCase();
      const styleAttr = el.getAttribute('style') || '';
      const hasColor = /color\s*:/.test(styleAttr) || !!(el as HTMLElement).style?.color;
      
      if (!hasColor && tagName !== 'p') return false;
      const spans = el.querySelectorAll('span');
      if (spans.length < 2) return false;
      if (spans[0].parentElement !== el) return false;

      return true;
    });

    let tabCounter = 0;
    let charCounter = 0;
    const fallbackTabIds = new Map<string, string>();
    const fallbackCharIds = new Map<string, string>();

    logRows.forEach((p, index) => {
      const spans = Array.from(p.querySelectorAll('span'));
      if (spans.length < 2) return;

      const styleAttr = p.getAttribute('style') || '';
      const colorMatch = styleAttr.match(/color\s*:\s*([^;]+)/i);
      const color = colorMatch ? rgbToHex(colorMatch[1]) : rgbToHex((p as HTMLElement).style.color);
      
      if (color && color !== '#000000') colorsFound.add(color.toUpperCase());

      const tabRaw = spans[0].textContent?.trim() || '';
      const tabMatch = tabRaw.match(/\[(.*?)\]/);
      const tab = tabMatch ? tabMatch[1].trim() : '';
      
      let name = 'Unknown';
      let content = '';

      if (spans.length >= 3) {
        name = spans[1].textContent?.trim() || 'Unknown';
        content = spans[2].innerHTML.trim();
      } else {
        content = spans[1].innerHTML.trim();
      }

      const isCommand = content.includes('|') || content.includes('＞') || content.includes('→') || content.includes('choice[');

      let tabId = p.getAttribute('data-tab-id');
      if (!tabId) {
        if (tab && !fallbackTabIds.has(tab)) {
          fallbackTabIds.set(tab, `tab_${++tabCounter}`);
        }
        tabId = tab ? fallbackTabIds.get(tab)! : '';
      }

      let charId = p.getAttribute('data-char-id');
      if (!charId) {
        if (!fallbackCharIds.has(name)) {
          fallbackCharIds.set(name, `char_${++charCounter}`);
        }
        charId = fallbackCharIds.get(name)!;
      }

      newLogs.push({
        id: `log-${index}`,
        color,
        tabId,
        tab,
        charId,
        name,
        content,
        isCommand
      });

      if (!newChars[charId]) {
        newChars[charId] = { id: charId, name, color, imageUrl: '', visible: true };
        newCharOrder.push(charId);
      } else {
        newChars[charId].color = color; 
      }

      if (tabId && !newTabs[tabId]) {
        let format: TabFormat = 'main';
        const lowerTab = tab.toLowerCase();
        if (lowerTab.includes('other') || lowerTab.includes('잡담')) format = 'other';
        if (lowerTab.includes('info') || lowerTab.includes('정보')) format = 'info';
        if (lowerTab.includes('secret') || lowerTab.includes('비밀')) format = 'secret';
        newTabs[tabId] = { id: tabId, name: tab, format, visible: true, color: '#ffd400' };
        newTabOrder.push(tabId);
      }
    });
  }

  // ==========================================
  // 빈 로그 필터링 및 시스템 화자 정리 (공통)
  // ==========================================
  const isLogEmpty = (content: string) => {
    const stripped = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return stripped === '';
  };
  
  let firstNonEmptyIndex = newLogs.findIndex(log => !isLogEmpty(log.content));
  if (firstNonEmptyIndex === -1) firstNonEmptyIndex = 0;
  const trimmedLogs = newLogs.slice(firstNonEmptyIndex);

  const systemCharIds = newCharOrder.filter(id => newChars[id]?.name.toLowerCase() === 'system');
  for (const sysId of systemCharIds) {
    const hasNonCommandSystem = trimmedLogs.some(log => log.charId === sysId && !log.isCommand);
    if (!hasNonCommandSystem) {
      delete newChars[sysId];
      const idx = newCharOrder.indexOf(sysId);
      if (idx !== -1) newCharOrder.splice(idx, 1);
    }
  }

  return {
    trimmedLogs,
    newChars,
    newCharOrder,
    newTabs,
    newTabOrder,
    colorsFound: Array.from(colorsFound)
  };
};
// 코코포리아 원본 JSON 파서. HTML 파서와 동일한 반환 구조를 사용해
// 기존 로그 편집 UI에서 탭/화자/표정 목록을 그대로 활용합니다.
export const parseCcfoliaJsonFile = async (file: File) => {
  const raw = JSON.parse(await file.text());
  if (!raw || !Array.isArray(raw.messages) || !raw.images || typeof raw.images !== 'object') {
    throw new Error('코코포리아 원본 JSON 형식이 아닙니다. messages와 images 항목을 확인해 주세요.');
  }

  const newLogs: LogEntry[] = [];
  const newChars: Record<string, CharSetting> = {};
  const newCharOrder: string[] = [];
  const newTabs: Record<string, TabSetting> = {};
  const newTabOrder: string[] = [];
  const colorsFound = new Set<string>();
  const charIds = new Map<string, string>();
  const tabIds = new Map<string, string>();
  const expressionSeen: Record<string, Set<string>> = {};
  const imageData: Record<string, string> = raw.images;

  const inferFormat = (name: string): TabFormat => {
    const lower = name.toLowerCase();
    if (lower.includes('other') || lower.includes('잡담')) return 'other';
    if (lower.includes('info') || lower.includes('정보')) return 'info';
    if (lower.includes('secret') || lower.includes('비밀')) return 'secret';
    return 'main';
  };
  const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;').replace(/'/g, '&#39;');

  raw.messages.forEach((message: any, index: number) => {
    const rawChannelId = String(message.channel || 'main');
    const tabName = String(message.channelName || (rawChannelId === 'main' ? 'main' : rawChannelId));
    let tabId = tabIds.get(rawChannelId);
    if (!tabId) {
      tabId = `ccfolia_tab_${newTabOrder.length + 1}`;
      tabIds.set(rawChannelId, tabId);
      newTabs[tabId] = { id: tabId, name: tabName, format: inferFormat(tabName), visible: true, color: '#ffd400' };
      newTabOrder.push(tabId);
    }

    const name = String(message.name || 'system');
    const color = typeof message.color === 'string' ? message.color : '';
    if (color && color.toLowerCase() !== '#000000' && color.toLowerCase() !== '#000') colorsFound.add(color.toUpperCase());
    const charKey = `${name}\u0000${color}`;
    let charId = charIds.get(charKey);
    if (!charId) {
      charId = `ccfolia_char_${newCharOrder.length + 1}`;
      charIds.set(charKey, charId);
      newCharOrder.push(charId);
      newChars[charId] = { id: charId, name, color, imageUrl: '', expressions: [], visible: true };
      expressionSeen[charId] = new Set<string>();
    }

    const imageKey = message.iconImage ? String(message.iconImage) : '';
    const iconUrl = imageKey && typeof imageData[imageKey] === 'string' ? imageData[imageKey] : '';
    if (iconUrl && !expressionSeen[charId].has(iconUrl)) {
      expressionSeen[charId].add(iconUrl);
      const expressions = newChars[charId].expressions || [];
      expressions.push({ label: `@JSON ${expressions.length + 1}`, url: iconUrl });
      newChars[charId].expressions = expressions;
      if (!newChars[charId].imageUrl) newChars[charId].imageUrl = iconUrl;
    }

    const text = String(message.text ?? '');
    const isCommand = message.type === 'system' || message.type === 'dice' || message.type === 'command';
    newLogs.push({
      id: `ccfolia_log_${index + 1}`,
      color,
      tabId,
      tab: tabName,
      charId,
      name,
      content: escapeHtml(text).replace(/\r?\n/g, '<br>'),
      isCommand,
      iconUrl: iconUrl || undefined
    });
  });

  return {
    trimmedLogs: newLogs,
    newChars,
    newCharOrder,
    newTabs,
    newTabOrder,
    colorsFound: Array.from(colorsFound)
  };
};
