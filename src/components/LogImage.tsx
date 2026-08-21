import React, { useState, useEffect } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Trash2, Image as ImageIcon } from 'lucide-react';
import { cn, r } from '../utils';
import { useSettings } from '../contexts/SettingsContext';
import { SearchableSelect } from './SearchableSelect';

const parseWidthAndUnit = (val: string) => {
  if (!val) return { num: '', unit: 'px' };
  const str = String(val).trim();
  const numericMatch = str.match(/^(\d+)(%|px)$/i);
  if (numericMatch) {
    return { num: numericMatch[1], unit: numericMatch[2].toLowerCase() };
  }
  const numPart = str.replace(/\D/g, '');
  const hasPercent = str.includes('%');
  const unit = hasPercent ? '%' : 'px';
  return { num: numPart, unit };
};

export const LogImage = React.memo(({ 
  url, 
  width, 
  align = 'center', 
  onDelete, 
  onUpdateWidth, 
  onUpdateAlign, 
  paddingSize,
  tabOverride,
  onUpdateTabOverride
}: any) => {
  const [hasError, setHasError] = useState(false);
  const { num: initialNum, unit: initialUnit } = parseWidthAndUnit(width);
  const [widthNum, setWidthNum] = useState(initialNum);
  const [widthUnit, setWidthUnit] = useState(initialUnit);
  const { tabSettings, tabOrder } = useSettings();

  useEffect(() => {
    const { num, unit } = parseWidthAndUnit(width);
    setWidthNum(num);
    setWidthUnit(unit);
  }, [width]);

  const handleUpdate = (num: string, unit: string) => {
    if (!num) {
      onUpdateWidth('');
      return;
    }
    onUpdateWidth(`${num}${unit}`);
  };

  return (
    <div style={{ 
      margin: `10px ${r(paddingSize * 1.3)}px`, 
      position: 'relative',
      display: 'flex',
      justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      minHeight: '44px',
      width: '100%'
    }} className="group/img min-h-[44px] w-full">
      {hasError ? (
        <div className="flex flex-col items-center justify-center p-6 mx-auto bg-red-500/10 border border-red-500/20 rounded-xl gap-2 w-full max-w-md">
          <div className="text-red-400/40">
            <ImageIcon className="w-8 h-8" />
          </div>
          <div className="text-[11px] font-bold text-red-400">잘못된 URL입니다</div>
          <div className="text-[9px] text-red-400/60 break-all px-4 text-center">{url}</div>
        </div>
      ) : (
        <div style={{
          display: 'block',
          position: 'relative',
          minHeight: '44px',
          maxWidth: '100%',
          width: width ? (isNaN(Number(width)) ? width : `${width}px`) : 'auto',
        }} className="flex items-start justify-center">
          <img 
            src={url} 
            alt="" 
            style={{ 
              maxWidth: '100%', 
              width: '100%',
              height: 'auto',
              borderRadius: '8px',
              display: 'block'
            }} 
            onError={() => setHasError(true)}
            referrerPolicy="no-referrer"
          />
        </div>
      )}
      
      {/* 툴바 - 무조건 좌측 상단에 고정, Hover시 표시 */}
      <div className="absolute top-1 left-1 right-1 flex justify-between opacity-0 group-hover/img:opacity-100 transition-opacity z-20 items-center pointer-events-none">
        <div className="flex gap-1 items-center pointer-events-auto">
          {onUpdateTabOverride && (
            <div className="h-7 px-2 flex items-center bg-stone-950 text-white rounded-lg border border-white/20 shadow-xl gap-1 shrink-0">
              <span className="text-[10px] text-white/50 font-bold shrink-0">탭:</span>
              <div className="w-[84px] h-full flex items-center [&_input]:bg-stone-950 [&_input]:border-none [&_input]:p-0 [&_input]:h-full [&_input]:w-full [&_input]:text-white">
                <SearchableSelect
                  value={tabOverride || 'auto'}
                  onChange={onUpdateTabOverride}
                  options={[
                    { label: '자동', value: 'auto', color: '#a3a3a3' },
                    ...(tabOrder || Object.keys(tabSettings)).map((tId: string) => {
                      const tab = tabSettings[tId];
                      return { label: tab?.name || tId, value: tId, color: tab?.color };
                    })
                  ]}
                  className="text-[10px]"
                  theme="dark"
                />
              </div>
            </div>
          )}

          <div className="flex items-center h-7 bg-stone-950 rounded-lg overflow-hidden border border-white/20 shadow-xl shrink-0">
            {/* 정렬 위치 선택 */}
            <div className="flex border-r border-white/10 h-full items-center bg-black/20">
              <button 
                onClick={() => onUpdateAlign('left')} 
                className={cn("p-1.5 h-full flex items-center justify-center hover:bg-white/10 transition-colors", align === 'left' ? "text-[#4799c7]" : "text-white/40")}
                title="좌측 정렬"
              >
                <AlignLeft className="w-3 h-3" />
              </button>
              <button 
                onClick={() => onUpdateAlign('center')} 
                className={cn("p-1.5 h-full flex items-center justify-center hover:bg-white/10 transition-colors", align === 'center' ? "text-[#4799c7]" : "text-white/40")}
                title="중앙 정렬"
              >
                <AlignCenter className="w-3 h-3" />
              </button>
              <button 
                onClick={() => onUpdateAlign('right')} 
                className={cn("p-1.5 h-full flex items-center justify-center hover:bg-white/10 transition-colors", align === 'right' ? "text-[#4799c7]" : "text-white/40")}
                title="우측 정렬"
              >
                <AlignRight className="w-3 h-3" />
              </button>
            </div>
            
            {/* 가로폭 수치 입력 */}
            <input 
              type="text"
              value={widthNum}
              onChange={(e) => {
                const val = e.target.value;
                setWidthNum(val);
                handleUpdate(val, widthUnit);
              }}
              onBlur={() => handleUpdate(widthNum, widthUnit)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') handleUpdate(widthNum, widthUnit);
              }}
              placeholder="너비"
              className="w-12 h-full bg-transparent text-[10px] text-white px-1.5 outline-none placeholder:text-white/30 font-mono font-bold text-center"
            />

            {/* 단위 가로 정렬 토글러 (% / px) */}
            <div className="flex border-l border-white/10 h-full items-center bg-black/20">
              <button
                type="button"
                onClick={() => {
                  setWidthUnit('%');
                  handleUpdate(widthNum, '%');
                }}
                className={cn(
                  "px-2 h-full flex items-center justify-center text-[9px] font-mono font-bold transition-all border-r border-white/5",
                  widthUnit === '%' ? "bg-[#4799c7] text-white" : "text-white/40 hover:text-white/70"
                )}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => {
                  setWidthUnit('px');
                  handleUpdate(widthNum, 'px');
                }}
                className={cn(
                  "px-2 h-full flex items-center justify-center text-[9px] font-mono font-bold transition-all",
                  widthUnit === 'px' ? "bg-[#4799c7] text-white" : "text-white/40 hover:text-white/70"
                )}
              >
                px
              </button>
            </div>
          </div>
        </div>

        {onDelete && (
          <button 
            onClick={onDelete}
            className={cn(
              "p-1 rounded border shadow-xl backdrop-blur-sm transition-colors w-7 h-7 flex items-center justify-center shrink-0 pointer-events-auto",
              "bg-stone-950/85 text-white/50 hover:text-red-400 border-white/20 hover:bg-stone-900"
            )}
            title="삽입 취소"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
});
