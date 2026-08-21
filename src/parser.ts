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
  
  // 태그 독립적 탐색: <p>뿐만 아니라 모든 요소를 대상으로 탐색
  const allElements = doc.querySelectorAll('*');
  const logRows = Array.from(allElements).filter((el) => {
    const tagName = el.tagName.toLowerCase();
    
    // color 속성을 가지고 있거나(p, div 등), 기존 호환성을 위해 p 태그인 경우를 대상으로 함
    const styleAttr = el.getAttribute('style') || '';
    const hasColor = /color\s*:/.test(styleAttr) || !!(el as HTMLElement).style?.color;
    
    if (!hasColor && tagName !== 'p') return false;

    // 각 행 내부에 최소 2개 이상의 span이 있어야 함
    const spans = el.querySelectorAll('span');
    if (spans.length < 2) return false;

    // 다른 로그들(div 등)을 크게 감싸는 최상위 컨테이너를 배제하기 위해,
    // 첫 번째 span이 해당 엘리먼트의 직계 자식(direct child)인지 확인
    if (spans[0].parentElement !== el) return false;

    return true;
  });

  const newLogs: LogEntry[] = [];
  const newChars: Record<string, CharSetting> = {};
  const newCharOrder: string[] = [];
  const newTabs: Record<string, TabSetting> = {};
  const newTabOrder: string[] = [];
  const colorsFound = new Set<string>();

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

    // Identity Extraction
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
      newChars[charId].color = color; // keep last color, or maybe we shouldn't overwrite?
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

  const isLogEmpty = (content: string) => {
    const stripped = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    return stripped === '';
  };
  
  let firstNonEmptyIndex = newLogs.findIndex(log => !isLogEmpty(log.content));
  if (firstNonEmptyIndex === -1) firstNonEmptyIndex = 0;
  const trimmedLogs = newLogs.slice(firstNonEmptyIndex);

  // Check for 'system' char removal by looking for any character named 'system' that lacks non-commands
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
