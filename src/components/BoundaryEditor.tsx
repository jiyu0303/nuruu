import React, { useState } from 'react';
import { Plus, X, ImageIcon, Scissors, MessageSquare } from 'lucide-react';
import { cn } from '../utils';
import { SectionNameEditor } from './SectionNameEditor';
import { useSettings } from '../contexts/SettingsContext';

interface BoundaryEditorProps {
  id: string;
  isTopLevel?: boolean;
  allowSplit?: boolean;
  onToggleSplit: () => void;
  onInsertImage: () => void;
  onInsertLog?: () => void;
  disabled?: boolean;
}

export const BoundaryEditor = React.memo(({
  id,
  isTopLevel,
  allowSplit = true,
  onToggleSplit,
  onInsertImage,
  onInsertLog,
  disabled = false,
  onDropIllustration,
}: BoundaryEditorProps & { onDropIllustration?: (illId: string) => void }) => {
  const { theme } = useSettings();
  const isDark = theme === 'dark';
  const [isClicked, setIsClicked] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleClick = (action: () => void) => {
    setIsClicked(true);
    action();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && onDropIllustration) {
      setIsDragOver(true);
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    if (disabled || !onDropIllustration) return;
    
    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.type === 'illustration' && data.id) {
          onDropIllustration(data.id);
        }
      }
    } catch(err) {}
  };
  
  return (
    <div 
      className={cn(
        "boundary-wrapper", 
        isTopLevel && "is-top-level", 
        isDark ? "dark" : "", 
        (isClicked || disabled) && "opacity-0 pointer-events-none",
        isDragOver && "is-drag-over bg-[#4799c7]/10"
      )}
      style={disabled ? { pointerEvents: 'none', opacity: 0 } : undefined}
      onMouseLeave={() => setIsClicked(false)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="boundary-line" />
      <div className="boundary-content">
        {allowSplit && (
          <button 
            disabled={isClicked}
            onClick={() => handleClick(onToggleSplit)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all  border pointer-events-auto",
              isDark ? "bg-[#222] border-white/10 text-white/80 hover:bg-[#4799c7] hover:border-[#4799c7] hover:text-white" : "bg-white border-stone-200 text-stone-600 hover:bg-[#4799c7] hover:border-[#4799c7] hover:text-white",
              isClicked && "cursor-default"
            )}
            title="이곳을 기준으로 새로운 단위(분할) 생성"
          >
            <Scissors className="w-3 h-3" />
            <span>분할</span>
          </button>
        )}
        <button 
          disabled={isClicked}
          onClick={() => handleClick(onInsertImage)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all  border pointer-events-auto",
            isDark ? "bg-[#222] border-white/10 text-white/80 hover:bg-[#4799c7] hover:border-[#4799c7] hover:text-white" : "bg-white border-stone-200 text-stone-600 hover:bg-[#4799c7] hover:border-[#4799c7] hover:text-white",
            isClicked && "cursor-default"
          )}
          title="삽화 삽입"
        >
          <ImageIcon className="w-3 h-3" />
          <span>삽화</span>
        </button>
        {onInsertLog && (
          <button 
            disabled={isClicked}
            onClick={() => handleClick(onInsertLog)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all  border pointer-events-auto",
              isDark ? "bg-[#222] border-white/10 text-white/80 hover:bg-[#4799c7] hover:border-[#4799c7] hover:text-white" : "bg-white border-stone-200 text-stone-600 hover:bg-[#4799c7] hover:border-[#4799c7] hover:text-white",
              isClicked && "cursor-default"
            )}
            title="새 대사 추가"
          >
            <Plus className="w-3 h-3" />
            <span>대사 추가</span>
          </button>
        )}
      </div>
    </div>
  );
});
