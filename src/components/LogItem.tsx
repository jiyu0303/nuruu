import React, { useState, useMemo, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Pencil, Trash2, Plus, X, Image as ImageIcon } from 'lucide-react';
import { cn, r, linkifyAndFormat } from '../utils';
import { LogImage } from './LogImage';
import { LogAvatar } from './LogAvatar';
import { SectionNameEditor } from './SectionNameEditor';
import { BoundaryEditor } from './BoundaryEditor';
import { useSettings } from '../contexts/SettingsContext';
import { splitNarration } from '../utils/textTokenizer';
import { SearchableSelect } from './SearchableSelect';

export const LogItem = React.memo(({ 
  log, 
  idx, 
  stableId,
  isHighlighted = false,
  isCurrentMatch = false,
  searchQuery = '',
  mergedLogs = [],
  insertedBlocks,
  startBlocks,
  imageInputLoc,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onToggleImageInput,
  onAddIllustration,
  onUpdateIllustration,
  onRemoveIllustration,
  originalLogIndex,
  illustrations = [],
  onEditLog,
  onDeleteLog,
  insertLogBlock,
  onChangeSpeaker,
  onChangeTab,
  onChangeExpression,
  charSettings: charSettingsFromProps,
  tabOrder,
  splitPointsArray,
  isPrevSameTab,
  isNextSameTab,
  isNextContinuation,
  isPrevBlock,
  mergedLogsCount,
  isPrevNarration,
  isNextNarration,
  editingLogId = null,
  setEditingLogId
}: any) => {
  const { 
    theme, disableOtherColor, fontSize, textFontSize,
    mergeTabStyles, showTabNames, hideEmptyAvatars, hideAllAvatars,
    narrationCharacter, charSettings: charSettingsFromContext, tabSettings,
    enableSentenceSpacing,
    lineHeight = 1.6, letterSpacing = 0, blockSpacing = 2, contentPadding = 15.5, avatarSizeValue = 46,
    showLogDivider = false
  } = useSettings();

  const charSettings = charSettingsFromProps || charSettingsFromContext;

  let effectiveBlockSpacing = blockSpacing;
  let basePaddingVertical = 12;
  if (effectiveBlockSpacing < 0) {
    basePaddingVertical = Math.max(2, basePaddingVertical + effectiveBlockSpacing / 2);
    effectiveBlockSpacing = 0;
  }
  
  const tabSet = tabSettings[log.tabId];
  const char = charSettings[log.charId] || { id: log.charId, name: log.name, color: log.color, visible: true, imageUrl: '' };

  const isEditing = editingLogId === log.id;
  const [editContent, setEditContent] = useState(log.content.replace(/<br\s*\/?>/gi, '\n'));
  const [editCharId, setEditCharId] = useState(log.charId);
  const [editTabId, setEditTabId] = useState(log.tabId);
  const [editIconUrl, setEditIconUrl] = useState(log.iconUrl || ''); 
  const [isHoveringButton, setIsHoveringButton] = useState(false);
  const orderedTabs = useMemo(() => {
    if (tabOrder && tabOrder.length > 0) {
      return tabOrder.map((id: string) => tabSettings[id]).filter(Boolean);
    }
    return Object.values(tabSettings);
  }, [tabOrder, tabSettings]);

  const [tabOverrideValue, setTabOverrideValue] = useState(() => {
    const initialTabId = log.tabId || '';
    const hasTab = orderedTabs.some((tab: any) => tab.id === initialTabId);
    return hasTab ? initialTabId : (orderedTabs[0]?.id || '');
  });
  const [imageInputVal, setImageInputVal] = useState('');
  const [dragOverPart, setDragOverPart] = useState<'top' | 'bottom' | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (!types.includes("application/json") && !types.includes("text/plain")) return;

    e.preventDefault();
    e.stopPropagation();

    const isLast = idx === mergedLogsCount - 1;
    if (isLast) {
      const rect = e.currentTarget.getBoundingClientRect();
      const cursorY = e.clientY;
      const middleY = rect.top + rect.height / 2;
      if (cursorY < middleY) {
        if (dragOverPart !== 'top') setDragOverPart('top');
      } else {
        if (dragOverPart !== 'bottom') setDragOverPart('bottom');
      }
    } else {
      if (dragOverPart !== 'top') setDragOverPart('top');
    }
  };

  const handleDragLeave = () => {
    setDragOverPart(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const finalPart = dragOverPart;
    setDragOverPart(null);

    try {
      let dataStr = e.dataTransfer.getData("application/json") || e.dataTransfer.getData("text/plain");
      if (!dataStr) return;
      
      let parsed = null;
      if (dataStr.trim().startsWith('{')) {
        parsed = JSON.parse(dataStr);
      } else {
        parsed = { type: 'illustration', id: dataStr };
      }

      if (parsed && parsed.type === 'illustration') {
        const illId = parsed.id;
        const pos = finalPart || 'top';
        if (onUpdateIllustration) {
          onUpdateIllustration(illId, { 
            targetLogId: stableId, 
            position: pos === 'top' ? 'before' : 'after' 
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!imageInputLoc || imageInputLoc.logId !== stableId) {
      setImageInputVal('');
    }
    const initialTabId = log.tabId || '';
    const hasTab = orderedTabs.some((tab: any) => tab.id === initialTabId);
    setTabOverrideValue(hasTab ? initialTabId : (orderedTabs[0]?.id || ''));
  }, [imageInputLoc, stableId, log.tabId, orderedTabs]);

  useEffect(() => {
    if (isEditing) {
      setEditContent(log.content.replace(/<br\s*\/?>/gi, '\n'));
      setEditCharId(log.charId);
      setEditTabId(log.tabId);
      setEditIconUrl(log.iconUrl || ''); // 👈 추가!
    }
  }, [isEditing, log.id, log.content, log.charId, log.tabId, log.iconUrl]); //

  const handleCancel = () => {
    if (!log.content || log.content.trim() === '') {
      onDeleteLog(log.id);
    }
    setEditingLogId(null);
  };

  const handleConfirm = () => {
    const trimmed = editContent.trim();
    if (!trimmed) {
      onDeleteLog(log.id);
    } else {
      onEditLog(log.id, editContent);
      if (editCharId !== log.charId && onChangeSpeaker) {
        onChangeSpeaker(log.id, editCharId);
      }
      if (editTabId !== log.tabId && onChangeTab) {
        onChangeTab(log.id, editTabId);
      }
      //  아래 3줄이 추가된 부분입니다! (표정이 바뀌었으면 업데이트) 
      if (editIconUrl !== log.iconUrl && onChangeExpression) {
        onChangeExpression(log.id, editIconUrl);
      }
    }
    setEditingLogId(null);
  };

  // Define how blocks are rendered
  const renderBlocks = (blocks: any[], logId: string, isTopLevel: boolean = false) => {
    const isLastLog = idx === mergedLogsCount - 1;
    return (
      <>
        <BoundaryEditor 
          id={logId}
          onToggleSplit={() => onAddBlock(logId, 0, 'split')}
          onInsertImage={() => onToggleImageInput(logId, 0)}
          onInsertLog={() => insertLogBlock(log.id, isTopLevel)}
          allowSplit={!isTopLevel && !(isLastLog && blocks.length === 0)}
          isTopLevel={isTopLevel}
          disabled={isHoveringButton}
          onDropIllustration={(illId) => onUpdateIllustration(illId, { targetLogId: stableId, position: 'before' })}
        />
        {imageInputLoc?.logId === logId && imageInputLoc.insertIndex === 0 && (
          <div className={cn(
            "mx-4 my-2 p-4 border border-dashed rounded-xl flex flex-col gap-3",
            theme === 'dark' ? "bg-white/5 border-white/20" : "bg-stone-50 border-stone-200 "
          )}>
            <div className="flex gap-2 items-center">
              <select 
                value={tabOverrideValue}
                onChange={(e) => setTabOverrideValue(e.target.value)}
                className={cn(
                  "border rounded-lg px-3 py-2 text-[11px] h-9 min-w-[120px] focus:outline-none focus:ring-1 focus:ring-[#4799c7]",
                  theme === 'dark' ? "bg-black/40 text-white border-white/20" : "bg-white text-stone-900 border-stone-200"
                )}
              >
                {orderedTabs.map((tab: any) => (
                  <option key={tab.id} value={tab.id}>
                    {tab.name}
                  </option>
                ))}
              </select>
              <input 
                type="text" 
                placeholder="https://..." 
                value={imageInputVal}
                onChange={(e) => setImageInputVal(e.target.value)}
                className={cn(
                  "flex-1 border rounded-lg px-3 py-2 text-[11px] h-9 focus:outline-none focus:ring-1 focus:ring-[#4799c7]",
                  theme === 'dark' ? "bg-black/40 text-white border-white/20" : "bg-white text-stone-900 border-stone-200"
                )}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === 'Enter') {
                    const url = imageInputVal.trim();
                    if (url && onAddIllustration) {
                      onAddIllustration(stableId, url, tabOverrideValue);
                    }
                  }
                }}
              />
              <button 
                onClick={() => {
                  const url = imageInputVal.trim();
                  if (url && onAddIllustration) {
                    onAddIllustration(stableId, url, tabOverrideValue);
                  }
                }}
                className="px-4 py-2 bg-[#4799c7] hover:bg-[#2767a4] text-white rounded-lg text-[11px] h-9 font-bold shrink-0 flex items-center justify-center transition-colors"
              >
                추가
              </button>
            </div>
          </div>
        )}

        {blocks.map((block, i) => (
          <React.Fragment key={block.id}>
            {block.type === 'image' && (
              <LogImage 
                url={block.url} 
                width={block.width}
                align={block.align}
                onDelete={() => onRemoveBlock(logId, block.id)} 
                onUpdateWidth={(w: string) => onUpdateBlock(logId, block.id, { width: w })}
                onUpdateAlign={(a: 'left' | 'center' | 'right') => onUpdateBlock(logId, block.id, { align: a })}
                paddingSize={0}
              />
            )}
            {block.type === 'split' && (
              <div id={`section-${block.id}`} className="mt-1 mb-1 px-4 font-sans relative">
                <div className="flex items-end justify-between max-w-full border-b border-[#4799c7]">
                  <div className="bg-[#4799c7] rounded-t-lg px-4 py-1 flex items-center shadow-lg gap-2">
                    <SectionNameEditor 
                      initialName={block.name || ''}
                      defaultName={(() => {
                        const splitIndex = splitPointsArray.indexOf(idx);
                        return `섹션 ${splitIndex !== -1 ? splitIndex + 2 : 2}`;
                      })()}
                      onSave={(name) => onUpdateBlock(logId, block.id, { name })}
                    />
                    <button onClick={() => onRemoveBlock(logId, block.id)} className="text-white/60 hover:text-white p-1 ml-2 flex-shrink-0" title="섹션 삭제">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className={cn(
                    "text-[10px] font-bold mb-1 ml-4",
                    theme === 'dark' ? "text-white/40" : "text-stone-400"
                  )}>
                    {`${idx + 1} - ${(() => {
                      const _nextIndex = splitPointsArray.findIndex((p: number) => p > idx);
                      return _nextIndex !== -1 ? splitPointsArray[_nextIndex] : mergedLogsCount;
                    })()}번 블록`}
                  </div>
                </div>
              </div>
            )}
            
            <BoundaryEditor 
              id={logId}
              onToggleSplit={() => onAddBlock(logId, i + 1, 'split')}
              onInsertImage={() => onToggleImageInput(logId, i + 1)}
              onInsertLog={() => insertLogBlock(log.id, isTopLevel)}
              allowSplit={!(isLastLog && i === blocks.length - 1)}
              disabled={isHoveringButton}
              onDropIllustration={(illId) => onUpdateIllustration(illId, { targetLogId: stableId, position: 'after' })}
            />
             {imageInputLoc?.logId === logId && imageInputLoc.insertIndex === i + 1 && (
              <div className={cn(
                "mx-4 my-2 p-4 border border-dashed rounded-xl flex flex-col gap-3",
                theme === 'dark' ? "bg-white/5 border-white/20" : "bg-stone-50 border-stone-200 "
              )}>
                <div className="flex gap-2 items-center">
                  <select 
                    value={tabOverrideValue}
                    onChange={(e) => setTabOverrideValue(e.target.value)}
                    className={cn(
                      "border rounded-lg px-3 py-2 text-[11px] h-9 min-w-[120px] focus:outline-none focus:ring-1 focus:ring-[#4799c7]",
                      theme === 'dark' ? "bg-black/40 text-white border-white/20" : "bg-white text-stone-900 border-stone-200"
                    )}
                  >
                    {orderedTabs.map((tab: any) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.name}
                      </option>
                    ))}
                  </select>
                  <input 
                    type="text" 
                    placeholder="https://..." 
                    value={imageInputVal}
                    onChange={(e) => setImageInputVal(e.target.value)}
                    className={cn(
                      "flex-1 border rounded-lg px-3 py-2 text-[11px] h-9 focus:outline-none focus:ring-1 focus:ring-[#4799c7]",
                      theme === 'dark' ? "bg-black/40 text-white border-white/20" : "bg-white text-stone-900 border-stone-200"
                    )}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === 'Enter') {
                        const url = imageInputVal.trim();
                        if (url && onAddIllustration) {
                          onAddIllustration(stableId, url, tabOverrideValue);
                        }
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      const url = imageInputVal.trim();
                      if (url && onAddIllustration) {
                        onAddIllustration(stableId, url, tabOverrideValue);
                      }
                    }}
                    className="px-4 py-2 bg-[#4799c7] hover:bg-[#2767a4] text-white rounded-lg text-[11px] h-9 font-bold shrink-0 flex items-center justify-center transition-colors"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  const format = tabSet?.format || 'main';
  const color = char.color || log.color;
  const otherNameColor = disableOtherColor ? (theme === 'dark' ? '#AAAAAA' : '#777777') : color;
  
  // 🎲 다이스(명령어) 표정 상속 로직 (연속 다이스 굴림 완벽 대응)
  let img = log.iconUrl; 
  if (!img && log.isCommand && log.name !== 'system') {
    // 위로 거슬러 올라가면서 표정을 찾습니다.
    for (let i = idx - 1; i >= 0; i--) {
      const prev = mergedLogs[i];
      // 💡 핵심: 직전 로그가 '다이스(isCommand)'가 아닌 '진짜 대사'일 때까지만 거슬러 올라갑니다!
      if (prev.charId === log.charId && !prev.isIllustration && !prev.isCommand && prev.name !== 'system') {
        img = prev.iconUrl; 
        break;
      }
    }
  }
  // 찾은 표정이 없거나, 애초에 다이스가 아니었다면 본인의 원래 프사를 씁니다.
  img = img || char.imageUrl;
  const isSecret = format === 'secret';
  const tabColor = tabSet?.color || '#ffd400';
  const isNarration = log.charId === narrationCharacter && format === 'main';

  const narrationMargin = Math.floor(effectiveBlockSpacing * 1.2 + lineHeight * 6);

  let displayContent = log.content;
  if (log.isCommand) {
    displayContent = displayContent.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/(?:\r\n|\r|\n)+/g, ' ');
  }

  let textPieces = [displayContent];
  if (isNarration && enableSentenceSpacing) {
    textPieces = splitNarration(displayContent);
  }

  let formattedPieces = textPieces.map(piece => {
    let pieceHtml = linkifyAndFormat(piece);
    if (log.name === 'system') {
      pieceHtml = pieceHtml.replace(/\[\s*(.*?)\s*\]/g, (match: string, p1: string) => {
        const charChars = charSettings[p1.trim()];
        if (charChars) {
          return `<span style="color: ${charChars.color};">${match}</span>`;
        }
        return match;
      });
    }
    return pieceHtml;
  });

  let displayName = log.name;
  if (searchQuery && isHighlighted) {
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    const markBg = isCurrentMatch ? '#ff9900' : '#4799c7';
    
    // Highlight content for each piece
    formattedPieces = formattedPieces.map(pieceHtml => {
      const parts = pieceHtml.split(/(<[^>]*>)/);
      for (let i = 0; i < parts.length; i++) {
          if (i % 2 === 0) {
              parts[i] = parts[i].replace(regex, `<mark style="background-color: ${markBg}; color: white; border-radius: 2px; padding: 0 2px;">$1</mark>`);
          }
      }
      return parts.join('');
    });

    // Highlight name
    displayName = displayName.replace(regex, `<mark style="background-color: ${markBg}; color: white; border-radius: 2px; padding: 0 2px;">$1</mark>`);
  }
  
  const safeHtmlContentPieces = useMemo(() => {
    return formattedPieces.map(html => DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }));
  }, [formattedPieces]);
  const safeHtmlContent = safeHtmlContentPieces[0] || '';
  const safeHtmlName = useMemo(() => DOMPurify.sanitize(displayName), [displayName]);
  
  const getSecretBg = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return theme === 'dark' ? `rgba(${r}, ${g}, ${b}, 0.15)` : `rgba(${r}, ${g}, ${b}, 0.08)`;
  };

  const scale = fontSize / 14;
  const avatarSize = Math.round(avatarSizeValue * scale);
  const gapSize = Math.round(12 * scale);
  const paddingVertical = Math.round(basePaddingVertical * scale);
  const paddingHorizontal = Math.round(contentPadding * scale);
  
  const scaledTextFontSize = textFontSize * scale;
  const scaledLetterSpacing = letterSpacing * scale;
  const textScale = scaledTextFontSize / 14;
  const nameSize = Math.round(13.44 * textScale); // 0.96em of 14px

  const currentBlocks = Array.isArray(insertedBlocks)
    ? insertedBlocks
    : (insertedBlocks[stableId] || []);
  
  const logIllustrations = useMemo(() => {
    if (originalLogIndex === undefined || originalLogIndex === -1) return [];
    return illustrations.filter((ill: any) => ill.afterLogIndex === originalLogIndex);
  }, [illustrations, originalLogIndex]);

  const hasBlockAfter = currentBlocks.length > 0;
  
  const isSplit = hasBlockAfter && currentBlocks.some((b: any) => b.type === 'split');
  const shouldMergeStyle = mergeTabStyles.has(format) && (isPrevSameTab || isNextSameTab);
  
  const isSectionStart = idx === 0 || isPrevBlock;
  const isSectionEnd = idx === mergedLogsCount - 1 || hasBlockAfter;
  
  const mergeWithPrev = log.isContinuation || (shouldMergeStyle && isPrevSameTab && !isSectionStart);
  const mergeWithNext = isNextContinuation || (shouldMergeStyle && isNextSameTab && !isSectionEnd);

  const shouldShowIndex = showTabNames.has(format) && (!isPrevSameTab || isPrevBlock);
  
  let itemMarginTop = '0';
  let itemMarginBottom = '0';

  if (log.isCommand || format === 'secret') {
    itemMarginBottom = mergeWithNext ? '0' : `${effectiveBlockSpacing}px`;
  } else if (isNarration) {
    itemMarginTop = log.isContinuation ? '0' : `${Math.floor(narrationMargin / 2)}px`;
    itemMarginBottom = mergeWithNext ? '0' : `${Math.ceil(narrationMargin / 2)}px`;
  } else {
    itemMarginTop = mergeWithPrev ? '0' : `${Math.floor(effectiveBlockSpacing / 2)}px`;
    itemMarginBottom = mergeWithNext ? '0' : `${Math.ceil(effectiveBlockSpacing / 2)}px`;
  }

  const getSectionRange = () => {
    const sorted = splitPointsArray;
    const splitIdx = sorted.indexOf(idx);
    const start = idx + 2;
    const nextSplitIdx = splitIdx + 1;
    const end = nextSplitIdx < sorted.length ? sorted[nextSplitIdx] + 1 : mergedLogsCount;
    return `${start} - ${end}`;
  };

  const getHasDividerBelow = (i: number) => {
    if (!showLogDivider) return false;
    if (i < 0 || i >= mergedLogsCount - 1) return false;
    const logA = mergedLogs[i];
    const logB = mergedLogs[i + 1];
    if (!logA || !logB) return false;

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
      }
      if (!isISA && isISB) {
        // 가장 첫 정보/비밀 위: '탭 이름 표시'가 활성화되어 있다면 구분선이 있음
        return showTabNames.has(formatB);
      }
      if (isISA && !isISB) {
        // 가장 마지막 정보/비밀 아래: 해당 비밀/정보탭의 '탭 이름 표시'가 활성화되어 있을 때만 구분선이 들어감
        return showTabNames.has(formatA);
      }
    }

    // 우선순위 4위: 잡담 탭 (잡담끼리는 하나로 취급해 사이사이에 구분선 없고, 첫 잡담 위와 마지막 잡담 아래에만 선이 있음)
    const isChatA = formatA === 'other';
    const isChatB = formatB === 'other';
    if (isChatA || isChatB) {
      if (isChatA && isChatB) {
        return false;
      }
      return true;
    }

    // 그 외 일반적인 경우 (기본)
    const isSameTab = logA.tab === logB.tab;
    const shouldMergeA = mergeTabStyles.has(formatA);
    if (shouldMergeA && isSameTab) {
      return false;
    }

    return true;
  };

  const hasDividerBelow = useMemo(() => {
    return getHasDividerBelow(idx);
  }, [idx, mergedLogsCount, mergedLogs, tabSettings, narrationCharacter, showTabNames, mergeTabStyles, showLogDivider]);

  const hasDividerAbove = useMemo(() => {
    return idx > 0 ? getHasDividerBelow(idx - 1) : false;
  }, [idx, mergedLogsCount, mergedLogs, tabSettings, narrationCharacter, showTabNames, mergeTabStyles, showLogDivider]);

  const prevLog = idx > 0 ? mergedLogs[idx - 1] : null;
  const prevFormat = useMemo(() => {
    if (!prevLog) return null;
    if (prevLog.isCommand) return 'command';
    const tabSet = tabSettings[prevLog.tabId];
    const formatVal = tabSet?.format || 'main';
    if (prevLog.charId === narrationCharacter && formatVal === 'main') {
      return 'narration';
    }
    return formatVal;
  }, [prevLog, tabSettings, narrationCharacter]);

  const nextLog = idx < mergedLogsCount - 1 ? mergedLogs[idx + 1] : null;
  const nextFormat = useMemo(() => {
    if (!nextLog) return null;
    if (nextLog.isCommand) return 'command';
    const tabSet = tabSettings[nextLog.tabId];
    const formatVal = tabSet?.format || 'main';
    if (nextLog.charId === narrationCharacter && formatVal === 'main') {
      return 'narration';
    }
    return formatVal;
  }, [nextLog, tabSettings, narrationCharacter]);

  const isSpecialDividerBelow = useMemo(() => {
    if (!nextLog) return false;
    if (log.tabId === nextLog.tabId) return false;
    const isSpecialFormat = (f: string | null) => f === 'info' || f === 'secret' || f === 'other';
    return isSpecialFormat(format) || isSpecialFormat(nextFormat);
  }, [log.tabId, nextLog, format, nextFormat]);

  const isSpecialDividerAbove = useMemo(() => {
    if (!prevLog) return false;
    if (log.tabId === prevLog.tabId) return false;
    const isSpecialFormat = (f: string | null) => f === 'info' || f === 'secret' || f === 'other';
    return isSpecialFormat(format) || isSpecialFormat(prevFormat);
  }, [log.tabId, prevLog, format, prevFormat]);

  const hasSpecialDividerBelow = useMemo(() => {
    return hasDividerBelow && isSpecialDividerBelow;
  }, [hasDividerBelow, isSpecialDividerBelow]);

  const hasSpecialDividerAbove = useMemo(() => {
    return hasDividerAbove && isSpecialDividerAbove;
  }, [hasDividerAbove, isSpecialDividerAbove]);

  const nextShouldShowIndex = useMemo(() => {
    if (!nextLog) return false;
    const tabSet = tabSettings[nextLog.tabId];
    const nFormat = tabSet?.format || 'main';
    const isSameTab = log.tabId === nextLog.tabId;
    return showTabNames.has(nFormat) && (!isSameTab || hasBlockAfter);
  }, [nextLog, log.tabId, tabSettings, showTabNames, hasBlockAfter]);

  const dividerMarginTop = useMemo(() => {
    if (!hasSpecialDividerBelow) return 0;
    if (format === 'main') {
      return 0;
    }
    return 12;
  }, [hasSpecialDividerBelow, format]);

  const dividerMarginBottom = useMemo(() => {
    if (!hasSpecialDividerBelow) return 0;
    if (nextFormat === 'main') {
      if (nextShouldShowIndex) {
        return 12;
      }
      return 0;
    }
    return 12;
  }, [hasSpecialDividerBelow, nextFormat, nextShouldShowIndex]);

  const hasSpecialDividerAboveAndNoBadge = useMemo(() => {
    return hasSpecialDividerAbove && !shouldShowIndex;
  }, [hasSpecialDividerAbove, shouldShowIndex]);

  const finalItemMarginTop = useMemo(() => {
    if (hasSpecialDividerAboveAndNoBadge) return '0';
    return itemMarginTop;
  }, [hasSpecialDividerAboveAndNoBadge, itemMarginTop]);

  if (log.isIllustration) {
    const ill = log.illustration || {
      id: log.id,
      url: log.content,
      tabOverride: log.tabOverride || 'auto',
      width: log.width,
      align: log.align || 'center'
    };
    const resolvedTabOverride = ill.tabOverride === 'auto' || !ill.tabOverride ? (log.tabId || 'main') : ill.tabOverride;
    const illTabSet = tabSettings[resolvedTabOverride] || tabSettings['main'] || Object.values(tabSettings)[0];
    const illFormat = illTabSet?.format || 'main';
    const illIsSecret = illFormat === 'secret';
    const illTabColor = illTabSet?.color || '#ffd400';

    const align = ill.align || 'center';
    const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

    const isFirstInSection = !isPrevSameTab;
    const isLastInSection = !isNextSameTab;

    let contentPaddingValue = contentPadding;
    if (typeof contentPaddingValue !== 'number') {
      contentPaddingValue = parseFloat(contentPaddingValue) || 15.5;
    }

    const scale = fontSize / 14;
    const paddingHorizontal = contentPaddingValue * scale;
    const paddingVertical = basePaddingVertical * scale;

    const renderHeader = showTabNames.has(illFormat) && isFirstInSection;

    return (
      <div 
        className={cn(
          "log-item-wrapper group/item relative min-h-[30px] flex flex-col justify-center",
          dragOverPart === 'top' && "is-drag-over-top",
          dragOverPart === 'bottom' && "is-drag-over-bottom"
        )}
        style={{
          marginTop: isFirstInSection ? `${Math.round(paddingVertical)}px` : '4px',
          marginBottom: isLastInSection ? `${Math.round(paddingVertical)}px` : '4px',
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {dragOverPart === 'top' && (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#4799c7] z-40 pointer-events-none" />
        )}
        {dragOverPart === 'bottom' && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#4799c7] z-40 pointer-events-none" />
        )}
        {idx === 0 && renderBlocks(startBlocks, '__start__', true)}
        {renderHeader && (
          <div style={{ margin: `${hasSpecialDividerAbove ? 0 : 12}px ${r(paddingHorizontal)}px 8px ${r(paddingHorizontal)}px`, display: 'flex' }}>
            <div style={{ 
              background: getSecretBg(illTabColor), 
              color: illTabColor,
              padding: '2px 10px',
              borderRadius: '4px',
              fontSize: `${r(nameSize * 0.8)}px`,
              fontWeight: 'bold',
              border: `1px solid ${illTabColor}44`
            }}>
              {illTabSet?.name || 'Unknown'}
            </div>
          </div>
        )}

        {!log.isIllustration && (
          <div 
            onMouseEnter={() => setIsHoveringButton(true)}
            onMouseLeave={() => setIsHoveringButton(false)}
            className="absolute top-2 right-4 flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-20"
          >
            <button 
              onClick={() => onDeleteLog(log.id)} 
              className={cn(
                "p-1 rounded border  backdrop-blur-sm transition-colors",
                theme === 'dark' 
                  ? "bg-stone-800/80 text-white/60 hover:text-red-400 border-white/10" 
                  : "bg-white/90 text-stone-600 hover:text-red-500 border-stone-200"
              )}
              title="삭제"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {illFormat === 'info' ? (
          <div
            style={{
              paddingTop: `${Math.round(12 * scale)}px`,
              paddingBottom: `${Math.round(12 * scale)}px`,
              paddingLeft: `${Math.round(paddingHorizontal)}px`,
              paddingRight: `${Math.round(paddingHorizontal)}px`,
              background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              borderLeft: `4px solid ${theme === 'dark' ? '#444' : '#DDD'}`,
              marginLeft: `${Math.round(paddingHorizontal)}px`,
              marginRight: `${Math.round(paddingHorizontal)}px`,
              borderRadius: '4px',
              display: 'flex',
              justifyContent: justify
            }}
          >
            <LogImage
              url={ill.url}
              width={ill.width}
              align={ill.align || 'center'}
              onUpdateWidth={(w: string) => onUpdateIllustration && onUpdateIllustration(ill.id, { width: w })}
              onUpdateAlign={(a: 'left' | 'center' | 'right') => onUpdateIllustration && onUpdateIllustration(ill.id, { align: a })}
              paddingSize={0}
              tabOverride={ill.tabOverride}
              onUpdateTabOverride={(tabId: string) => onUpdateIllustration && onUpdateIllustration(ill.id, { tabOverride: tabId })}
            />
          </div>
        ) : illFormat === 'secret' ? (
          <div
            style={{
              paddingTop: `${paddingVertical}px`,
              paddingBottom: `${paddingVertical}px`,
              paddingLeft: `${Math.round(paddingHorizontal) }px`,
              paddingRight: `${Math.round(paddingHorizontal)}px`,
              background: getSecretBg(illTabColor),
              borderLeft: `4px solid ${illTabColor}`,
              marginLeft: `${Math.round(paddingHorizontal) }px`,
              marginRight: `${Math.round(paddingHorizontal)}px`,
              borderRadius: '4px',
              display: 'flex',
              justifyContent: justify
            }}
          >
            <LogImage
              url={ill.url}
              width={ill.width}
              align={ill.align || 'center'}
              onDelete={() => onUpdateIllustration && onUpdateIllustration(ill.id, { afterLogIndex: null })}
              onUpdateWidth={(w: string) => onUpdateIllustration && onUpdateIllustration(ill.id, { width: w })}
              onUpdateAlign={(a: 'left' | 'center' | 'right') => onUpdateIllustration && onUpdateIllustration(ill.id, { align: a })}
              paddingSize={0}
              tabOverride={ill.tabOverride}
              onUpdateTabOverride={(tabId: string) => onUpdateIllustration && onUpdateIllustration(ill.id, { tabOverride: tabId })}
            />
          </div>
        ) : (
          <div 
            style={{ 
              marginLeft: `${Math.round(paddingHorizontal)}px`,
              marginRight: `${Math.round(paddingHorizontal)}px`,
              display: 'flex', 
              justifyContent: justify 
            }}
          >
            <LogImage
              url={ill.url}
              width={ill.width}
              align={ill.align || 'center'}
              onDelete={() => onUpdateIllustration && onUpdateIllustration(ill.id, { afterLogIndex: null })}
              onUpdateWidth={(w: string) => onUpdateIllustration && onUpdateIllustration(ill.id, { width: w })}
              onUpdateAlign={(a: 'left' | 'center' | 'right') => onUpdateIllustration && onUpdateIllustration(ill.id, { align: a })}
              paddingSize={0}
              tabOverride={ill.tabOverride}
              onUpdateTabOverride={(tabId: string) => onUpdateIllustration && onUpdateIllustration(ill.id, { tabOverride: tabId })}
            />
          </div>
        )}

        {hasDividerBelow && !isSplit && (
          <div 
            style={{
              marginTop: `${r(dividerMarginTop * scale)}px`,
              marginBottom: `${r(dividerMarginBottom * scale)}px`,
              marginLeft: ((format === 'info' || format === 'secret') && mergeWithNext) ? `${r(paddingHorizontal)}px` : '0',
              marginRight: ((format === 'info' || format === 'secret') && mergeWithNext) ? `${r(paddingHorizontal)}px` : '0',
              background: ((format === 'info' || format === 'secret') && mergeWithNext) 
                ? (format === 'secret' ? getSecretBg(tabColor) : (theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)')) 
                : 'transparent',
              borderLeft: ((format === 'info' || format === 'secret') && mergeWithNext)
                ? (format === 'secret' ? `4px solid ${tabColor}` : `4px solid ${theme === 'dark' ? '#444' : '#DDD'}`)
                : 'none',
              paddingLeft: `${r(paddingHorizontal)}px`,
              paddingRight: `${r(paddingHorizontal)}px`
            }}
            className="w-full flex items-center justify-stretch pointer-events-none mt-4"
          >
            <div 
              className={cn(
                "w-full border-b-[1px]",
                theme === 'dark' 
                  ? "border-white/8" 
                  : "border-black/10"
              )}
            />
          </div>
        )}

        {renderBlocks(insertedBlocks, stableId)}
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "log-item-wrapper group/item relative min-h-[30px] flex flex-col justify-center",
        isEditing && "is-editing",
        isHighlighted && searchQuery && (
          isCurrentMatch 
            ? (theme === 'dark' ? "bg-[#ff9900]/20" : "bg-[#ff9900]/10")
            : (theme === 'dark' ? "bg-[#4799c7]/10" : "bg-[#4799c7]/5")
        ),
        dragOverPart === 'top' && "is-drag-over-top",
        dragOverPart === 'bottom' && "is-drag-over-bottom"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {dragOverPart === 'top' && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#4799c7] z-40 pointer-events-none" />
      )}
      {dragOverPart === 'bottom' && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#4799c7] z-40 pointer-events-none" />
      )}
      {idx === 0 && renderBlocks(startBlocks, '__start__', true)}
      {!isEditing && (
        <div 
          onMouseEnter={() => setIsHoveringButton(true)}
          onMouseLeave={() => setIsHoveringButton(false)}
          className="absolute top-2 right-4 flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity z-20"
        >
          <div className="bg-black/85 text-white/95 border border-white/10 rounded px-1.5 py-0.5 text-[9.5px] font-bold font-mono tracking-wider shadow-md leading-none">
            #{originalLogIndex + 1}
          </div>
          <button 
            onClick={() => { setEditingLogId(log.id); setEditContent(log.content.replace(/<br\s*\/?>/gi, '\n')); setEditCharId(log.charId); }} 
            className={cn(
              "p-1 rounded border  backdrop-blur-sm transition-colors",
              theme === 'dark' 
                ? "bg-stone-800/80 text-white/60 hover:text-white border-white/10" 
                : "bg-white/90 text-stone-600 hover:text-stone-900 border-stone-200"
            )}
            title="수정"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button 
            onClick={() => onDeleteLog(log.id)} 
            className={cn(
              "p-1 rounded border  backdrop-blur-sm transition-colors",
              theme === 'dark' 
                ? "bg-stone-800/80 text-white/60 hover:text-red-400 border-white/10" 
                : "bg-white/90 text-stone-600 hover:text-red-500 border-stone-200"
            )}
            title="삭제"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

        {!log.isHiddenContent && shouldShowIndex && (
          <div style={{ margin: `${hasSpecialDividerAbove ? 0 : 12}px ${r(paddingHorizontal)}px 8px ${r(paddingHorizontal)}px`, display: 'flex' }}>
            <div style={{ 
              background: getSecretBg(tabColor), 
              color: tabColor,
              padding: '2px 10px',
              borderRadius: '4px',
              fontSize: `${r(nameSize * 0.8)}px`,
              fontWeight: 'bold',
              border: `1px solid ${tabColor}44`
            }}>
              {log.tab}
            </div>
          </div>
        )}
        
        {!log.isHiddenContent && (
          <div className="log-item" style={{ 
            marginBottom: itemMarginBottom,
            marginTop: finalItemMarginTop
          }}>
            {isEditing ? (
            <div 
              className="w-full my-1.5" 
              style={{ paddingLeft: `${r(paddingHorizontal)}px`, paddingRight: `${r(paddingHorizontal)}px` }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            >
              <div className={cn(
                "p-2 rounded-lg flex flex-col gap-2 border",
                theme === 'dark' ? "bg-black/20 border-white/10" : "bg-stone-100 border-stone-200 "
              )}>
                {/* Header Control Row (above the Textarea) */}
                <div className={cn(
                  "flex items-center justify-between gap-3 pb-1.5 border-b",
                  theme === 'dark' ? "border-white/5" : "border-stone-200/60"
                )}>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] whitespace-nowrap font-medium shrink-0", theme === 'dark' ? "text-white/40" : "text-stone-500")}>탭:</span>
                      <SearchableSelect
                        value={editTabId}
                        onChange={(val) => setEditTabId(val)}
                        options={(tabOrder || Object.keys(tabSettings)).map((tId: string) => {
                          const tab = tabSettings[tId];
                          return { label: tab?.name || tId, value: tId, color: tab?.color };
                        })}
                        placeholder="선택 안 함"
                        className="w-[120px] text-xs"
                        theme={theme}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] whitespace-nowrap font-medium shrink-0", theme === 'dark' ? "text-white/40" : "text-stone-500")}>발언자:</span>
                      <SearchableSelect
                        value={editCharId}
                        onChange={(val) => setEditCharId(val)}
                        options={Object.values(charSettings).map((c: any) => ({ label: c.name, value: c.id, color: c.color }))}
                        placeholder="선택 안 함"
                        className="w-[120px] text-xs"
                        theme={theme}
                      />
                    </div>
                    {charSettings[editCharId]?.expressions && charSettings[editCharId].expressions.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-[10px] whitespace-nowrap font-medium shrink-0", theme === 'dark' ? "text-white/40" : "text-stone-500")}>표정:</span>
                        <SearchableSelect
                          value={editIconUrl}
                          onChange={(val) => setEditIconUrl(val)}
                          options={[
                            { label: "선택하세요", value: "" },
                            ...charSettings[editCharId].expressions.map((e: any) => ({
                              label: e.label,
                              value: e.url
                            }))
                          ]}
                          placeholder="표정 변경"
                          className="w-[120px] text-xs"
                          theme={theme}
                        />
                      </div>
                    )}
                    
                  </div>
                  <div className="flex justify-end gap-1 shrink-0">
                    <button 
                      onClick={handleCancel} 
                      className={cn(
                        "px-2 py-1 text-[11px] font-medium transition-colors",
                        theme === 'dark' ? "text-white/40 hover:text-white" : "text-stone-500 hover:text-stone-800"
                      )}
                    >
                      취소
                    </button>
                    <button 
                      onClick={handleConfirm} 
                      className="px-3 py-1 bg-[#4799c7] text-white rounded text-[11px] font-medium hover:bg-[#2767a4] transition-colors "
                    >
                      확인
                    </button>
                  </div>
                </div>

                {/* Textarea */}
                <textarea 
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className={cn(
                    "w-full text-[13px] p-1.5 rounded outline-none focus:border-[#4799c7] min-h-[64px] transition-colors resize-y",
                    theme === 'dark' 
                      ? "bg-black/35 text-white border-white/5" 
                      : "bg-white text-stone-800 border-stone-200"
                  )}
                  autoFocus
                />
              </div>
            </div>
          ) : format === 'other' ? (
            (() => {
              // 잡담 탭의 기본 텍스트 색상
              let chatColor = theme === 'dark' ? '#AAAAAA' : '#777777';
              // 🎲 다이스(명령어)라면 결과에 따라 텍스트 색상만 예쁘게 입혀줍니다!
              if (log.isCommand) {
                const contentStr = log.content;
                if (contentStr.includes('대성공')) chatColor = '#ffbf00';
                else if (contentStr.includes('극단적 성공') || contentStr.includes('대단한 성공')) chatColor = '#fc7300';
                else if (contentStr.includes('어려운 성공')) chatColor = '#00d617';
                else if (contentStr.includes('보통 성공')) chatColor = '#009af9';
                else if (contentStr.includes('＞ 실패')) chatColor = '#ff008f';
                else if (contentStr.includes('＞ 대실패')) chatColor = '#ff1000';
              }
              return (
                <div key="other" style={{ padding: `2px ${r(paddingHorizontal)}px`, display: 'flex', gap: `${r(gapSize / 1.5)}px`, alignItems: 'baseline', lineHeight: lineHeight, letterSpacing: letterSpacing === 0 ? 'normal' : `${scaledLetterSpacing}px` }}>
                  <div className="relative inline-block flex-shrink-0" style={{ opacity: log.isContinuation ? 0 : 1, pointerEvents: log.isContinuation ? 'none' : 'auto', userSelect: log.isContinuation ? 'none' : 'auto' }}>
                    <span style={{ fontWeight: 'bold', color: otherNameColor, fontSize: `${nameSize}px` }} className="cursor-default" dangerouslySetInnerHTML={{ __html: safeHtmlName }} />
                  </div>
                  <div style={{ color: chatColor, fontSize: `${scaledTextFontSize}px`, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word' }} dangerouslySetInnerHTML={{ __html: safeHtmlContent }} />
                </div>
              );
            })()
          ) : log.isCommand ? (
            log.name === 'system' ? (
              /* 1. 시스템 메시지 디자인 (나레이션과 동일하게 가운데 정렬 + 볼드 이탤릭) */
              <div key="system-message" className="narration-row" style={{ 
                paddingTop: log.isContinuation ? '0.4em' : `${r(12 * scale)}px`,
                paddingBottom: isNextContinuation ? '0.4em' : `${r(12 * scale)}px`,
                paddingLeft: `${r(paddingHorizontal)}px`,
                paddingRight: `${r(paddingHorizontal)}px`,
                textAlign: 'center',
                color: theme === 'dark' ? '#EEEEEE' : '#333333',
                lineHeight: lineHeight,
                fontSize: `${scaledTextFontSize}px`,
                letterSpacing: letterSpacing === 0 ? 'normal' : `${scaledLetterSpacing}px`,
                fontStyle: 'italic'
              }}>
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word' }} dangerouslySetInnerHTML={{ __html: safeHtmlContent }} />
              </div>
            ) : (
              /* 2. 주사위 판정 디자인 (일반 대사형 + 볼드 + 결과에 따른 색상 변경) */
              (() => {
                // ★ 특정 단어에 따라 글자 색상을 결정합니다.
                let commandColor = theme === 'dark' ? 'inherit' : '#333333'; // 기본 텍스트 색상
                const contentStr = log.content;
                
                if (contentStr.includes('대성공') ) {
                  commandColor = '#ffbf00'; 
                } 
                else if (contentStr.includes('극단적 성공') ) {
                  commandColor = '#fc7300'; 
                }
                else if (contentStr.includes('대단한 성공') ){
                  commandColor = '#fc7300'; 
                }
                else if (contentStr.includes('어려운 성공') ) {
                  commandColor = '#00d617'; 
                }
                else if (contentStr.includes('보통 성공') ) {
                  commandColor = '#009af9'; 
                }
                else if (contentStr.includes('＞ 실패') ) {
                  commandColor = '#ff008f'; 
                }
                else if (contentStr.includes('＞ 대실패') ) {
                  commandColor = '#ff1000'; 
                }

                // 일반 대사(main)와 완벽하게 동일한 구조로 출력합니다.
                return (
                  <div key="command" className={cn(
                    log.isContinuation && "pt-1 border-t-0 rounded-t-none",
                    isNextContinuation && "pb-1 border-b-0 rounded-b-none"
                  )} style={{ 
                    display: 'flex',
                    gap: hideAllAvatars ? '16px' : `${gapSize}px`, 
                    paddingTop: log.isContinuation ? undefined : `${paddingVertical}px`,
                    paddingBottom: isNextContinuation ? undefined : `${mergeWithNext ? 4 : paddingVertical}px`,
                    paddingLeft: `${r(paddingHorizontal)}px`,
                    paddingRight: `${r(paddingHorizontal)}px`,
                    alignItems: 'flex-start',
                    background: isSecret ? getSecretBg(tabColor) : 'transparent',
                    borderLeft: 'none', 
              marginTop: isSecret ? (hasSpecialDividerAboveAndNoBadge ? '0' : (mergeWithPrev ? '0' : '4px')) : '0',
              marginBottom: isSecret ? (mergeWithNext ? '0' : (hasSpecialDividerBelow ? '0' : '4px')) : '0',
              marginLeft:  '0',
              marginRight: '0',
              borderRadius: '0'
            }}>
                    {hideAllAvatars ? (
                      <>
                        <div style={{ fontWeight: 'bold', color, fontSize: `${nameSize}px`, width: 'var(--name-col-width, 120px)', flexShrink: 0, textAlign: 'right' }}>
                          {!log.isContinuation && (
                            <span className="cursor-default" dangerouslySetInnerHTML={{ __html: safeHtmlName + ':' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, lineHeight: lineHeight, letterSpacing: letterSpacing === 0 ? 'normal' : `${scaledLetterSpacing}px` }}>
                          {/* ★ 대사 내용 부분 (볼드 + 조건부 색상 적용) */}
                          <div dangerouslySetInnerHTML={{ __html: safeHtmlContent }} style={{ color: commandColor, fontSize: `${scaledTextFontSize}px`, fontWeight: 'bold', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word' }} />
                        </div>
                      </>
                    ) : (
                      <>
                        {log.isContinuation ? (
                          <div style={{ width: `${avatarSize}px`, flexShrink: 0 }} />
                        ) : (
                          <LogAvatar 
  img={img} 
  theme={theme} 
  avatarSize={avatarSize} 
  hideEmptyAvatars={hideEmptyAvatars} 
  cropData={charSettings[log.charId]?.cropData}
  excludedCropUrls={charSettings[log.charId]?.excludedCropUrls} 
/>
                        )}
                        <div style={{ flexGrow: 1, lineHeight: lineHeight, letterSpacing: letterSpacing === 0 ? 'normal' : `${scaledLetterSpacing}px` }}>
                          {!log.isContinuation && (
                            <div 
                              className="relative inline-block"
                              style={{ fontWeight: 'bold', color, fontSize: `${nameSize}px`, marginBottom: Math.max(4, Math.ceil(scaledTextFontSize * (lineHeight >= 1.4 ? 0.3 : 0.5))) + 'px' }}
                            >
                              <span className="cursor-default" dangerouslySetInnerHTML={{ __html: safeHtmlName }} />
                            </div>
                          )}
                          {/* ★ 대사 내용 부분 (볼드 + 조건부 색상 적용) */}
                          <div dangerouslySetInnerHTML={{ __html: safeHtmlContent }} style={{ color: commandColor, fontSize: `${scaledTextFontSize}px`, fontWeight: 'bold', whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word' }} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })()
            )
          ) : isNarration ? (
            <div key="narration" className="narration-row" style={{ 
              paddingTop: log.isContinuation ? '0.4em' : `${r(12 * scale)}px`,
              paddingBottom: isNextContinuation ? '0.4em' : `${r(12 * scale)}px`,
              paddingLeft: `${r(paddingHorizontal)}px`,
              paddingRight: `${r(paddingHorizontal)}px`,
              textAlign: 'center',
              color: theme === 'dark' ? '#EEEEEE' : '#333333',
              lineHeight: lineHeight,
              fontSize: `${scaledTextFontSize}px`,
              letterSpacing: letterSpacing === 0 ? 'normal' : `${scaledLetterSpacing}px`,
              fontWeight: 'bold',
              fontStyle: 'italic'
            }}>
              {safeHtmlContentPieces.map((piece, pIdx) => (
                <React.Fragment key={`${log.id}-narration-${pIdx}`}>
                  {pIdx > 0 && <div style={{ marginTop: '0.8em' }}></div>}
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word' }} dangerouslySetInnerHTML={{ __html: piece }} />
                </React.Fragment>
              ))}
            </div>
        
          ) : format === 'info' ? (
            <div key="info" className={cn(
              log.isContinuation && "pt-1 border-t-0 rounded-t-none",
              isNextContinuation && "pb-1 border-b-0 rounded-b-none"
            )} style={{ 
              paddingTop: log.isContinuation ? undefined : `${r(12 * scale)}px`,
              paddingBottom: isNextContinuation ? undefined : `${r(mergeWithNext ? 4 : 12 * scale)}px`,
              paddingLeft: `${r(paddingHorizontal)}px`,
              paddingRight: `${r(paddingHorizontal)}px`,
              background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', 
              borderLeft: `7px solid ${theme === 'dark' ? '#444' : '#DDD'}`, 
              marginTop: hasSpecialDividerAboveAndNoBadge ? '0' : (mergeWithPrev ? '0' : '4px'),
              marginBottom: mergeWithNext ? '0' : (hasSpecialDividerBelow ? '0' : '4px'),
              marginLeft: `${r(paddingHorizontal)}px`,
              marginRight: `${r(paddingHorizontal)}px`,
              lineHeight: lineHeight, 
              letterSpacing: letterSpacing === 0 ? 'normal' : `${scaledLetterSpacing}px`
            }}>
              {!log.isContinuation && (
                <div className="relative inline-block" style={{ marginBottom: Math.max(4, Math.ceil(scaledTextFontSize * (lineHeight >= 1.4 ? 0.3 : 0.5))) + 'px' }}>
                  <span style={{ fontWeight: 'bold', color, display: 'block', fontSize: `${nameSize}px` }} className="cursor-default" dangerouslySetInnerHTML={{ __html: safeHtmlName }} />
                </div>
              )}
              <div dangerouslySetInnerHTML={{ __html: safeHtmlContent }} style={{ color: theme === 'dark' ? 'inherit' : '#333333', fontSize: `${scaledTextFontSize}px`, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word' }} />
            </div>
          ) : (
            <div key="main" className={cn(
              log.isContinuation && "pt-1 border-t-0 rounded-t-none",
              isNextContinuation && "pb-1 border-b-0 rounded-b-none"
            )} style={{ 
              display: 'flex',
              gap: hideAllAvatars ? '16px' : `${gapSize}px`, 
              paddingTop: log.isContinuation ? undefined : `${paddingVertical}px`,
              paddingBottom: isNextContinuation ? undefined : `${mergeWithNext ? 4 : paddingVertical}px`,
              paddingLeft: `${r(paddingHorizontal)}px`,
              paddingRight: `${r(paddingHorizontal)}px`,
              alignItems: 'flex-start',
              background: isSecret ? getSecretBg(tabColor) : 'transparent',
              borderLeft: 'none', 
              marginTop: isSecret ? (hasSpecialDividerAboveAndNoBadge ? '0' : (mergeWithPrev ? '0' : '4px')) : '0',
              marginBottom: isSecret ? (mergeWithNext ? '0' : (hasSpecialDividerBelow ? '0' : '4px')) : '0',
              marginLeft:  '0',
              marginRight: '0',
              borderRadius: '0'
            }}>
              {hideAllAvatars ? (
                <>
                  <div style={{ fontWeight: 'bold', color, fontSize: `${nameSize}px`, width: 'var(--name-col-width, 120px)', flexShrink: 0, textAlign: 'right' }}>
                    {!log.isContinuation && (
                      <span className="cursor-default" dangerouslySetInnerHTML={{ __html: safeHtmlName + ':' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, lineHeight: lineHeight, letterSpacing: letterSpacing === 0 ? 'normal' : `${scaledLetterSpacing}px` }}>
                    <div dangerouslySetInnerHTML={{ __html: safeHtmlContent }} style={{ color: theme === 'dark' ? 'inherit' : '#333333', fontSize: `${scaledTextFontSize}px`, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word' }} />
                  </div>
                </>
              ) : (
                <>
                  {log.isContinuation ? (
                    <div style={{ width: `${avatarSize}px`, flexShrink: 0 }} />
                  ) : (
                    <LogAvatar 
  img={img} 
  theme={theme} 
  avatarSize={avatarSize} 
  hideEmptyAvatars={hideEmptyAvatars} 
  cropData={charSettings[log.charId]?.cropData}
  excludedCropUrls={charSettings[log.charId]?.excludedCropUrls} 
/>
                  )}
                  <div style={{ flexGrow: 1, lineHeight: lineHeight, letterSpacing: letterSpacing === 0 ? 'normal' : `${scaledLetterSpacing}px` }}>
                    {!log.isContinuation && (
                      <div 
                        className="relative inline-block"
                        style={{ fontWeight: 'bold', color, fontSize: `${nameSize}px`, marginBottom: Math.max(4, Math.ceil(scaledTextFontSize * (lineHeight >= 1.4 ? 0.3 : 0.5))) + 'px' }}
                      >
                        <span className="cursor-default" dangerouslySetInnerHTML={{ __html: safeHtmlName }} />
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: safeHtmlContent }} style={{ color: theme === 'dark' ? 'inherit' : '#333333', fontSize: `${scaledTextFontSize}px`, whiteSpace: 'pre-wrap', wordBreak: 'keep-all', overflowWrap: 'break-word' }} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {renderBlocks(insertedBlocks, stableId)}

      {hasDividerBelow && !isSplit && (
        <div 
          style={{
            marginTop: `${r(dividerMarginTop * scale)}px`,
            marginBottom: `${r(dividerMarginBottom * scale)}px`,
            marginLeft: ((format === 'info' || format === 'secret') && mergeWithNext) ? `${r(paddingHorizontal)}px` : '0',
            marginRight: ((format === 'info' || format === 'secret') && mergeWithNext) ? `${r(paddingHorizontal)}px` : '0',
            background: ((format === 'info' || format === 'secret') && mergeWithNext) 
              ? (format === 'secret' ? getSecretBg(tabColor) : (theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)')) 
              : 'transparent',
            borderLeft: ((format === 'info' || format === 'secret') && mergeWithNext)
              ? (format === 'secret' ? `4px solid ${tabColor}` : `4px solid ${theme === 'dark' ? '#444' : '#DDD'}`)
              : 'none',
            paddingLeft: `${r(paddingHorizontal)}px`,
            paddingRight: `${r(paddingHorizontal)}px`
          }}
          className="w-full flex items-center justify-stretch pointer-events-none"
        >
          <div 
            className={cn(
              "w-full border-b-[1px]",
              theme === 'dark' 
                ? "border-white/8" 
                : "border-black/10"
            )}
          />
        </div>
      )}
    </div>
  );
});
