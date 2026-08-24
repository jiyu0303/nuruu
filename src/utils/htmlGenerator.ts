import { LogEntry, CharSetting, TabSetting, Illustration } from '../types';
import { cn, r, linkifyAndFormat } from '../utils';
import DOMPurify from 'dompurify';
import { fonts } from '../constants';
import { splitNarration } from './textTokenizer';

const hexToRgbValues = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

export const generateFinalHtmlStr = (
  filteredLogs: LogEntry[],
  mergedLogs: LogEntry[],
  charSettings: Record<string, CharSetting>,
  tabSettings: Record<string, TabSetting>,
  cssFormat: 'inline' | 'internal',
  theme: 'dark' | 'light',
  darkBgColor: string,
  lightBgColor: string,
  filterBarMode: 'none' | 'floating' | 'fixed',
  fontSize: number,
  fontFamily: string,
  disableOtherColor: boolean,
  hideEmptyAvatars: boolean,
  hideAllAvatars: boolean,
  narrationCharacter: string | null,
  enableSentenceSpacing: boolean,
  insertedBlocks: Record<string, any[]>,
  mergeTabs: Set<string>,
  mergeTabStyles: Set<string>,
  showTabNames: Set<string>,
  pageTitle: string,
  fontValue: string,
  textFontSize: number = 14,
  lineHeight: number = 1.6,
  letterSpacing: number = 0,
  blockSpacing: number = 2,
  contentPadding: number = 12,
  avatarSizeValue: number = 46,
  showLogDivider: boolean = false,
  illustrations: Illustration[] = [],
  originalLogs: LogEntry[] = []
) => {
  const isDark = theme === 'dark';
  const cleanStyle = (styleStr: string) => {
    if (!styleStr) return '';
    let clean = styleStr
      .replace(/background-color:/gi, 'background:')
      // Compress 4-directional margin/padding into shorthand formats
      .replace(/(margin|padding):\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)/gi, (match, prop, top, right, bottom, left) => {
        if (top === bottom && right === left) {
          if (top === right) return `${prop}:${top}`;
          return `${prop}:${top} ${right}`;
        }
        if (right === left) return `${prop}:${top} ${right} ${bottom}`;
        return match;
      })
      .replace(/:\s+/g, ':')
      .replace(/;\s+/g, ';')
      .trim();
    
    // Hex code compression (#ffffff -> #fff, #000000 -> #000, etc.)
    clean = clean.replace(/#([0-9a-fA-F])\1([0-9a-fA-F])\2([0-9a-fA-F])\3(?![0-9a-fA-F])/g, '#$1$2$3');
    
    if (clean.endsWith(';')) {
      clean = clean.slice(0, -1);
    }
    return clean;
  };
  const shortenId = (id: string) => {
    if (!id) return '';
    if (id === '__NARRATION__') return 'cn';
    const clean = id.replace(/^tab_/, 't').replace(/^char_/, 'c').replace(/[^a-zA-Z0-9_-]/g, '');
    if (/^[0-9]/.test(clean)) {
      return 'c' + clean;
    }
    return clean;
  };
  const sectionIds = new Set(filteredLogs.map(l => l.sectionId).filter(Boolean));
  const isFullExport = sectionIds.size > 1;
  const bgColor = isDark ? darkBgColor : lightBgColor;
  const textColor = isDark ? '#EEEEEE' : '#1a1a1a';
  const otherTextColor = isDark ? '#AAAAAA' : '#757575';
  const borderColor = isDark ? '#444' : '#e5e5e5';
  const infoBg = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
  const commandBg = isDark ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.03)';
  const avatarPlaceholder = isDark ? '#242424' : '#f0f0f0';

  const overrideScale = fontSize / 14;
  textFontSize *= overrideScale;
  letterSpacing *= overrideScale;

  const s = (val: number) => r(val * overrideScale);
  const t = (val: number) => r(val * (textFontSize / 14));

  const avatarSize = s(avatarSizeValue);
  const gapSize = s(12);
  let effectiveBlockSpacing = blockSpacing;
  let basePaddingVertical = 12;

  if (effectiveBlockSpacing < 0) {
    basePaddingVertical = Math.max(2, basePaddingVertical + effectiveBlockSpacing / 2);
    effectiveBlockSpacing = 0;
  }

  const paddingVertical = s(basePaddingVertical); // Scaled padding (vert)
  const paddingHorizontal = s(contentPadding); // Scaled padding (horiz)
  const nameSize = t(13.44); // 0.96em of textFontSize

  const narrationMargin = Math.floor(effectiveBlockSpacing * 1.2 + lineHeight * 6);

  const getSecretBg = (tabColor?: string) => {
    if (!tabColor) return isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)';
    try {
      // 💡 파일 최상단에 있는 변환기를 사용해 정확한 rgba(%) 값으로 바꿔줍니다!
      const { r, g, b } = hexToRgbValues(tabColor);
      // 다크모드 15%(0.15), 화이트모드 10%(0.10) (미리보기 화면과 완벽하게 동일한 비율)
      return isDark ? `rgba(${r}, ${g}, ${b}, 0.15)` : `rgba(${r}, ${g}, ${b}, 0.10)`;
    } catch (e) {
      // 만약 색상 코드 형태가 특이해서 에러가 날 경우를 대비한 정확한 16진수 값 (26=15%, 1a=10%)
      return isDark ? `${tabColor}26` : `${tabColor}1a`;
    }
  };

  const fontData = fonts.find(f => f.name === fontFamily);
  const fontImport = fontData?.import || '';

  const isFilterEnabled = filterBarMode !== 'none';
  const getFilterAttrs = (logEntry: LogEntry, forceClass: string = '') => {
    if (!isFilterEnabled) {
      return forceClass ? ` class="${forceClass}"` : '';
    }
    const isMainTab = (tabSettings[logEntry.tabId]?.format || 'main') === 'main';
    const isNarrationCharacterTag = logEntry.charId === narrationCharacter;
    const isCommandFlag = logEntry.isCommand;

    let attrs = ` d-t="${shortenId(logEntry.tabId)}" d-c="${shortenId(logEntry.charId)}"`;
    if (isMainTab) attrs += ' d-mt="1"';
    if (isNarrationCharacterTag) attrs += ' d-nc="1"';
    if (isCommandFlag) attrs += ' d-cm="1"';

    const classes = ['c-e', forceClass].filter(Boolean).join(' ');
    attrs += ` class="${classes}"`;
    return attrs;
  };

  const activeTabs = new Map<string, { id: string, name: string }>();
  const activeChars = new Map<string, { id: string, name: string, color: string }>();

  if (isFilterEnabled) {
    filteredLogs.forEach(log => {
      // Find actual character settings color if available
      const charColor = charSettings[log.charId]?.color || log.color;
      activeTabs.set(log.tabId, { id: log.tabId, name: log.tab });
      activeChars.set(log.charId, { id: log.charId, name: log.name, color: charColor });
    });
  }

  let filterBarHtml = '';
  let filterBarCSS = '';
  let filterBarScript = '';

  if (filterBarMode !== 'none') {
    const tabBtns = Array.from(activeTabs.values()).map(t => 
      `<label class="i"><input type="checkbox" checked value="${shortenId(t.id)}" class="f-t"><span class="c"></span>${t.name}</label>`
    ).join('');
    
    let charsArray = Array.from(activeChars.values());
    if (narrationCharacter) {
      charsArray = [
        {
          id: '__NARRATION__',
          name: '나레이션',
          color: charSettings[narrationCharacter]?.color || '#000000'
        },
        ...charsArray
      ];
    }

    const charBtns = charsArray.map(c => 
      `<label class="i"><input type="checkbox" checked value="${shortenId(c.id)}" class="f-c"><span class="c"></span>${c.name}</label>`
    ).join('');

    const isFixed = filterBarMode === 'fixed';

    let filterMenuStyles = '';
    if (isFixed) {
      filterMenuStyles = `
        #f-menu {
          background: ${bgColor}; 
          border-bottom: 1px solid ${borderColor}; 
          padding: 15px 20px; 
          margin: 0 auto 20px auto;
          max-width: 800px;
          width: 100%;
        }
        #f-menu .g { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 10px; }
        #f-menu .g:last-child { margin-bottom: 0; }
        #f-menu .t { font-size: 9px; font-weight: bold; color: ${isDark ? '#555' : '#888'}; letter-spacing: 1.2px; text-transform: uppercase; margin-right: 5px; margin-bottom: 0; display: block; }
        #f-menu .all { width: auto; border: none; padding-bottom: 0; margin-bottom: 0; padding-right: 10px; border-right: 1px solid ${borderColor}; display: inline-flex !important; }
        #f-menu .i { display: inline-flex !important; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: ${isDark ? '#999' : '#666'}; }
      `;
    } else {
      filterMenuStyles = `
        #f-btn {
          position: fixed !important; top: 20px; right: 20px;
          width: 40px; height: 40px; background: ${isDark ? '#1a1a1a' : '#f5f5f5'}; 
          border: 1.5px solid ${borderColor}; border-radius: 6px;
          cursor: pointer; z-index: 1000001;
          display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 4px;
        }
        #f-btn span { display: block; width: 20px; height: 1.5px; background: ${isDark ? '#888' : '#666'}; }
        #f-menu {
          position: fixed !important; top: 65px; right: 20px;
          width: 180px; max-height: 70vh; 
          background: ${isDark ? 'rgba(30, 30, 30, 0.98)' : 'rgba(255, 255, 255, 0.98)'}; border: 1px solid ${borderColor}; 
          border-radius: 6px; padding: 15px; 
          display: none; overflow-y: auto; z-index: 1000000;
          box-shadow: -5px 5px 25px rgba(0,0,0,0.5);
        }
        #f-menu::-webkit-scrollbar { width: 4px; }
        #f-menu::-webkit-scrollbar-thumb { background: ${borderColor}; border-radius: 10px; }
        #f-menu .g { margin-bottom: 20px; }
        #f-menu .t { font-size: 9px; font-weight: bold; color: ${isDark ? '#555' : '#888'}; letter-spacing: 1.2px; margin-bottom: 10px; display: block; text-transform: uppercase; }
        #f-menu .i { display: flex !important; align-items: flex-start; gap: 10px; padding: 5px 0; cursor: pointer; font-size: 12px; color: ${isDark ? '#999' : '#666'}; }
        #f-menu .all { font-weight: bold; color: ${textColor}; border-bottom: 1px solid ${borderColor}; padding-bottom: 8px; width: 100%; margin-bottom: 6px; }
      `;
    }

    filterBarCSS = `
      #filter-root { position: relative; z-index: 1000000; font-family: inherit; }
      #filter-root * { box-sizing: border-box; }
      ${filterMenuStyles}
      #f-menu .i input { display: none; }
      #f-menu .c { width: 12px; height: 12px; border: 1px solid ${borderColor}; border-radius: 2px; background: ${isDark ? '#111' : '#eee'}; flex-shrink: 0; margin-top: ${isFixed ? '0' : '3px'}; position: relative; }
      #f-menu .i input:checked + .c { background: #aaa; border-color: #aaa; }
      #f-menu .i input:checked + .c::after {
        content: ''; position: absolute; left: 3px; top: 1px; width: 3px; height: 6px;
        border: solid ${isDark ? '#111' : '#fff'}; border-width: 0 1.5px 1.5px 0; transform: rotate(45deg);
      }
      #f-menu .i:hover { color: ${textColor}; }
      #f-menu .i:has(input:not(:checked)) { opacity: 0.55; text-decoration: line-through; color: ${isDark ? '#888' : '#aaa'}; }
    `;

    filterBarHtml = `
      <div id="filter-root">
        ${!isFixed ? `<div id="f-btn"><span></span><span></span><span></span></div>` : ''}
        <div id="f-menu">
          <div class="g">
            <span class="t">TABS</span>
            <label class="i all"><input type="checkbox" checked id="aT"><span class="c"></span>All</label>
            ${tabBtns}
          </div>
          <div class="g" style="margin-bottom: 0;">
            <span class="t">CHARS</span>
            <label class="i all"><input type="checkbox" checked id="aC"><span class="c"></span>All</label>
            ${charBtns}
          </div>
        </div>
      </div>
    `;

    filterBarScript = `
      <script>
        document.addEventListener('DOMContentLoaded', () => {
          const qs = s => Array.from(document.querySelectorAll(s)), id = i => document.getElementById(i);
          const tC = qs('input.f-t'), cC = qs('input.f-c');
          const aT = id('aT'), aC = id('aC'), items = qs('.c-e');
          
          ${!isFixed ? `
          const b = id('f-btn'), m = id('f-menu');
          document.body.appendChild(b); document.body.appendChild(m);
          b.onclick = (e) => { e.stopPropagation(); m.style.display = (m.style.display === 'block') ? 'none' : 'block'; };
          document.addEventListener('click', (e) => { if (!m.contains(e.target) && e.target !== b) m.style.display = 'none'; });
          ` : ''}
          
          const update = () => {
            const hTbs = new Set(tC.filter(c => !c.checked).map(c => c.value));
            const hChs = new Set(cC.filter(c => !c.checked).map(c => c.value));
            
            items.forEach(i => {
              const t = i.getAttribute('d-t');
              const c = i.getAttribute('d-c');
              const mt = i.getAttribute('d-mt');
              const nc = i.getAttribute('d-nc');
              
              if (t && hTbs.has(t)) {
                i.style.display = 'none';
                return;
              }

              if (c) {
                if (nc === '1' && mt === '1') {
                  if (hChs.has('cn')) {
                    i.style.display = 'none';
                    return;
                  }
                } else {
                  if (hChs.has(c)) {
                    i.style.display = 'none';
                    return;
                  }
                }
              }

              i.style.display = '';
            });
            aT.checked = tC.every(c => c.checked);
            aC.checked = cC.every(c => c.checked);
          };

          [...tC, ...cC].forEach(c => {
            const h = e => {
              if (e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                const group = c.classList.contains('f-t') ? tC : cC;
                setTimeout(() => {
                  const isSolo = group.every(x => x === c ? x.checked : !x.checked);
                  if (isSolo) {
                    group.forEach(x => x.checked = true);
                  } else {
                    group.forEach(x => x.checked = false);
                    c.checked = true;
                  }
                  update();
                }, 0);
              }
            };
            c.parentElement.addEventListener('click', h);
            c.addEventListener('click', h);
            c.addEventListener('change', update);
          });
          
          aT.addEventListener('change', e => { tC.forEach(c => c.checked = e.target.checked); update(); });
          aC.addEventListener('change', e => { cC.forEach(c => c.checked = e.target.checked); update(); });
        });
      </script>
    `;
  }

  const textResetCSS = `
    .c-ct :is(p, span, a, b, strong, i, em, h1, h2, h3, h4, h5, h6, .m-c, .o-c, .m-nm, .o-nm, .n-r, .n-sr, .c-tx) {
      background-color: transparent !important;
    }
    .s-p { margin-top: 4px; }
    .s-p-nr { margin-top: 10px; }
    .s-p-ob { margin-top: 0.8em; }
  `;

  const activeCharColors = new Map<string, string>();
  filteredLogs.forEach(log => {
    const cid = shortenId(log.charId);
    if (cid) {
      const charColor = charSettings[log.charId]?.color || log.color;
      if (charColor) {
        activeCharColors.set(cid, charColor);
      }
    }
  });

  const dynamicColorsCss = Array.from(activeCharColors.entries())
    .map(([cid, color]) => `.${cid} { color: ${color} !important; }`)
    .join('\n');

  let computedNameWidth = 120;
  if (hideAllAvatars && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const fw = fontValue || 'sans-serif';
      const nameSizePixel = textFontSize * 0.96;
      ctx.font = `bold ${nameSizePixel}px ${fw}`;
      let mw = 0;
      for (const log of filteredLogs) {
        if (log.charId !== narrationCharacter && !log.isContinuation) {
          const w = ctx.measureText(log.name + ':').width;
          if (w > mw) mw = w;
        }
      }
      computedNameWidth = Math.min(Math.max(48, Math.ceil(mw + 8)), 120);
    }
  }

  const css = `
    ${fontImport}
    ${filterBarCSS}
    ${textResetCSS}
    ${dynamicColorsCss}
    .c-mc { background-color: ${bgColor}; margin: 0; padding: 0; }
    .c-ct * { box-sizing: border-box; min-width: 0; }
    .c-ct { 
      width: 100%; max-width: 800px; margin: 0 auto; 
      display: flex; flex-direction: column;
      ${fontFamily !== '(폰트 적용X)' ? `font-family: ${fontValue};` : ''}
      background: ${bgColor}; color: ${textColor};
      padding: 20px 0;
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      letter-spacing: ${letterSpacing === 0 ? 'normal' : `${letterSpacing}px`};
      overflow-x: hidden;
    }
    
    .c-i { position: relative; }
    .c-i.c-mb0 { margin-bottom: 0 !important; }
    .c-i.c-mt0 { margin-top: 0 !important; }
    .c-i.c-mb-n { margin-bottom: ${Math.ceil(effectiveBlockSpacing / 2)}px !important; }
    .c-i.c-mt-n { margin-top: ${Math.floor(effectiveBlockSpacing / 2)}px !important; }
    .c-i.c-mb-nr { margin-bottom: ${Math.ceil(narrationMargin / 2)}px !important; }
    .c-i.c-mt-nr { margin-top: ${Math.floor(narrationMargin / 2)}px !important; }
    .c-i.c-mb-c { margin-bottom: ${effectiveBlockSpacing}px !important; }
    .c-i div:not(.c-dv) { margin-bottom: 0 !important; }
    .c-mt-f { margin-top: 0 !important; }
    .c-mt-f .s-r, .c-mt-f .i-r, .c-mt-f .c-bx { margin-top: 0 !important; }

    .t-bl { margin: ${s(12)}px ${paddingHorizontal}px ${s(8)}px; display: flex; }
    .t-bd { display: inline-block; white-space: nowrap; padding: 2px 10px; border-radius: 4px; font-size: 0.74em; font-weight: bold; }

    .m-r, .s-r, .c-bx, .n-r { padding: ${paddingVertical}px ${paddingHorizontal}px; }
    .m-r, .s-r { display: flex; gap: ${s(12)}px; align-items: flex-start; padding-top: ${paddingVertical}px; padding-bottom: ${paddingVertical}px; }
    .m-r.no-avatar-grid, .s-r.no-avatar-grid { display: flex; gap: 16px; align-items: flex-start; }
    .s-r { margin: ${s(4)}px ${paddingHorizontal}px; border-radius: 4px; }

    .m-aw { width: ${avatarSize}px; height: ${avatarSize}px; flex-shrink: 0; background-color: ${hideEmptyAvatars ? 'transparent' : avatarPlaceholder}; border-radius: 4px; overflow: hidden; }
    .m-a { 
      width: ${avatarSize}px; height: ${avatarSize}px; flex-shrink: 0; 
      background-color: ${hideEmptyAvatars ? 'transparent' : avatarPlaceholder}; border-radius: 4px; object-fit: cover; object-position: center top;
    }
    .m-b { flex-grow: 1; line-height: ${lineHeight}; }
    .m-nm { font-weight: bold; font-size: ${r(textFontSize * 0.96)}px; margin-bottom: ${Math.max(4, Math.ceil(textFontSize * (lineHeight >= 1.4 ? 0.3 : 0.5)))}px; display: block; }
    .no-avatar-grid .m-nm { width: ${computedNameWidth}px; flex-shrink: 0; margin-bottom: 0; text-align: right; }
    .no-avatar-grid .m-b { flex: 1; min-width: 0; }
    .m-c, .o-c { font-size: ${r(textFontSize)}px; white-space: pre-wrap; word-break: keep-all; overflow-wrap: break-word; }
    .m-c { color: ${textColor}; }

    .o-r { padding: ${s(4)}px ${paddingHorizontal}px; display: flex; gap: ${s(8)}px; align-items: baseline; }
    .o-nm { font-weight: bold; flex-shrink: 0; font-size: ${r(textFontSize * 0.96)}px; }
    .o-c { color: ${otherTextColor}; }

    .i-r { 
      padding: ${paddingVertical}px ${paddingHorizontal}px; background: ${infoBg};
      border-left: 7px solid ${borderColor}; margin: ${s(8)}px ${paddingHorizontal}px; border-radius: 4px;
    }
    
    .c-bx { 
      background: ${commandBg}; border: 1px solid ${borderColor}; 
      border-radius: 8px; margin: ${s(8)}px ${paddingHorizontal}px; 
      display: flex; align-items: center; flex-wrap: wrap;
    }
    .c-tx { font-family: 'NanumGothicCodingLigature', monospace; color: ${textColor}; font-weight: bold; line-height: 1.6; }

    .n-r { text-align: center; color: ${textColor}; line-height: ${lineHeight}; font-size: ${r(textFontSize)}px; font-weight: bold; font-style: italic; }
    .n-sr { text-align: center; color: ${textColor}; line-height: ${lineHeight}; font-size: ${r(textFontSize)}px; font-weight: bold; font-style: italic; padding: ${s(2)}px ${paddingHorizontal}px; margin-bottom: 0px; }

    .c-dv { display: flex; align-items: center; justify-content: stretch; pointer-events: none; margin-left: 0; margin-right: 0; padding-left: ${paddingHorizontal}px; padding-right: ${paddingHorizontal}px; }
    .c-dv-ib { margin-left: ${paddingHorizontal}px; margin-right: ${paddingHorizontal}px; padding-left: ${paddingHorizontal}px; padding-right: ${paddingHorizontal}px; }
    .c-dv-in { width: 100%; border-bottom: 1px solid; }
  `;

  const isInline = cssFormat === 'inline';
  let html = '';

  const firstVisible = mergedLogs.find(l => {
    const ts = tabSettings[l.tabId];
    const cs = charSettings[l.charId];
    return ts?.visible && (cs?.visible !== false);
  });
  const isStartExported = filteredLogs.length === 0 || filteredLogs[0] === firstVisible;

  // Extract images from blocks for the exporter
  const insertedImages: Record<string, any[]> = {};
  Object.entries(insertedBlocks || {}).forEach(([id, blocks]) => {
    blocks.forEach((b: any) => {
      if (b.type === 'image') {
        if (!insertedImages[id]) insertedImages[id] = [];
        insertedImages[id].push({ url: b.url, width: b.width, align: b.align });
      }
    });
  });

  if (isStartExported && insertedBlocks && insertedBlocks['__start__']) {
    insertedBlocks['__start__'].forEach((block: any) => {
      if (block.type === 'image') {
        const url = typeof block === 'string' ? block : block.url;
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:image/'))) return;
        
        const align = (typeof block === 'string' ? 'center' : block.align) || 'center';
        const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
        const width = typeof block === 'string' ? undefined : block.width;
        const widthStyle = width ? `width: ${width}px;` : 'max-width: 100%;';
        html += `<div class="c-e" style="${cleanStyle(`display: flex; justify-content: ${justify}; margin: 10px ${s(15.6)}px`)}">
          <img src="${url}" style="${cleanStyle(`${widthStyle} border-radius: 8px; display: block`)}" referrerPolicy="no-referrer" onerror="this.style.display='none'" />
        </div>`;
      }
    });
  }

  const finalLogsSequence: any[] = [];
  let prevLogForContinuation: any = null;

  (originalLogs || []).forEach((log, idx) => {
    if (log.isUnplaced) return; // Skip unplaced illustrations

    if (log.isIllustration) {
      let resolvedTabId = log.tabOverride;
      if (resolvedTabId === 'auto' || !resolvedTabId || !tabSettings[resolvedTabId]) {
        let prevTabId = null;
        for (let i = idx - 1; i >= 0; i--) {
          if (originalLogs[i] && !originalLogs[i].isIllustration) {
            const tabId = originalLogs[i].tabId;
            if (tabSettings[tabId] && tabSettings[tabId].visible !== false) {
              prevTabId = tabId;
              break;
            }
          }
        }
        if (prevTabId) {
          resolvedTabId = prevTabId;
        } else {
          let nextTabId = null;
          for (let i = idx + 1; i < originalLogs.length; i++) {
            if (originalLogs[i] && !originalLogs[i].isIllustration) {
              const tabId = originalLogs[i].tabId;
              if (tabSettings[tabId] && tabSettings[tabId].visible !== false) {
                nextTabId = tabId;
                break;
              }
            }
          }
          resolvedTabId = nextTabId || Object.keys(tabSettings)[0] || 'main';
        }
      }
      const isIllVisible = tabSettings[resolvedTabId]?.visible !== false;
      if (isIllVisible) {
        const illLogEntry: any = {
          id: log.id,
          color: '',
          tabId: resolvedTabId,
          tab: tabSettings[resolvedTabId]?.name || '',
          charId: 'system',
          name: '',
          content: log.content,
          isCommand: false,
          isContinuation: false,
          isHiddenContent: false,
          isIllustration: true,
          illustration: {
            id: log.id,
            url: log.content,
            tabOverride: log.tabOverride || 'auto',
            width: log.width,
            align: log.align || 'center'
          },
          sectionId: log.sectionId
        };
        finalLogsSequence.push(illLogEntry);
        prevLogForContinuation = illLogEntry;
      }
      return;
    }

    // Check if the log is in filteredLogs (visible based on tab/character filters)
    const isLogVisible = filteredLogs.some(f => f.id === log.id);
    const hasImage = insertedBlocks[log.id]?.some((b: any) => b.type === 'image');

    let mappedLog: any = null;
    if (isLogVisible) {
      mappedLog = { ...log, isHiddenContent: false };
    } else if (hasImage) {
      mappedLog = { ...log, isHiddenContent: true };
    }

    if (mappedLog) {
      const tabSet = tabSettings[mappedLog.tabId];
      const format = tabSet?.format || 'main';
      const stableId = mappedLog.id.startsWith('merged:') ? mappedLog.id.split(',').pop()! : mappedLog.id;
      const prevStableId = prevLogForContinuation && !prevLogForContinuation.isIllustration ? (prevLogForContinuation.id.startsWith('merged:') ? prevLogForContinuation.id.split(',').pop()! : prevLogForContinuation.id) : '';
      const prevHasBlock = prevLogForContinuation && !prevLogForContinuation.isIllustration && !!insertedBlocks[prevStableId]?.length;

      let isContinuation = false;
      if (prevLogForContinuation && !prevLogForContinuation.isIllustration) {
        const prevFormat = tabSettings[prevLogForContinuation.tabId]?.format || 'main';
        const isPrevHidden = prevLogForContinuation.isHiddenContent;
        if (!mappedLog.isHiddenContent && 
            !isPrevHidden &&
            mergeTabs.has(format) && 
            mergeTabs.has(prevFormat) &&
            prevLogForContinuation.name === mappedLog.name && 
            prevLogForContinuation.tab === mappedLog.tab && 
            !mappedLog.isCommand && 
            !prevLogForContinuation.isCommand &&
            !prevHasBlock) {
          isContinuation = true;
        }
      }

      const newLog = { ...mappedLog, isContinuation };
      finalLogsSequence.push(newLog);
      prevLogForContinuation = newLog;
    }

    // 삽화 처리 (레거시 지원)
    // 삽화 처리 (레거시 지원)
    if (illustrations && illustrations.length > 0) {
      const logIllustrations = illustrations.filter((ill: any) => ill.afterLogIndex === idx);
      logIllustrations.forEach((ill: any) => {
        let resolvedTabId = ill.tabOverride;
        if (resolvedTabId === 'auto' || !resolvedTabId || !tabSettings[resolvedTabId]) {
          // 직전 로그 블록 탐색 (afterLogIndex가 idx이므로, 직전 로그는 originalLogs[idx]가 됨)
          let prevTabId = null;
          for (let i = idx; i >= 0; i--) {
            if (originalLogs[i]) {
              prevTabId = originalLogs[i].tabId;
              break;
            }
          }
          if (prevTabId) {
            resolvedTabId = prevTabId;
          } else {
            // 직후 로그 블록 탐색 (가장 상단에 삽화가 들어간 예외 케이스)
            let nextTabId = null;
            for (let i = idx + 1; i < originalLogs.length; i++) {
              if (originalLogs[i]) {
                nextTabId = originalLogs[i].tabId;
                break;
              }
            }
            resolvedTabId = nextTabId || Object.keys(tabSettings)[0] || 'main';
          }
        }
        const isIllVisible = tabSettings[resolvedTabId]?.visible !== false;
        if (isIllVisible) {
          const illLogEntry: any = {
            id: `illustration:${ill.id}`,
            color: '',
            tabId: resolvedTabId,
            tab: tabSettings[resolvedTabId]?.name || '',
            charId: 'system',
            name: '',
            content: ill.url,
            isCommand: false,
            isContinuation: false,
            isHiddenContent: false,
            isIllustration: true,
            illustration: { ...ill, tabOverride: resolvedTabId },
            sectionId: log.sectionId
          };
          finalLogsSequence.push(illLogEntry);
          prevLogForContinuation = illLogEntry;
        }
      });
    }
  });

  const chunks: { logs: any[], stableId: string, blocksAfter: any[], isHidden: boolean }[] = [];
  
  const isValidUrl = (url: string) => {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/');
  };

  finalLogsSequence.forEach((log) => {
    const stableId = log.id.startsWith('merged:') ? log.id.split(',').pop()! : log.id;
    const currentBlocks = (insertedBlocks[stableId] || []).filter(b => b.type === 'split' || (b.type === 'image' && isValidUrl(b.url)));
    
    if (log.isContinuation && chunks.length > 0 && !log.isHiddenContent) {
      chunks[chunks.length - 1].logs.push(log);
      chunks[chunks.length - 1].stableId = stableId;
      chunks[chunks.length - 1].blocksAfter = currentBlocks;
    } else {
      chunks.push({ logs: [log], stableId, blocksAfter: currentBlocks, isHidden: log.isHiddenContent || false });
    }
  });

  const getHasDividerBetween = (chunkA: any, chunkB: any) => {
    if (!showLogDivider) return false;
    if (!chunkA || !chunkB) return false;
    const logA = chunkA.logs[0];
    const logB = chunkB.logs[0];

    // 만약 전체 내보내기이고, 두 로그의 섹션 ID가 서로 다르다면 무조건 구분선 적용
    if (isFullExport && logA.sectionId && logB.sectionId && logA.sectionId !== logB.sectionId) {
      return true;
    }

    const getFormatOf = (l: any) => {
      if (l.isIllustration) {
        const ill = l.illustration || { tabOverride: l.tabOverride || 'auto' };
        const resolvedTabOverride = ill.tabOverride === 'auto' || !ill.tabOverride ? (l.tabId || 'main') : ill.tabOverride;
        const illTabSet = tabSettings[resolvedTabOverride] || tabSettings['main'];
        return illTabSet?.format || 'main';
      }
      const tabSet = tabSettings[l.tabId];
      const formatVal = tabSet?.format || 'main';
      if (l.charId === narrationCharacter && formatVal === 'main') {
        return 'narration';
      }
      return formatVal;
    };

    const formatA = getFormatOf(logA);
    const formatB = getFormatOf(logB);

    const isISA = formatA === 'info' || formatA === 'secret';
    const isISB = formatB === 'info' || formatB === 'secret';
    const isTabNameAndMergeA = isISA && showTabNames.has(formatA) && mergeTabStyles.has(formatA);
    const isTabNameAndMergeB = isISB && showTabNames.has(formatB) && mergeTabStyles.has(formatB);

    // [강제 규칙] 정보/비밀 탭이고 '탭 이름 표시' & '탭별 통합'이 활성화되었을 때, 탭 묶음의 상/하단에는 무조건 구분선 적용
    if (isTabNameAndMergeA && (logA.tabId !== logB.tabId || !isISB)) {
      return true;
    }
    if (isTabNameAndMergeB && (logA.tabId !== logB.tabId || !isISA)) {
      return true;
    }

    // 우선순위 1위: 발언자별 통합 (연속되는 대사 사이사이에는 구분선이 들어가지 않음)
    if (logB.isContinuation) {
      return false;
    }
    
    // 우선순위 2위: 다이스 및 매크로 (구분선 규칙 유지 - 다이스/매크로도 기본 로그블록 구분선 규칙 따름)

    // 우선순위 3위: 정보 및 비밀탭
    if (isISA || isISB) {
      if (isISA && isISB) {
        if (logA.tabId === logB.tabId) {
          // 같은 탭이면 '탭별 통합'이 활성화되어 있을 때만 구분선이 있음
          return mergeTabStyles.has(formatA);
        } else {
          // 다른 탭인 경우, '탭별 통합'이 활성화되어 있거나 '탭 이름 표시'가 활성화되어 있으면 구분선이 있음
          if (mergeTabStyles.has(formatA) || mergeTabStyles.has(formatB)) {
            return true;
          }
          return showTabNames.has(formatB);
        }
      } else if (!isISA && isISB) {
        // 가장 첫 정보/비밀 위: '탭 이름 표시'가 활성화되어 있다면 구분선이 있음
        return showTabNames.has(formatB);
      } else if (isISA && !isISB) {
        // 가장 마지막 정보/비밀 아래: 해당 비밀/정보탭의 '탭 이름 표시'가 활성화되어 있을 때만 구분선이 들어감
        return showTabNames.has(formatA);
      }
    } else {
      // 우선순위 4위: 잡담 탭 (잡담끼리는 하나로 취급해 사이사이에 구분선 없고, 첫 잡담 위와 마지막 잡담 아래에만 선이 있음)
      const isChatA = formatA === 'other';
      const isChatB = formatB === 'other';
      if (isChatA || isChatB) {
        if (isChatA && isChatB) {
          return false;
        }
        return true;
      } else {
        // 그 외 일반적인 경우 (기본)
        const isSameTab = logA.tab === logB.tab;
        const shouldMergeA = mergeTabStyles.has(formatA);
        if (shouldMergeA && isSameTab) {
          return false;
        }
        return true;
      }
    }
    return false;
  };

  const getHasSpecialDividerBetween = (chunkA: any, chunkB: any) => {
    if (!getHasDividerBetween(chunkA, chunkB)) return false;
    const logA = chunkA.logs[0];
    const logB = chunkB.logs[0];
    if (logA.tabId === logB.tabId) return false;

    const getFormatOf = (l: any) => {
      if (l.isIllustration) {
        const ill = l.illustration || { tabOverride: l.tabOverride || 'auto' };
        const resolvedTabOverride = ill.tabOverride === 'auto' || !ill.tabOverride ? (l.tabId || 'main') : ill.tabOverride;
        const illTabSet = tabSettings[resolvedTabOverride] || tabSettings['main'];
        return illTabSet?.format || 'main';
      }
      const tabSet = tabSettings[l.tabId];
      const formatVal = tabSet?.format || 'main';
      if (l.charId === narrationCharacter && formatVal === 'main') {
        return 'narration';
      }
      return formatVal;
    };

    const formatA = getFormatOf(logA);
    const formatB = getFormatOf(logB);

    const isISA = formatA === 'info' || formatA === 'secret' || formatA === 'other';
    const isISB = formatB === 'info' || formatB === 'secret' || formatB === 'other';

    return isISA || isISB;
  };

  chunks.forEach((chunk, chunkIdx) => {
    const log = chunk.logs[0];
    const { logs: groupedLogs, blocksAfter, isHidden, stableId } = chunk;

    const tabSet = tabSettings[log.tabId];
    const format = tabSet?.format || 'main';
    const char = charSettings[log.charId];
    const color = char?.color || log.color;
    const otherNameColor = disableOtherColor ? otherTextColor : color;
    const img = log.iconUrl || char?.imageUrl;
    const hideAvatar = hideEmptyAvatars;

    const prevChunk = chunkIdx > 0 ? chunks[chunkIdx - 1] : null;
    let nextVisibleChunkIdx = chunkIdx + 1;
    while (nextVisibleChunkIdx < chunks.length && chunks[nextVisibleChunkIdx].isHidden) {
      nextVisibleChunkIdx++;
    }
    const nextVisibleChunk = nextVisibleChunkIdx < chunks.length ? chunks[nextVisibleChunkIdx] : null;
    const isLastVisibleChunk = nextVisibleChunk === null;

    let prevVisibleChunkIdx = chunkIdx - 1;
    while (prevVisibleChunkIdx >= 0 && chunks[prevVisibleChunkIdx].isHidden) {
      prevVisibleChunkIdx--;
    }
    const prevVisibleChunk = prevVisibleChunkIdx >= 0 ? chunks[prevVisibleChunkIdx] : null;

    const isPrevSameTab = prevVisibleChunk ? prevVisibleChunk.logs[0].tab === log.tab : false;
    const isNextSameTab = nextVisibleChunk ? nextVisibleChunk.logs[0].tab === log.tab : false;
    
    const hasBlockAfter = blocksAfter.length > 0;
    const isFilterEnabled = filterBarMode !== 'none';
    const hasBlockBefore = prevChunk ? prevChunk.blocksAfter.length > 0 : false;
    
    const shouldMergeStyle = mergeTabStyles.has(format) && (isPrevSameTab || isNextSameTab);

    const isSectionEndOuter = !nextVisibleChunk || isNextSameTab === false || hasBlockAfter;
    const mergeWithNextOuter = shouldMergeStyle && isNextSameTab && !isSectionEndOuter;

    const isNarration = log.charId === narrationCharacter && format === 'main';
    const isPrevNarration = prevVisibleChunk ? (!hasBlockBefore && prevVisibleChunk.logs[0].charId === narrationCharacter && (tabSettings[prevVisibleChunk.logs[0].tabId]?.format || 'main') === 'main') : false;
    const isNextNarration = nextVisibleChunk ? (!hasBlockAfter && nextVisibleChunk.logs[0].charId === narrationCharacter && (tabSettings[nextVisibleChunk.logs[0].tabId]?.format || 'main') === 'main') : false;

    // Calculate divider presence and visual properties early
    const hasDividerBelow = nextVisibleChunk ? getHasDividerBetween(chunk, nextVisibleChunk) : false;
    const hasDividerAbove = prevVisibleChunk ? getHasDividerBetween(prevVisibleChunk, chunk) : false;

    const hasSpecialDividerBelow = nextVisibleChunk ? getHasSpecialDividerBetween(chunk, nextVisibleChunk) : false;
    const hasSpecialDividerAbove = prevVisibleChunk ? getHasSpecialDividerBetween(prevVisibleChunk, chunk) : false;

    const prevLogObj = prevVisibleChunk ? prevVisibleChunk.logs[0] : null;
    let prevFormat = null;
    if (prevLogObj) {
      if (prevLogObj.isCommand) {
        prevFormat = 'command';
      } else {
        const tabSetVal = tabSettings[prevLogObj.tabId];
        const formatVal = tabSetVal?.format || 'main';
        if (prevLogObj.charId === narrationCharacter && formatVal === 'main') {
          prevFormat = 'narration';
        } else {
          prevFormat = formatVal;
        }
      }
    }
    const isSectionStartOuter = !prevVisibleChunk || isPrevSameTab === false || hasBlockBefore;
    const mergeWithPrevOuter = log.isContinuation || (shouldMergeStyle && isPrevSameTab && !isSectionStartOuter);

    const nextLogObj = nextVisibleChunk ? nextVisibleChunk.logs[0] : null;
    let nextFormat = null;
    if (nextLogObj) {
      if (nextLogObj.isCommand) {
        nextFormat = 'command';
      } else {
        const tabSetVal = tabSettings[nextLogObj.tabId];
        const formatVal = tabSetVal?.format || 'main';
        if (nextLogObj.charId === narrationCharacter && formatVal === 'main') {
          nextFormat = 'narration';
        } else {
          nextFormat = formatVal;
        }
      }
    }

    if (log.isIllustration) {
      if (!isHidden) {
        const ill = log.illustration;
        const illTabSet = tabSettings[ill.tabOverride];
        const illFormat = illTabSet?.format || 'main';
        const illIsSecret = illFormat === 'secret';
        const illTabColor = illTabSet?.color || '#ffd400';

        const align = ill.align || 'center';
        const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
        const widthVal = ill.width ? `width: ${ill.width}px;` : 'max-width: 100%;';

        // 1. Render Tab Name Badge if showTabNames has this format and isFirstInSection
        if (showTabNames.has(illFormat) && !isPrevSameTab) {
          const tabName = illTabSet?.name || 'Unknown';
          const tabBg = getSecretBg(illTabColor);
          const isMainTab = illFormat === 'main' ? 'true' : 'false';

          if (isInline) {
            const fAttrs = isFilterEnabled ? ` d-t="${shortenId(ill.tabOverride)}"${isMainTab === 'true' ? ' d-mt="1"' : ''} class="c-e"` : '';
            const tabMarginTop = hasSpecialDividerAbove ? '0' : `${s(12)}px`;
            const outerStyle = `margin: ${tabMarginTop} ${paddingHorizontal}px ${s(8)}px ${paddingHorizontal}px; display: flex;`;
            const badgeStyle = `background: ${tabBg}; color: ${illTabColor}; padding: 2px 10px; border-radius: 4px; font-size: 0.74em; font-weight: bold; border: 1px solid ${illTabColor}44; display: inline-block; white-space: nowrap;`;
            html += `<div${fAttrs} style="${cleanStyle(outerStyle)}">
              <div style="${cleanStyle(badgeStyle)}">
                ${tabName}
              </div>
            </div>`;
          } else {
            const fAttrs = isFilterEnabled ? ` d-t="${shortenId(ill.tabOverride)}"${isMainTab === 'true' ? ' d-mt="1"' : ''} class="t-bl c-e"` : ` class="t-bl"`;
            const badgeStyle = hasSpecialDividerAbove ? ' style="margin-top: 0 !important;"' : '';
            html += `<div${fAttrs}${badgeStyle}>
              <div class="t-bd" style="background: ${tabBg}; color: ${illTabColor}; border: 1px solid ${illTabColor}44;">
                ${tabName}
              </div>
            </div>`;
          }
        }

        // 2. Render the actual Illustration Container based on Format (info, secret, main/other)
        const fAttrs = isFilterEnabled ? ` d-t="${shortenId(ill.tabOverride)}" class="c-e"` : ' class="c-e"';

        if (isInline) {
          let wrapperStyle = '';
          if (illFormat === 'info') {
            wrapperStyle = `padding:${paddingVertical}px ${paddingHorizontal}px;background:${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'};border-left:7px solid ${isDark ? '#444' : '#DDD'};margin:4px ${paddingHorizontal}px;border-radius:4px;display:flex;justify-content:${justify};`;
          } else if (illFormat === 'secret') {
            wrapperStyle = `padding:${paddingVertical}px ${paddingHorizontal}px;background:${getSecretBg(illTabColor)};border-left:7px solid ${illTabColor};margin:4px ${paddingHorizontal}px;border-radius:4px;display:flex;justify-content:${justify};`;
          } else {
            wrapperStyle = `margin:4px ${paddingHorizontal}px;display:flex;justify-content:${justify};`;
          }

          html += `<div${fAttrs} style="${cleanStyle(wrapperStyle)}">
            <img src="${ill.url}" style="${cleanStyle(`${widthVal}border-radius:8px;display:block`)}" referrerPolicy="no-referrer" onerror="this.style.display='none'" />
          </div>`;
        } else {
          if (illFormat === 'info') {
            const wrapperStyle = `margin: 4px ${paddingHorizontal}px; display: flex; justify-content: ${justify};`;
            html += `<div${fAttrs} class="i-r" style="${cleanStyle(wrapperStyle)}">
              <img src="${ill.url}" style="${cleanStyle(`${widthVal}border-radius:8px;display:block`)}" referrerPolicy="no-referrer" onerror="this.style.display='none'" />
            </div>`;
          } else if (illFormat === 'secret') {
            const secretBg = getSecretBg(illTabColor);
            const wrapperStyle = `background: ${secretBg}; border-left: 7px solid ${illTabColor}; margin: 4px ${paddingHorizontal}px; border-radius: 4px; display: flex; justify-content: ${justify};`;
            html += `<div${fAttrs} class="s-r" style="${cleanStyle(wrapperStyle)}">
              <img src="${ill.url}" style="${cleanStyle(`${widthVal}border-radius:8px;display:block`)}" referrerPolicy="no-referrer" onerror="this.style.display='none'" />
            </div>`;
          } else {
            const wrapperStyle = `margin: 4px ${paddingHorizontal}px; display: flex; justify-content: ${justify};`;
            html += `<div${fAttrs} style="${cleanStyle(wrapperStyle)}">
              <img src="${ill.url}" style="${cleanStyle(`${widthVal}border-radius:8px;display:block`)}" referrerPolicy="no-referrer" onerror="this.style.display='none'" />
            </div>`;
          }
        }

        // Add Divider if needed
        if (hasDividerBelow) {
          if (isInline) {
            const dividerStyle = `margin:${s(12)}px ${((illFormat === 'info' || illFormat === 'secret') && mergeWithNextOuter) ? `${paddingHorizontal}px` : '0'};background:transparent;border:none;border-top:1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'};height:0;`;
            html += `<hr style="${cleanStyle(dividerStyle)}" class="c-e" />`;
          } else {
            html += `<div class="d-v c-e"></div>`;
          }
        }
      }

      return; // End chunk loop for illustration
    }

    let dividerHtml = '';
    if (hasDividerBelow) {
      const isMainTab = format === 'main' ? 'true' : 'false';
      const isNarrationCharacterTag = log.charId === narrationCharacter ? 'true' : 'false';
      const isCommandFlag = log.isCommand ? 'true' : 'false';
      
      let divAttrs = '';
      if (isFilterEnabled) {
        divAttrs = ` d-t="${shortenId(log.tabId)}" d-c="${shortenId(log.charId)}"`;
        if (isMainTab === 'true') divAttrs += ' d-mt="1"';
        if (isNarrationCharacterTag === 'true') divAttrs += ' d-nc="1"';
        if (isCommandFlag === 'true') divAttrs += ' d-cm="1"';
        divAttrs += ' class="c-e c-dv"';
      } else {
        divAttrs = ' class="c-dv"';
      }

      const borderStyleColor = isDark 
        ? `rgba(255, 255, 255, 0.08)` 
        : `rgba(0, 0, 0, 0.1)`;
      
      const isInternalBoxDivider = (format === 'info' || format === 'secret') && mergeWithNextOuter;
      const tabColor = tabSet?.color || '#ffd400';
      
      let nextShouldShowIndex = false;
      if (nextLogObj && nextFormat) {
        const isSameTab = log.tabId === nextLogObj.tabId;
        nextShouldShowIndex = showTabNames.has(nextFormat) && (!isSameTab || hasBlockAfter);
      }

      let marginTopVal = hasSpecialDividerBelow ? 12 : 0;
      let marginBottomVal = hasSpecialDividerBelow ? 12 : 0;

      if (hasSpecialDividerBelow) {
        if (format === 'main') {
          marginTopVal = 0;
        }
        if (nextFormat === 'main') {
          if (nextShouldShowIndex) {
            marginBottomVal = 12;
          } else {
            marginBottomVal = 0;
          }
        }
      }
      
      let styleStr = `margin-top:${s(marginTopVal)}px;margin-bottom:${s(marginBottomVal)}px;`;
      if (isInline) {
        styleStr += `display:flex;align-items:center;justify-content:stretch;pointer-events:none;`;
        if (isInternalBoxDivider) {
          styleStr += `margin-left:${paddingHorizontal}px;margin-right:${paddingHorizontal}px;padding-left:${paddingHorizontal}px;padding-right:${paddingHorizontal}px;`;
        } else {
          styleStr += `margin-left:0;margin-right:0;padding-left:${paddingHorizontal}px;padding-right:${paddingHorizontal}px;`;
        }
      }
      if (isInternalBoxDivider) {
        const bg = format === 'secret' ? getSecretBg(tabColor) : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)');
        const bLeft = format === 'secret' ? `4px solid ${tabColor}` : `4px solid ${isDark ? '#444' : '#DDD'}`;
        styleStr += `background:${bg};border-left:${bLeft};`;
        if (isFilterEnabled) {
          divAttrs = divAttrs.replace('class="c-e c-dv"', 'class="c-e c-dv c-dv-ib"');
        } else {
          divAttrs = ' class="c-dv c-dv-ib"';
        }
      }

      const dividerInStyle = isInline ? `width:100%;border-bottom:1px solid;border-color:${borderStyleColor};` : `border-color:${borderStyleColor};`;
      dividerHtml = `<div${divAttrs} style="${cleanStyle(styleStr)}"><div class="c-dv-in" style="${cleanStyle(dividerInStyle)}"></div></div>`;
    }

    // Generate blocksAfterHtml early
    let blocksAfterHtml = '';
    if (blocksAfter && blocksAfter.length > 0) {
      blocksAfter.forEach((block: any) => {
        if (block.type === 'image' && isValidUrl(block.url)) {
          const align = block.align || 'center';
          const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
          const widthStyle = block.width ? `width:${block.width}px;` : 'max-width:100%;';
          const isMainTab = format === 'main';
          const imgAttrs = isFilterEnabled 
            ? ` d-t="${shortenId(log.tabId)}" d-c="${shortenId(log.charId)}"${isMainTab ? ' d-mt="1"' : ''} class="c-e"`
            : '';
          blocksAfterHtml += `<div${imgAttrs} style="${cleanStyle(`display:flex;justify-content:${justify};margin:10px ${s(15.6)}px`)}">
            <img src="${block.url}" style="${cleanStyle(`${widthStyle}border-radius:8px;display:block`)}" referrerPolicy="no-referrer" onerror="this.style.display='none'" />
          </div>`;
        }
      });
    }

    // Combine all contents in this chunk
    let finalHtmlContentPieces = groupedLogs.map((l, i) => {
      let content = l.content;
      if (l.isCommand) {
        content = content.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/(?:\r\n|\r|\n)+/g, ' ');
      }
      
      let textPieces = [content];
      if (isNarration && enableSentenceSpacing) {
        textPieces = splitNarration(content);
      }
      
      let htmlPieces = textPieces.map(piece => {
        let pieceHtml = linkifyAndFormat(piece);
        if (l.name === 'system') {
          pieceHtml = pieceHtml.replace(/\[\s*(.*?)\s*\]/g, (match: string, p1: string) => {
            const charIds = Object.keys(charSettings).filter(id => charSettings[id].name === p1.trim());
            const matchedChar = charIds.length > 0 ? charSettings[charIds[0]] : null;
            return matchedChar ? `<span style="color: ${matchedChar.color};">${match}</span>` : match;
          });
        }
        let sanitizeFn = (DOMPurify && DOMPurify.sanitize) ? DOMPurify.sanitize.bind(DOMPurify) : (global as any).DOMPurify?.sanitize;
        return sanitizeFn ? sanitizeFn(pieceHtml, { ADD_ATTR: ['target'] }) : pieceHtml;
      });
      return htmlPieces;
    });

    const spacingClass = isNarration ? 's-p-nr' : (format === 'other' ? 's-p' : 's-p-ob');
    let finalHtmlContent = finalHtmlContentPieces.map(pieces => pieces.join(`<div class="${spacingClass}"></div>`)).join(`<div class="${spacingClass}"></div>`);

    if (!isHidden) {
      const hasSpecialDividerAboveAndNoBadge = hasSpecialDividerAbove && !(showTabNames.has(format) && !isPrevSameTab);
      if (showTabNames.has(format) && !isPrevSameTab) {
        const tabName = log.tab;
      const isSecret = format === 'secret';
      const tabColor = tabSet?.color || '#ffd400';
      const tabBg = getSecretBg(tabColor);
      
      const isMainTab = format === 'main' ? 'true' : 'false';
      if (isInline) {
        const fAttrs = isFilterEnabled ? ` d-t="${shortenId(log.tabId)}"${isMainTab === 'true' ? ' d-mt="1"' : ''} class="c-e"` : '';
        const tabMarginTop = hasSpecialDividerAbove ? '0' : `${s(12)}px`;
        const outerStyle = `margin: ${tabMarginTop} ${paddingHorizontal}px ${s(8)}px ${paddingHorizontal}px; display: flex;`;
        const badgeStyle = `background: ${tabBg}; color: ${tabColor}; padding: 2px 10px; border-radius: 4px; font-size: 0.74em; font-weight: bold; border: 1px solid ${tabColor}44; display: inline-block; white-space: nowrap;`;
        html += `<div${fAttrs} style="${cleanStyle(outerStyle)}">
          <div style="${cleanStyle(badgeStyle)}">
            ${tabName}
          </div>
        </div>`;
      } else {
        const fAttrs = isFilterEnabled ? ` d-t="${shortenId(log.tabId)}"${isMainTab === 'true' ? ' d-mt="1"' : ''} class="t-bl c-e"` : ` class="t-bl"`;
        const badgeStyle = hasSpecialDividerAbove ? ' style="margin-top: 0 !important;"' : '';
        html += `<div${fAttrs}${badgeStyle}>
          <div class="t-bd" style="background: ${tabBg}; color: ${tabColor}; border: 1px solid ${tabColor}44;">
            ${tabName}
          </div>
        </div>`;
      }
    }

    let customImgStyle = '';
      if (img) {
        const charData = charSettings[log.charId];
        const crop = charData?.cropData;
        const excluded = charData?.excludedCropUrls || [];
        const isExcluded = excluded.includes(img);
        
        if (crop && !isExcluded) {
          // 크롭 영역이 지정되어 있을 때 (좌표 계산 정상화)
          const sX = 100 / crop.width;
          const sY = 100 / crop.height;
          customImgStyle = `width: ${sX * 100}%; height: ${sY * 100}%; object-fit: cover; transform: translate(-${crop.x}%, -${crop.y}%); transform-origin: top left;`;
        } else {
          // 크롭이 안 된 기본 상태
          customImgStyle = `width: 100%; height: 100%; object-fit: cover; object-position: center top;`;
        }
      
      }

      // 💡 2. 다이스 박스를 아예 없애고, 일반 대사처럼 텍스트 색상만 입히도록 공통 처리! (시스템 제외)
      if (log.isCommand && log.name !== 'system') {
        let chatColor = isDark ? 'inherit' : '#333333';
        const contentStr = log.content;
        if (contentStr.includes('대성공')) chatColor = '#ffbf00';
        else if (contentStr.includes('극단적 성공') || contentStr.includes('대단한 성공')) chatColor = '#fc7300';
        else if (contentStr.includes('어려운 성공')) chatColor = '#00d617';
        else if (contentStr.includes('보통 성공')) chatColor = '#009af9';
        else if (contentStr.includes('＞ 실패')) chatColor = '#ff008f';
        else if (contentStr.includes('＞ 대실패')) chatColor = '#ff1000';
        
        finalHtmlContent = `<span style="color: ${chatColor}; font-weight: bold;">${finalHtmlContent}</span>`;
      }

      if (isInline) {
        const charClass = shortenId(log.charId);
        const awStyle = `width:${avatarSize}px;height:${avatarSize}px;flex-shrink:0;background-color:${hideAvatar ? 'transparent' : avatarPlaceholder};border-radius:4px;overflow:hidden;`;
        const bodyStyle = `flex:1;`;
        const nameStyle = `font-size:0.96em;margin-bottom:${Math.max(4, Math.ceil(textFontSize * (lineHeight >= 1.4 ? 0.3 : 0.5)))}px;display:block;`;
        const contentStyle = `white-space:pre-wrap;word-break:break-all;`;
        const otherContentStyle = `color:${otherTextColor};white-space:pre-wrap;word-break:break-all;`;
        
        const isSectionStart = chunkIdx === 0 || hasBlockBefore;
        const mergeWithPrev = shouldMergeStyle && isPrevSameTab && !isSectionStart;
        const isSectionEnd = isNextSameTab === false || hasBlockAfter;
        const mergeWithNext = shouldMergeStyle && isNextSameTab && !isSectionEnd;

        let itemMarginTop = '0';
        let itemMarginBottom = '0';

        // 다이스도 일반 대사 여백을 따르도록 조건 변경
        if ((log.isCommand && log.name === 'system') || format === 'secret') {
          itemMarginBottom = mergeWithNext ? '0' : `${effectiveBlockSpacing}px`;
        } else if (isNarration) {
          itemMarginTop = isPrevNarration && !hasBlockBefore ? '0' : `${Math.floor(narrationMargin / 2)}px`;
          itemMarginBottom = isNextNarration && !hasBlockAfter ? '0' : `${Math.ceil(narrationMargin / 2)}px`;
        } else {
          itemMarginTop = mergeWithPrev ? '0' : `${Math.floor(effectiveBlockSpacing / 2)}px`;
          itemMarginBottom = mergeWithNext ? '0' : `${Math.ceil(effectiveBlockSpacing / 2)}px`;
        }

        if (format === 'other') {
          itemMarginBottom = '0';
          itemMarginTop = '0';
        }

        if (hasSpecialDividerAboveAndNoBadge) {
          itemMarginTop = '0';
        }

        const fullFilterAttrs = getFilterAttrs(log);
          
        if (isNarration) {
          const narrStyle = `padding:${isPrevNarration ? '0.4em' : `${paddingVertical}px`} ${paddingHorizontal}px ${isNextNarration ? '0.4em' : `${paddingVertical}px`} ${paddingHorizontal}px;text-align:center;`;
          html += `<div${fullFilterAttrs} style="position:relative;margin-bottom:${itemMarginBottom};margin-top:${itemMarginTop};">`;
          html += `<div style="${cleanStyle(narrStyle)}">`;
          const flatPieces = finalHtmlContentPieces.flat();
          html += flatPieces.map((piece, pIdx) => {
            const prefix = pIdx > 0 ? `<div class="s-p-ob"></div>` : '';
            return `${prefix}<div style="white-space:pre-wrap;word-break:break-all;"><b><i>${piece}</i></b></div>`;
          }).join('');
          html += `</div>`;
          if (blocksAfterHtml) {
            html += blocksAfterHtml;
          }
          if (hasDividerBelow) {
            html += dividerHtml;
          }
          html += `</div>`;
        } else {
          html += `<div${fullFilterAttrs} style="position:relative;margin-bottom:${itemMarginBottom};margin-top:${itemMarginTop};">`;
          
          if (log.isCommand && log.name === 'system') {
            // 시스템 메시지 중앙 정렬 + 이탤릭 유지
            const narrStyle = `padding:${paddingVertical}px ${paddingHorizontal}px;text-align:center;font-style:italic;font-weight:bold;color:${textColor};`;
            html += `<div style="${cleanStyle(narrStyle)}">`;
            const flatPieces = finalHtmlContentPieces.flat();
            html += flatPieces.map((piece, pIdx) => {
              const prefix = pIdx > 0 ? `<div class="s-p-ob"></div>` : '';
              return `${prefix}<div style="white-space:pre-wrap;word-break:keep-all;overflow-wrap:break-word;">${piece}</div>`;
            }).join('');
            html += `</div>`;
          } else if (format === 'other') {
            const rowStyle = `padding:${s(2)}px ${paddingHorizontal}px;display:flex;gap:${gapSize / 1.5}px;align-items:baseline;`;
            html += `<div style="${cleanStyle(rowStyle)}">
              <b><span style="${cleanStyle(`flex-shrink:0;font-size:0.96em;color:${otherNameColor}`)}">${log.name}</span></b>
              <div style="${cleanStyle(otherContentStyle)}">${finalHtmlContent}</div>
            </div>`;
          } else if (format === 'info') {
            const infoMarginTop = hasSpecialDividerAboveAndNoBadge ? '0' : (mergeWithPrev ? '0' : '4px');
            const infoMarginBottomVal = mergeWithNext ? '0' : (hasSpecialDividerBelow ? '0' : '4px');
            const infoMargin = `${infoMarginTop} ${paddingHorizontal}px ${infoMarginBottomVal} ${paddingHorizontal}px`;
            const infoBorderTop = shouldMergeStyle && isPrevSameTab && !isSectionStart ? 'none' : '';
            const infoBorderBottom = shouldMergeStyle && isNextSameTab && !isSectionEnd ? 'none' : '';
            
            // 💡 인라인 방식 정보 탭: 모서리 강제 0
            const wrapperStyle = `padding:${paddingVertical}px ${paddingHorizontal}px;background:${infoBg};border-left:7px solid ${borderColor};margin:${infoMargin};border-radius:0;${infoBorderTop ? `border-top:${infoBorderTop};` : ''}${infoBorderBottom ? `border-bottom:${infoBorderBottom};` : ''}`;
            html += `<div style="${cleanStyle(wrapperStyle)}">
              <b><span class="${charClass}" style="${cleanStyle(nameStyle)}">${log.name}</span></b>
              <div style="${cleanStyle(contentStyle)}">${finalHtmlContent}</div>
            </div>`;
          } else if (format === 'secret') {
            const tabColor = tabSet?.color || '#ffd400';
            const secretBg = getSecretBg(tabColor);
            const imgTag = `<div style="${cleanStyle(awStyle)}">${img ? `<img src="${img}" style="${cleanStyle(customImgStyle)}" />` : ''}</div>`;
            
            // 💡 비밀 탭 내부 여백 및 테두리 완벽 제거 (항상 0으로 밀착!)
            const secretMargin = `0`;
            const secretBorderTop = 'none';
            const secretBorderBottom = 'none';
   
            const borderTopStyle = secretBorderTop ? `border-top:${secretBorderTop};` : '';
            const borderBottomStyle = secretBorderBottom ? `border-bottom:${secretBorderBottom};` : '';
   
            const wrapperStyle = `display:flex;gap:${gapSize}px;padding:${paddingVertical}px ${paddingHorizontal}px;align-items:flex-start;background:${secretBg};border-left:none;margin:${secretMargin};border-radius:0;${borderTopStyle}${borderBottomStyle}`;
            html += `
              <div style="${cleanStyle(wrapperStyle)}">
                ${imgTag}
                <div style="${cleanStyle(bodyStyle)}">
                  <b><span class="${charClass}" style="${cleanStyle(nameStyle)}">${log.name}</span></b>
                  <div style="${cleanStyle(contentStyle)}">${finalHtmlContent}</div>
                </div>
              </div>`;
          } else {
            // 이제 일반 탭을 쓰는 주사위 다이스 로그도 아바타가 있는 이 구문을 타게 됩니다!
            const avatarHtml = `<div style="${cleanStyle(awStyle)}">${img ? `<img src="${img}" style="${cleanStyle(customImgStyle)}" />` : ''}</div>`;
            
            const wrapperStyle = `display:flex;gap:${gapSize}px;padding:${paddingVertical}px ${paddingHorizontal}px;align-items:flex-start;`;
            html += `
              <div style="${cleanStyle(wrapperStyle)}">
                ${avatarHtml}
                <div style="${cleanStyle(bodyStyle)}">
                  <b><span class="${charClass}" style="${cleanStyle(nameStyle)}">${log.name}</span></b>
                  <div style="${cleanStyle(contentStyle)}">${finalHtmlContent}</div>
                </div>
              </div>`;
          }
          if (blocksAfterHtml) {
            html += blocksAfterHtml;
          }
          if (hasDividerBelow) {
            html += dividerHtml;
          }
          html += `</div>`;
        }
      } else {
        const charClass = shortenId(log.charId);
        const isSectionStart = !prevVisibleChunk || hasBlockBefore;
        const isSectionEnd = !nextVisibleChunk || isNextSameTab === false || hasBlockAfter;
        let mb = '';
        let mt = '';

        if ((log.isCommand && log.name === 'system') || format === 'secret') {
          mb = isNextSameTab && !hasBlockAfter && shouldMergeStyle ? 'c-mb0' : 'c-mb-c';
        } else if (isNarration) {
          mt = isPrevNarration ? 'c-mt0' : 'c-mt-nr';
          mb = isNextNarration ? 'c-mb0' : 'c-mb-nr';
        } else {
          mt = isPrevSameTab && !hasBlockBefore && shouldMergeStyle ? 'c-mt0' : 'c-mt-n';
          mb = isNextSameTab && !hasBlockAfter && shouldMergeStyle ? 'c-mb0' : 'c-mb-n';
        }

        const cl = [mb, mt].filter(Boolean).join(' ');
        const clStr = `c-i${cl ? ` ${cl}` : ''}${hasSpecialDividerAboveAndNoBadge ? ' c-mt-f' : ''}`;
        
        const fullFilterAttrs = getFilterAttrs(log, clStr);

        html += `<div${fullFilterAttrs}>`;

        if (log.isCommand && log.name === 'system') {
          html += `<div class="n-r" style="padding: ${paddingVertical}px ${paddingHorizontal}px;">`;
          const flatPieces = finalHtmlContentPieces.flat();
          html += flatPieces.map((piece, pIdx) => {
            const prefix = pIdx > 0 ? `<div class="s-p-ob"></div>` : '';
            return `${prefix}<div style="white-space: pre-wrap; word-break: keep-all; overflow-wrap: break-word;">${piece}</div>`;
          }).join('');
          html += `</div>`;
        } else if (isNarration) {
          const flatPieces = finalHtmlContentPieces.flat();
          html += `<div class="n-r" style="padding: ${isPrevNarration ? '0.4em' : `${paddingVertical}px`} ${paddingHorizontal}px ${isNextNarration ? '0.4em' : `${paddingVertical}px`} ${paddingHorizontal}px;">`;
          html += flatPieces.map((piece, pIdx) => {
            const prefix = pIdx > 0 ? `<div class="s-p-ob"></div>` : '';
            return `${prefix}<div style="white-space: pre-wrap; word-break: keep-all; overflow-wrap: break-word;">${piece}</div>`;
          }).join('');
          html += `</div>`;
        } else if (format === 'other') {
          html += `<div class="o-r" style="padding-top: ${s(2)}px; padding-bottom: ${s(2)}px;"><span class="o-nm" style="color: ${otherNameColor}">${log.name}</span><div class="o-c">${finalHtmlContent}</div></div>`;
        } else if (format === 'info') {
          const tZ = isPrevSameTab && !isSectionStart, bZ = isNextSameTab && !isSectionEnd;
          
          // 💡 내부 스타일 방식 정보 탭: 모서리 강제 0
          const st = [
            shouldMergeStyle ? `margin: 0 ${paddingHorizontal}px;` : '',
            `border-radius: 0;`,
            shouldMergeStyle && tZ ? 'border-top: none;' : '',
            shouldMergeStyle && bZ ? 'border-bottom: none;' : ''
          ].filter(Boolean).join(' ');

          html += `<div class="i-r"${st ? ` style="${st}"` : ''}><span class="m-nm ${charClass}">${log.name}</span><div class="m-c">${finalHtmlContent}</div></div>`;
        } else if (format === 'secret') {
          const tabColor = tabSet?.color || '#ffd400';
          const secretBg = getSecretBg(tabColor);
          const avSt = hideAvatar ? 'background-color: transparent;' : '';
          
          // 💡 비밀 탭 내부 여백 및 테두리 완벽 제거 (항상 0으로 밀착!)
          const st = [
            `background: ${secretBg};`,
            `border-left: none;`,
            `margin: 0;`,
            `border-radius: 0;`,
            `border-top: none;`,
            `border-bottom: none;`
          ].filter(Boolean).join(' ');

          if (hideAllAvatars) {
            html += `<div class="s-r no-avatar-grid" style="${st}"><span class="m-nm ${charClass}">${log.name}:</span><div class="m-b"><div class="m-c">${finalHtmlContent}</div></div></div>`;
          } else {
            const avatarHtml = `<div class="m-aw"${avSt ? ` style="${avSt}"` : ''}>${img ? `<img src="${img}" class="m-a" style="${cleanStyle(customImgStyle)}" />` : ''}</div>`;
            html += `<div class="s-r" style="${st}">${avatarHtml}<div class="m-b"><span class="m-nm ${charClass}">${log.name}</span><div class="m-c">${finalHtmlContent}</div></div></div>`;
          }
        } else {
          const avSt = hideAvatar ? 'background-color: transparent;' : '';
          if (hideAllAvatars) {
            html += `<div class="m-r no-avatar-grid"><span class="m-nm ${charClass}">${log.name}:</span><div class="m-b"><div class="m-c">${finalHtmlContent}</div></div></div>`;
          } else {
            const avatarHtml = `<div class="m-aw"${avSt ? ` style="${avSt}"` : ''}>${img ? `<img src="${img}" class="m-a" style="${cleanStyle(customImgStyle)}" />` : ''}</div>`;
            html += `<div class="m-r">${avatarHtml}<div class="m-b"><span class="m-nm ${charClass}">${log.name}</span><div class="m-c">${finalHtmlContent}</div></div></div>`;
          }
        }
        if (blocksAfterHtml) {
          html += blocksAfterHtml;
        }
        if (hasDividerBelow) {
          html += dividerHtml;
        }
        html += `</div>`;
      }
    }
  });

  const finalHtml = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${pageTitle}</title>
      <link href="https://hangeul.pstatic.net/hangeul_static/css/nanum-gothic-coding.css" rel="stylesheet">
      ${isInline ? `<style>
        ${fontImport}
        ${filterBarCSS}
        ${textResetCSS}
        ${dynamicColorsCss}
        .c-tx { font-family: 'NanumGothicCodingLigature', monospace; font-weight: bold; line-height: 1.6; }
        .c-ct * { box-sizing: border-box; min-width: 0; }
      </style>` : `<style>${css}</style>`}
    </head>
    <body>
      <div class="c-mc"${isInline ? ` style="${cleanStyle(`background-color: ${bgColor}; margin: 0; padding: 0`)}"` : ''}>
        ${filterBarHtml}
        ${isInline ? `<div class="c-ct" style="${cleanStyle(`width: 100%; max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; ${fontFamily !== '(폰트 적용X)' ? `font-family: ${fontValue};` : ''} background: ${bgColor}; color: ${textColor}; line-height: ${lineHeight}; letter-spacing: ${letterSpacing === 0 ? 'normal' : `${letterSpacing}px`}; padding: 20px 0; font-size: ${fontSize}px; overflow-x: hidden`)}">\n${html}\n</div>` : `<div class="c-ct">\n${html}\n</div>`}
      </div>
      ${filterBarScript}
    </body>
    </html>
  `;

  return minifyHtml(finalHtml);
};

const minifyHtml = (html: string): string => {
  let minified = html;
  
  // 1. 주석 제거
  minified = minified.replace(/<!--[\s\S]*?-->/g, '');

  // 2. 태그와 태그 사이의 공백(줄바꿈 포함) 제거
  minified = minified.replace(/>\s+</g, '><');

  // 3. CSS 축소 (style="..." 속성 내부의 ': ' 및 '; ' 등을 ':' 및 ';'로 치환)
  minified = minified.replace(/style="([^"]*)"/gi, (match, p1) => {
    const cleaned = p1
      .replace(/:\s+/g, ':')
      .replace(/;\s+/g, ';')
      .trim();
    return `style="${cleaned}"`;
  });

  // 4. HTML 클래스명 사이의 다중 공백 단일화
  minified = minified.replace(/class="([^"]*)"/gi, (match, p1) => {
    const cleaned = p1.replace(/\s+/g, ' ').trim();
    return `class="${cleaned}"`;
  });

  return minified.trim();
};
