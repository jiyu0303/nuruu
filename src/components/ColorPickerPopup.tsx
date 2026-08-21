import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, Edit2, Pencil, ChevronsUpDown } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { cn, hexToRgbValues, rgbToHexValues, hexToHsl } from '../utils';
import { ColorPickerPopupProps } from '../types';

export const CharacterNameWithTooltip = ({ name }: { name: string }) => {
  const [isTruncated, setIsTruncated] = useState(false);
  const spanRef = useRef<HTMLSpanElement>(null);

  const checkTruncation = () => {
    if (spanRef.current) {
      setIsTruncated(spanRef.current.scrollWidth > spanRef.current.clientWidth);
    }
  };

  return (
    <div className="flex-1 min-w-0 relative group/tooltip">
      <span 
        ref={spanRef}
        onMouseEnter={checkTruncation}
        className="text-[10px] font-bold truncate block text-white cursor-default"
      >
        {name}
      </span>
      {isTruncated && (
        <div className="absolute left-0 bottom-full mb-1 px-2 py-1 bg-stone-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none z-[100] shadow-xl border border-white/10">
          {name}
        </div>
      )}
    </div>
  );
};

const DEFAULT_COLORS = [
  '#212121', '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
  '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
  '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b', '#9e9e9e', '#e0e0e0'
];

export const ColorPickerPopup = ({ color, extractedColors, triggerRect, onClose, onChange }: ColorPickerPopupProps) => {
  const [mode, setMode] = useState<'hex' | 'rgb' | 'hsl'>('hex');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedColor, setSelectedColor] = useState(color);
  const [tempColorInput, setTempColorInput] = useState(color);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const [isPositioned, setIsPositioned] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (popupRef.current && triggerRect) {
      const popupRect = popupRef.current.getBoundingClientRect();
      const popupWidth = popupRect.width;
      const popupHeight = popupRect.height;
      
      let top = triggerRect.bottom + 8;
      let left = triggerRect.left;

      // Check right edge
      if (left + popupWidth > window.innerWidth) {
        left = triggerRect.right - popupWidth;
      }
      
      // Check left edge
      if (left < 0) {
        left = 8;
      }

      // Check bottom edge
      if (top + popupHeight > window.innerHeight) {
        top = triggerRect.top - popupHeight - 8;
      }
      
      // Check top edge
      if (top < 0) {
        top = 8;
      }

      setPosition({ top, left });
      
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsPositioned(true);
        });
      });
    }
  }, [triggerRect]);

  const rgb = hexToRgbValues(selectedColor);
  const normalizeHex = (hex: string) => {
    if (!hex) return '';
    let h = hex.replace('#', '').toLowerCase();
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    return '#' + h;
  };
  const normalizedSelectedColor = normalizeHex(selectedColor);
  const normalizedDefaultColors = DEFAULT_COLORS.map(normalizeHex);
  const usedColors = Array.from(new Set(
    extractedColors
      .filter(c => c && typeof c === 'string')
      .map(normalizeHex)
  ));

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0" onClick={onClose} />
      <div 
        ref={popupRef}
        className={cn(
          "absolute p-3 bg-[#222] rounded-2xl shadow-2xl border border-white/10 w-[208px] space-y-3",
          isPositioned ? "animate-in fade-in zoom-in-95 duration-200" : "invisible opacity-0"
        )}
        style={{ 
          top: position.top, 
          left: position.left,
          transition: isPositioned ? undefined : 'none'
        }}
      >
        <div className="overflow-hidden rounded-lg">
          <div className="react-colorful-custom">
            <HexColorPicker
              color={selectedColor}
              onChange={(newColor) => {
                setSelectedColor(newColor);
                onChange(newColor);
              }}
            />
          </div>
        </div>

        {/* Edit Box */}
        <div className="flex items-center justify-between bg-[#1a1a1a] p-1.5 rounded-xl border border-white/5 shadow-inner">
          <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
            <div 
              className="w-6 h-6 rounded-md border border-white/10  shrink-0" 
              style={{ backgroundColor: selectedColor }} 
            />
            {isEditing ? (
              <div className="flex items-center flex-1 min-w-0">
                <input
                  type="text"
                  value={tempColorInput}
                  onChange={(e) => setTempColorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === 'Enter') {
                      let col = tempColorInput.trim();
                      if (mode === 'hex') {
                         if (!col.startsWith('#')) col = '#' + col;
                         if (/^#[0-9A-Fa-f]{6}$/.test(col)) {
                           setSelectedColor(col);
                           onChange(col);
                           setIsEditing(false);
                         }
                      } else {
                         // parse rgb
                         const parts = col.split(',').map(x => parseInt(x.trim()));
                         if (parts.length === 3 && parts.every(x => !isNaN(x) && x >= 0 && x <= 255)) {
                           const hex = '#' + parts.map(x => x.toString(16).padStart(2, '0')).join('');
                           setSelectedColor(hex);
                           onChange(hex);
                           setIsEditing(false);
                         }
                      }
                    }
                    if (e.key === 'Escape') {
                      setIsEditing(false);
                      setTempColorInput(mode === 'hex' ? selectedColor.toUpperCase() : `${rgb.r}, ${rgb.g}, ${rgb.b}`);
                    }
                  }}
                  className="w-full text-[10px] font-bold px-1.5 py-1 bg-black/40 border border-[#4799c7] rounded-md text-white outline-none"
                  autoFocus
                  onBlur={() => setIsEditing(false)}
                />
              </div>
            ) : (
              <span 
                className="text-[10px] font-bold text-white cursor-pointer hover:text-white/80 transition-colors truncate"
                onClick={() => {
                  setTempColorInput(mode === 'hex' ? selectedColor.toUpperCase() : `${rgb.r}, ${rgb.g}, ${rgb.b}`);
                  setIsEditing(true);
                }}
              >
                {mode === 'hex' ? selectedColor.toUpperCase() : `${rgb.r}, ${rgb.g}, ${rgb.b}`}
              </span>
            )}
          </div>
          <button 
            onClick={() => setMode(mode === 'hex' ? 'rgb' : 'hex')}
            className="w-6 h-6 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-md text-white/40 hover:text-white transition-colors shrink-0 group relative"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            <div className="absolute right-0 bottom-full mb-2 whitespace-nowrap bg-white text-black text-[10px] px-2 py-1 rounded shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all pointer-events-none">
              {mode === 'hex' ? 'RGB 모드로 전환' : 'HEX 모드로 전환'}
            </div>
          </button>
        </div>

        {/* Colors Area */}
        <div className="pt-3 border-t border-white/10 space-y-4">
          {usedColors.length > 0 && (
            <div className="space-y-2.5">
              <span className="text-[9px] font-bold text-white/50">사용중인 색상</span>
              <div className="grid grid-cols-7 gap-1.5">
                {usedColors.map(c => (
                  <button
                    key={`used-${c}`}
                    onClick={() => {
                      setSelectedColor(c);
                      onChange(c);
                    }}
                    className={cn(
                      "aspect-square rounded-full border transition-all ",
                      normalizedSelectedColor === c ? "border-white scale-110 z-10" : "border-white/10 hover:scale-110 active:scale-95"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            <span className="text-[9px] font-bold text-white/50">기본 색상</span>
            <div className="grid grid-cols-7 gap-1.5">
              {DEFAULT_COLORS.map(c => (
                <button
                  key={`default-${c}`}
                  onClick={() => {
                    setSelectedColor(c);
                    onChange(c);
                  }}
                  className={cn(
                    "aspect-square rounded-full border transition-all ",
                    normalizedSelectedColor === normalizeHex(c) ? "border-white scale-110 z-10" : "border-white/10 hover:scale-110 active:scale-95"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full py-1.5 bg-[#4799c7] hover:bg-[#2767a4] text-white rounded-xl text-[11px] font-bold transition-all shadow-lg active:scale-95"
        >
          확인
        </button>
      </div>
    </div>,
    document.body
  );
};
