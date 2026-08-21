import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';

interface Option {
  label: string;
  value: string;
  color?: string;
  isGrayed?: boolean;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  theme?: 'light' | 'dark';
  disabled?: boolean;
}

export const SearchableSelect = ({ 
  value, 
  onChange, 
  options,
  placeholder = "선택 안 함",
  className,
  theme = 'dark',
  disabled = false
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [dropUp, setDropUp] = useState(false);

  useEffect(() => {
    if (isOpen && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 250 && rect.top > spaceBelow) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = isOpen ? searchTerm : (selectedOption ? selectedOption.label : '');

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.nativeEvent.isComposing) return;
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        const targetIndex = (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) ? highlightedIndex : 0;
        if (targetIndex >= 0 && targetIndex < filteredOptions.length) {
          onChange(filteredOptions[targetIndex].value);
          setIsOpen(false);
          inputRef.current?.blur();
        }
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  useEffect(() => {
    setHighlightedIndex(0); // Reset highlight when search changes
  }, [searchTerm]);

  // Handle scrolling of highlighted item
  const listboxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isOpen && listboxRef.current && highlightedIndex >= 0) {
      const highlightedEl = listboxRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            if (disabled) return;
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={() => {
            if (disabled) return;
            setSearchTerm('');
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full text-[10px] px-2 py-1.5 pr-6 rounded-lg outline-none focus:border-[#4799c7] transition-colors font-medium",
            theme === 'dark'
              ? "bg-black/40 border border-white/10 text-white/80 placeholder:text-white/30"
              : "bg-white border border-stone-250 text-stone-800 placeholder:text-stone-400",
            disabled && "opacity-40 cursor-not-allowed pointer-events-none"
          )}
          style={selectedOption?.color && !isOpen ? { color: selectedOption.color } : undefined}
        />
        <ChevronDown className={cn(
          "w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none transition-transform", 
          theme === 'dark' ? "text-white/40" : "text-stone-400",
          isOpen && "rotate-180",
          disabled && "opacity-40"
        )} />
      </div>
      {isOpen && (
        <div 
          ref={listboxRef}
          className={cn(
            "absolute z-50 w-full border rounded-lg shadow-xl max-h-64 max-h-[min(260px,50vh)] overflow-y-auto custom-scrollbar",
            dropUp ? "bottom-full mb-1" : "top-full mt-1",
            theme === 'dark'
              ? "bg-[#1a1a1a] border-white/10"
              : "bg-white border-stone-200"
          )}
        >
          {filteredOptions.map((opt, idx) => (
            <div
              key={opt.value}
              className={cn(
                "px-2 py-1.5 text-[10px] cursor-pointer truncate transition-colors font-medium",
                theme === 'dark'
                  ? (idx === highlightedIndex ? "bg-white/10 text-white" : "text-white/80 hover:bg-[#4799c7] hover:text-white")
                  : (idx === highlightedIndex ? "bg-stone-100 text-stone-900" : "text-stone-700 hover:bg-[#4799c7] hover:text-white"),
                opt.value === '' && (theme === 'dark' ? "text-white/50" : "text-stone-400"), // Placeholder styling
                opt.isGrayed && (theme === 'dark' ? "text-white/30" : "text-stone-400")
              )}
              style={opt.color ? { color: opt.color } : undefined}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
          {filteredOptions.length === 0 && (
            <div className={cn(
              "px-2 py-1.5 text-[10px]",
              theme === 'dark' ? "text-white/40" : "text-stone-400"
            )}>결과 없음</div>
          )}
        </div>
      )}
    </div>
  );
};
