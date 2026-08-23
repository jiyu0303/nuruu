/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createPortal } from 'react-dom';
import { Analytics } from "@vercel/analytics/react";
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { 
  Scissors,
  Check,
  X,
  Upload, 
  Download, 
  Settings, 
  Eye, 
  Image as ImageIcon, 
  Palette, 
  CheckSquare, 
  Square,
  FileJson,
  Layout,
  MessageSquare,
  Trash2,
  Plus,
  Type,
  Scaling,
  Pencil,
  Undo2,
  Redo2,
  RotateCcw,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  FileText,
  ChevronsUpDown,
  Users,
  User,
  ImageOff,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
  ExternalLink,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Search,
  List,
  Info,
  FileDown,
  Settings2,
  UnfoldVertical,
  UnfoldHorizontal,
  MoveVertical,
  Maximize2,
  MoveHorizontal,
  MapPin,
  ArrowUp,
  ArrowDown,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';
import { TabFormat, LogEntry, CharSetting, TabSetting, CharacterLibraryItem, Illustration } from './types';
import { parseLogFile } from './parser';
import { cn, r, rgbToHex, getFileNameFromUrl } from './utils';
import { extractOldFormat, InsertedBlock, migrateToInsertedBlocks } from './utils/migration';
import { Toggle } from './components/Toggle';
import { LogItem } from './components/LogItem';
import { SearchableSelect } from './components/SearchableSelect';
import { SectionNameEditor } from './components/SectionNameEditor';
import { CharacterNameWithTooltip, ColorPickerPopup } from './components/ColorPickerPopup';
import { generateFinalHtmlStr } from './utils/htmlGenerator';
import { fonts } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import { SettingsProvider } from './contexts/SettingsContext';
const Tooltip = ({ children, content, position = 'top', className, unstyled = false }: {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  unstyled?: boolean;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, opacity: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const margin = 8;
    let top = triggerRect.top - tooltipRect.height - margin;
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
    if (position === 'bottom') top = triggerRect.bottom + margin;
    if (position === 'left') { top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2); left = triggerRect.left - tooltipRect.width - margin; }
    if (position === 'right') {
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + margin;
    }

    if (left < margin) left = margin;
    else if (left + tooltipRect.width > window.innerWidth - margin) {
      left = window.innerWidth - tooltipRect.width - margin;
    }
    
    if (top < margin) top = margin;
    else if (top + tooltipRect.height > window.innerHeight - margin) {
      top = window.innerHeight - tooltipRect.height - margin;
    }

    setCoords({ top, left, opacity: 1 });
  }, [position]);

  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        updatePosition();
      }, 0);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    } else {
      setCoords(prev => ({ ...prev, opacity: 0 }));
    }
  }, [isVisible, updatePosition]);

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onFocus={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onBlur={() => setIsVisible(false)}
        className={cn("inline-flex", !unstyled && "cursor-help")}
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div 
          ref={tooltipRef}
          style={{ 
            top: coords.top, 
            left: coords.left, 
            opacity: coords.opacity,
            transition: 'opacity 0.2s',
            visibility: coords.opacity === 0 ? 'hidden' : 'visible'
          }}
          className={unstyled ? `fixed z-[9999] pointer-events-none ${className || ''}` : cn("fixed z-[9999] bg-[#1a1a1a] border border-white/10 rounded-xl p-3 text-[11px] leading-relaxed text-white/60 shadow-2xl pointer-events-none w-max max-w-xs font-normal text-left break-keep", className)}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};

const NumberAdjuster = ({ label, min, max, step, value, onChange, unit = '', highlightDefault = null, hideReset = false, icon: Icon, tooltip, rightElement, onSave }: {
  label?: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void; unit?: string;
  highlightDefault?: number | null; hideReset?: boolean; icon?: React.ComponentType<{ className?: string }>;
  tooltip?: React.ReactNode; rightElement?: React.ReactNode; onSave?: (value: number) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value.toString());
  const isChanged = highlightDefault !== null && value !== highlightDefault;
  const handleBlur = () => {
    const nextValue = Math.min(max, Math.max(min, Number(tempVal) || min));
    onChange(nextValue); onSave?.(nextValue); setIsEditing(false);
  };
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between min-h-[20px]">
        {label ? <div className="flex items-center gap-1"><span className="text-[10px] text-white/70">{label}</span>{tooltip && <Tooltip content={tooltip}>{Icon && <Icon className="w-3 h-3 text-white/30" />}</Tooltip>}</div> : <div />}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1.5 bg-black/20 rounded-md p-0.5 border border-white/5">
            <button onClick={() => onChange(Number(Math.max(min, value - step).toFixed(1)))} className="p-1 hover:bg-white/10 rounded text-white/40"><ChevronDown className="w-3 h-3" /></button>
            {isEditing ? <input autoFocus value={tempVal} onChange={e => setTempVal(e.target.value)} onBlur={handleBlur} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} className="w-9 text-center text-[10px] bg-black/40" /> : <span onClick={() => { setIsEditing(true); setTempVal(value.toString()); }} className={cn("text-[10px] font-bold min-w-[28px] text-center cursor-pointer", isChanged && "text-[#499bc8]")}>{value > 0 && label === '자간' ? `+${value}` : value}{unit}</span>}
            <button onClick={() => onChange(Number(Math.min(max, value + step).toFixed(1)))} className="p-1 hover:bg-white/10 rounded text-white/40"><ChevronUp className="w-3 h-3" /></button>
          </div>
          {highlightDefault !== null && !hideReset && <button onClick={() => onChange(highlightDefault)} disabled={!isChanged} className="p-1 text-white/40"><RotateCcw className="w-3.5 h-3.5" /></button>}
          {rightElement}
        </div>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} className={cn("w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer", isChanged ? "accent-[#499bc8]" : "accent-white/70")} />
    </div>
  );
};

const Section = ({ children }: { children: React.ReactNode }) => (
  <section className="space-y-3">{children}</section>
);

const SectionTitle = ({ icon: Icon, title, tooltip, rightElement }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tooltip?: React.ReactNode;
  rightElement?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2 min-h-[24px]">
    <div className="flex items-center gap-1.5 min-w-0">
      <Icon className="w-3.5 h-3.5 text-[#499bc8] shrink-0" />
      <span className="text-[11px] font-bold text-white/80 truncate">{title}</span>
      {tooltip && <Tooltip content={tooltip}><Info className="w-3 h-3 text-white/30" /></Tooltip>}
    </div>
    {rightElement}
  </div>
);

const PortalDropdown = ({ isOpen, onClose, triggerRef, children, position = 'bottom-right' }: { isOpen: boolean, onClose: () => void, triggerRef: React.RefObject<HTMLElement>, children: React.ReactNode, position?: 'bottom-right' | 'right' }) => {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isCalculated, setIsCalculated] = useState(false);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !dropdownRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    
    let top = triggerRect.top;
    let left = triggerRect.right + 4;

    if (position === 'bottom-right') {
      top = triggerRect.bottom + 4;
      if (top + dropdownRect.height > window.innerHeight - 10) {
        top = triggerRect.top - dropdownRect.height - 4;
      }
      left = triggerRect.right - dropdownRect.width;
    } else if (position === 'right') {
      top = triggerRect.top;
      if (top + dropdownRect.height > window.innerHeight - 10) {
        top = window.innerHeight - dropdownRect.height - 10;
      }
      if (left + dropdownRect.width > window.innerWidth - 10) {
        left = triggerRect.left - dropdownRect.width - 4;
      }
    }

    setCoords({
      top,
      left
    });
    setIsCalculated(true);
  }, [triggerRef, position]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const timer = setTimeout(updatePosition, 0);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    } else {
      setIsCalculated(false);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      // Find the library dropdown ref element by looking through the path
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose, triggerRef]);

  // Instead of completely unmounting, we keep it mounted but hidden initially, 
  // or return null only when isOpen is entirely false and animation not needed.
  if (!isOpen) return null;

  return createPortal(
    <div
      ref={dropdownRef}
      style={{ 
        top: coords.top, 
        left: coords.left,
        visibility: isCalculated ? 'visible' : 'hidden',
        opacity: isCalculated ? 1 : 0
      }}
      className="fixed z-[9999]"
      onClick={e => e.stopPropagation()}
    >
      {children}
    </div>,
    document.body
  );
};

const SizeControl = ({ value, onChange }: { value: string; onChange: (val: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const numericMatch = (value || '100%').match(/^(\d+)(%|px)$/);
  const numVal = numericMatch ? numericMatch[1] : (value || '100').replace(/\D/g, '') || '100';
  const unitVal = (value || '%').includes('px') ? 'px' : '%';

  const presets = unitVal === '%' ? ['100%', '80%', '50%'] : ['400px', '300px', '200px'];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUnitChange = (newUnit: '%' | 'px') => {
    if (newUnit === unitVal) return;
    if (newUnit === '%') {
      const num = Number(numVal);
      const nextNum = num > 100 ? 100 : num;
      onChange(`${nextNum}%`);
    } else {
      const num = Number(numVal);
      const nextNum = num <= 100 ? (num === 100 ? 400 : num * 4) : num;
      onChange(`${nextNum}px`);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {/* Combobox: Input + Dropdown Arrow */}
      <div ref={ref} className="relative flex items-center bg-black/20 rounded-lg h-7 border border-white/10 focus-within:border-[#499bc8] transition-colors">
        <input
          type="text"
          value={numVal}
          onChange={(e) => {
            const raw = e.target.value.replace(/\D/g, '');
            onChange(raw ? `${raw}${unitVal}` : `100${unitVal}`);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-12 h-full text-center text-[10px] font-mono font-bold bg-transparent border-none outline-none text-white px-1 placeholder:text-white/30"
          placeholder="100"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="h-full px-1.5 flex items-center justify-center text-white/40 hover:text-white border-l border-white/5 transition-colors"
          title="프리셋 목록"
        >
          <ChevronDown className="w-3 h-3" />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-24 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2 py-0.5 text-[8px] font-bold text-white/30 uppercase tracking-wider">프리셋</div>
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  onChange(preset);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-2.5 py-1 text-[10px] font-mono font-bold hover:bg-white/10 transition-colors flex items-center justify-between",
                  value === preset ? "text-[#499bc8] bg-white/5" : "text-white/80"
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown 우측 단위 선택 버튼 (% / px) */}
      <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5 h-7 items-center">
        <button
          type="button"
          onClick={() => handleUnitChange('%')}
          className={cn(
            "h-6 px-2 text-[9px] font-mono font-bold rounded transition-all flex items-center justify-center",
            unitVal === '%' 
              ? "bg-white/10 text-white font-bold" 
              : "text-white/30 hover:text-white/60"
          )}
        >
          %
        </button>
        <button
          type="button"
          onClick={() => handleUnitChange('px')}
          className={cn(
            "h-6 px-2 text-[9px] font-mono font-bold rounded transition-all flex items-center justify-center",
            unitVal === 'px' 
              ? "bg-white/10 text-white font-bold" 
              : "text-white/30 hover:text-white/60"
          )}
        >
          px
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [isCcfoliaModalOpen, setIsCcfoliaModalOpen] = useState(false);
  const [ccfoliaRoomUrl, setCcfoliaRoomUrl] = useState('');
  const [isCcfoliaLoading, setIsCcfoliaLoading] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDraggingIllustration, setIsDraggingIllustration] = useState(false);
  const [isTitleEditing, setIsTitleEditing] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [tempTitle, setTempTitle] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isTocHovered, setIsTocHovered] = useState(false);

  // Sync tempTitle when pageTitle changes (e.g. from history)
  useEffect(() => {
    setTempTitle(pageTitle);
  }, [pageTitle]);

  // Reset room link when the integration popup closes
  useEffect(() => {
    if (!isCcfoliaModalOpen) {
      setCcfoliaRoomUrl('');
    }
  }, [isCcfoliaModalOpen]);

  // Illustrations Bulk Import Modal States
  const [isIllBulkModalOpen, setIsIllBulkModalOpen] = useState(false);
  const [illBulkUrl, setIllBulkUrl] = useState('');
  const [isIllBulkLoading, setIsIllBulkLoading] = useState(false);
  const [illBulkImages, setIllBulkImages] = useState<{ url: string; fileName: string; ext: string }[]>([]);
  const [selectedIllBulkImages, setSelectedIllBulkImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isIllBulkModalOpen) {
      setIllBulkUrl('');
      setIllBulkImages([]);
      setSelectedIllBulkImages({});
    }
  }, [isIllBulkModalOpen]);

const [isLocked, setIsLocked] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');

  const [originalFileName, setOriginalFileName] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cropModal, setCropModal] = useState({ isOpen: false, charId: '', imageUrl: '', crop: { x: 0, y: 0 }, zoom: 1 });
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<any>(null);
  const [charSettings, setCharSettings] = useState<Record<string, CharSetting>>({});
  const [charOrder, setCharOrder] = useState<string[]>([]);
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const [extractedColors, setExtractedColors] = useState<string[]>([]);
  const [tabSettings, setTabSettings] = useState<Record<string, TabSetting>>({});
  const [rememberSettings, setRememberSettings] = useLocalStorage<boolean>('ccfolia_rememberSettings', true);

  const illustrations = useMemo<Illustration[]>(() => {
    return logs
      .map((log, idx) => ({ log, idx }))
      .filter(({ log }) => log.isIllustration === true)
      .map(({ log, idx }) => ({
        id: log.id,
        url: log.content,
        imageName: log.imageName,
        afterLogIndex: log.isUnplaced ? null : idx,
        tabOverride: log.tabOverride || 'auto',
        width: log.width,
        align: log.align || 'center'
      }));
  }, [logs]);
  
  const [cssFormat, setCssFormat] = useLocalStorage<'inline' | 'internal'>('ccfolia_cssFormat', 'internal', undefined, undefined, rememberSettings);
  const [fontSize, setFontSize] = useLocalStorage<number>('ccfolia_fontSize', 14, undefined, undefined, rememberSettings);
  const [textFontSize, setTextFontSize] = useLocalStorage<number>('ccfolia_textFontSize', 14, undefined, undefined, rememberSettings);
  const [lineHeight, setLineHeight] = useLocalStorage<number>('ccfolia_lineHeight', 1.6, undefined, undefined, rememberSettings);
  const [letterSpacing, setLetterSpacing] = useLocalStorage<number>('ccfolia_letterSpacing', 0, undefined, undefined, rememberSettings);
  const [blockSpacing, setBlockSpacing] = useLocalStorage<number>('ccfolia_blockSpacing', 2, undefined, undefined, rememberSettings);
  const [contentPadding, setContentPadding] = useLocalStorage<number>('ccfolia_contentPadding', 12, undefined, undefined, rememberSettings);
  const [avatarSizeValue, setAvatarSizeValue] = useLocalStorage<number>('ccfolia_avatarSizeValue', 46, undefined, undefined, rememberSettings);
  const [isAdvancedLayoutOpen, setIsAdvancedLayoutOpen] = useState(false);
  const [fontFamily, setFontFamily] = useLocalStorage<string>('ccfolia_fontFamily', 'Noto Sans KR', undefined, undefined, rememberSettings);
  const [theme, setTheme] = useLocalStorage<'dark' | 'light'>('ccfolia_theme', 'dark', undefined, undefined, rememberSettings);
  const [darkBgColor, setDarkBgColor] = useLocalStorage<string>('ccfolia_darkBgColor', '#212121', undefined, undefined, rememberSettings);
  const [lightBgColor, setLightBgColor] = useLocalStorage<string>('ccfolia_lightBgColor', '#ffffff', undefined, undefined, rememberSettings);
  const [disableOtherColor, setDisableOtherColor] = useLocalStorage<boolean>('ccfolia_disableOtherColor', true, undefined, undefined, rememberSettings);
  const [filterBarMode, setFilterBarMode] = useLocalStorage<'none' | 'floating' | 'fixed'>('ccfolia_filterBarMode', 'none', undefined, undefined, rememberSettings);
  const [defaultIllWidth, setDefaultIllWidth] = useLocalStorage<string>('ccfolia_defaultIllWidth', '100%', undefined, undefined, rememberSettings);
  const [defaultIllAlign, setDefaultIllAlign] = useLocalStorage<'left' | 'center' | 'right'>('ccfolia_defaultIllAlign', 'center', undefined, undefined, rememberSettings);
  const [isEditingFontSize, setIsEditingFontSize] = useState(false);
  const [renamingChar, setRenamingChar] = useState<string | null>(null);
  const [renamingTab, setRenamingTab] = useState<string | null>(null);
  const [newNameInput, setNewNameInput] = useState('');
  const [newTabNameInput, setNewTabNameInput] = useState('');
  const [newCharName, setNewCharName] = useState('');
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [colorPickerRect, setColorPickerRect] = useState<DOMRect | null>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'tabs' | 'chars' | 'illustrations' | 'settings'>('files');
  const [isBulkSettingsExpanded, setIsBulkSettingsExpanded] = useState(false);
  const scrollPositions = useRef<Record<string, number>>({});
  const sidebarScrollRef = useRef<HTMLDivElement>(null);

  const [mobileTab, setMobileTab] = useState<'settings' | 'preview'>('settings');
  const [charSortMode, setCharSortMode] = useState<'appearance' | 'alphabetical'>('appearance');
  const [tabSortMode, setTabSortMode] = useState<'appearance' | 'alphabetical'>('appearance');
  const [isNarrationDropdownOpen, setIsNarrationDropdownOpen] = useState(false);
  const narrationDropdownRef = useRef<HTMLDivElement>(null);
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [hoverImgRect, setHoverImgRect] = useState<DOMRect | null>(null);
  const [hoverImgUrl, setHoverImgUrl] = useState<string | null>(null);
  const [hoverImgLabel, setHoverImgLabel] = useState<string | null>(null);

  const { widthNum, widthUnit } = useMemo(() => {
    const numericMatch = (defaultIllWidth || '100%').match(/^(\d+)(%|px)$/);
    if (numericMatch) {
      return { widthNum: numericMatch[1], widthUnit: numericMatch[2] as '%' | 'px' };
    }
    const numPart = (defaultIllWidth || '100').replace(/\D/g, '') || '100';
    const unitPart = (defaultIllWidth || '%').includes('px') ? 'px' : '%';
    return { widthNum: numPart, widthUnit: unitPart as '%' | 'px' };
  }, [defaultIllWidth]);

  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [saveOptions, setSaveOptions] = useLocalStorage<{
    tabs: boolean;
    chars: boolean;
    design: boolean;
    splits: boolean;
    images: boolean;
    edits: boolean;
  }>('ccfolia_saveOptions', {
    tabs: true,
    chars: true,
    design: true,
    splits: true,
    images: true,
    edits: true
  }, undefined, undefined, rememberSettings);

  const [insertedBlocks, setInsertedBlocks] = useState<Record<string, InsertedBlock[]>>({});
  const [imageInputLoc, setImageInputLoc] = useState<{ logId: string; insertIndex: number } | null>(null);

  const { insertedImages, splitPoints: splitPointsArr, sectionNames } = useMemo(() => extractOldFormat(insertedBlocks), [insertedBlocks]);
  const splitPoints = useMemo(() => new Set(splitPointsArr), [splitPointsArr]);

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [initialState, setInitialState] = useState<any>(null);
  const [isLibraryAccordionOpen, setIsLibraryAccordionOpen] = useState(false);
  const [openLibraryDropdownId, setOpenLibraryDropdownId] = useState<string | null>(null);
  const [hoverLibraryDropdownId, setHoverLibraryDropdownId] = useState<string | null>(null);
  const [librarySortMode, setLibrarySortMode] = useLocalStorage<'newest' | 'oldest' | 'alphabetical'>('ccfolia_librarySortMode', 'newest', undefined, undefined, rememberSettings);
  const [isLibraryEditMode, setIsLibraryEditMode] = useState(false);
  const [renamingLibraryId, setRenamingLibraryId] = useState<string | null>(null);
  const [libraryNameInput, setLibraryNameInput] = useState('');
  const libraryDropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedCropRef, setSelectedCropRef] = useState<Record<string, string>>({});
  const [cropExcludedExpressions, setCropExcludedExpressions] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (narrationDropdownRef.current && !narrationDropdownRef.current.contains(target)) {
        setIsNarrationDropdownOpen(false);
      }
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(target)) {
        setIsFontDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setIsFilterDropdownOpen(false);
      }
      if (libraryDropdownRef.current && !libraryDropdownRef.current.contains(target)) {
        setOpenLibraryDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [characterLibrary, setCharacterLibrary] = useState<CharacterLibraryItem[]>(() => {
    try {
      const saved = localStorage.getItem('characterLibrary');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('characterLibrary', JSON.stringify(characterLibrary));
  }, [characterLibrary]);
  
  const [mergeTabs, setMergeTabs] = useLocalStorage<Set<TabFormat>>(
    'ccfolia_mergeTabs',
    new Set(['main', 'secret', 'other']),
    (val) => { try { return new Set(JSON.parse(val)); } catch { return new Set(['main', 'secret', 'other']); } },
    (val) => JSON.stringify(Array.from(val)),
    rememberSettings
  );

  const [showTabNames, setShowTabNames] = useLocalStorage<Set<TabFormat>>(
    'ccfolia_showTabNames',
    new Set(['secret']),
    (val) => { try { return new Set(JSON.parse(val)); } catch { return new Set(['secret']); } },
    (val) => JSON.stringify(Array.from(val)),
    rememberSettings
  );

  const [mergeTabStyles, setMergeTabStyles] = useLocalStorage<Set<TabFormat>>(
    'ccfolia_mergeTabStyles',
    new Set(['secret']),
    (val) => { try { return new Set(JSON.parse(val)); } catch { return new Set(['secret']); } },
    (val) => JSON.stringify(Array.from(val)),
    rememberSettings
  );

  const [hideEmptyAvatars, setHideEmptyAvatars] = useLocalStorage<boolean>('ccfolia_hideEmptyAvatars', false, undefined, undefined, rememberSettings);
  const [hideAllAvatars, setHideAllAvatars] = useLocalStorage<boolean>('ccfolia_hideAllAvatars', false, undefined, undefined, rememberSettings);
  const [enableSentenceSpacing, setEnableSentenceSpacing] = useLocalStorage<boolean>('ccfolia_enableSentenceSpacing', false, undefined, undefined, rememberSettings);
  const [narrationCharacter, setNarrationCharacter] = useState<string | null>(null);
  const [showLogDivider, setShowLogDivider] = useLocalStorage<boolean>('ccfolia_showLogDivider', false, undefined, undefined, rememberSettings);
  const [imageInputIdx, setImageInputIdx] = useState<string | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [listOffset, setListOffset] = useState(0);

  // History for Undo/Redo
  const [history, setHistory] = useState<any[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Inject fonts into document head
  useEffect(() => {
    const styleId = 'global-fonts-import';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    const fontImports = fonts.map(f => f.import).filter(Boolean).join('\n');
    styleEl.innerHTML = fontImports;
  }, []);

 

  // 2. PC(컴퓨터)에서 표정 파일을 직접 업로드하는 함수
  const handleAddFileExpression = (charId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*'; 
    input.multiple = true; // 💡 여러 장을 동시에 선택할 수 있도록 속성 추가!
    
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files) as File[];
      if (files.length === 0) return;

      // 💡 여러 개의 파일을 동시에 읽어들이기 위해 Promise.all 사용
      const newExpressions: { label: string, url: string }[] = await Promise.all(
        files.map(file => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              // 파일 이름에서 확장자(.png, .jpg 등)를 제거하여 표정 이름으로 자동 지정
              let label = file.name.replace(/\.[^/.]+$/, "").trim();
              // 앞에 @가 안 붙어있으면 자동으로 붙여주기 (선택 사항)
              if (!label.startsWith('@')) label = '@' + label;
              
              resolve({ label, url: dataUrl });
            };
            reader.readAsDataURL(file);
          });
        })
      );

      // 읽어들인 여러 장의 이미지를 캐릭터 데이터에 일괄 병합
      const nextSettings = { ...charSettings };
      const char = nextSettings[charId];
      const currentExprs = (char as any).expressions || [];
      
      nextSettings[charId] = {
        ...char,
        imageUrl: char.imageUrl || newExpressions[0].url, // 프사가 비어있었다면 첫 번째 사진을 대표 프사로 지정
        expressions: [...currentExprs, ...newExpressions]
      } as any;

      setCharSettings(nextSettings);
      saveToHistory({ charSettings: nextSettings });
    };
    input.click();

  };

  const handleCcfoliaRoomFetch = async () => {
    if (!ccfoliaRoomUrl) return;

    const roomIdMatch = ccfoliaRoomUrl.trim().match(/rooms\/([a-zA-Z0-9_-]+)/) || ccfoliaRoomUrl.trim().match(/([a-zA-Z0-9_-]{5,20})$/);
    const roomId = roomIdMatch ? roomIdMatch[1] : null;

    if (!roomId) {
      alert('올바른 코코포리아 룸 링크를 입력해 주세요.');
      return;
    }

    setIsCcfoliaLoading(true);
    try {
      const authRes = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=AIzaSyAMlcPs4ekVSBdzpRdEloqQ8lIgP9lEnRI', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnSecureToken: true })
      });
      if (!authRes.ok) throw new Error('코코포리아 인증 서버에 접근할 수 없습니다.');
      const authData = await authRes.json();
      const idToken = authData.idToken;

      const charRes = await fetch(`https://firestore.googleapis.com/v1/projects/ccfolia-160aa/databases/(default)/documents/rooms/${roomId}/characters?pageSize=100`, {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      if (!charRes.ok) throw new Error('비공개 방이거나 삭제된 방입니다.');
      const charData = await charRes.json();
      
      const roomCharacters = (charData.documents || []).map((doc: any) => {
        const fields = doc.fields;
        if (!fields) return null;
        
        const expressions: { label: string, url: string }[] = [];
        const mainIconUrl = fields.iconUrl?.stringValue;
        
        // 1. 코코포리아에 등록된 '진짜 이름'이 있는 표정들부터 먼저 싹 다 긁어옵니다.
        if (fields.faces?.arrayValue?.values && fields.faces.arrayValue.values.length > 0) {
          fields.faces.arrayValue.values.forEach((face: any) => {
            const faceFields = face.mapValue?.fields;
            if (!faceFields) return;
            const faceUrl = faceFields.url?.stringValue || faceFields.iconUrl?.stringValue;
            let faceLabel = faceFields.name?.stringValue || faceFields.label?.stringValue || '표정';
            
            // 통일성을 위해 이름 앞에 @가 없으면 자동으로 붙여줍니다.
            if (!faceLabel.startsWith('@')) faceLabel = '@' + faceLabel;

            if (faceUrl && !expressions.some(e => e.url === faceUrl)) {
              expressions.push({ label: faceLabel, url: faceUrl });
            }
          });
        }
        
        // 2. 메인 아이콘(현재 방에 띄워둔 사진)이 표정 목록에 없는 쌩판 '처음 보는 사진'일 때만!
        // 그때만 '@기본' 이라는 이름을 붙여서 목록 맨 앞(unshift)에 슬쩍 끼워 넣습니다.
        if (mainIconUrl && !expressions.some(e => e.url === mainIconUrl)) {
          expressions.unshift({ label: '@기본', url: mainIconUrl });
        }

        const name = fields.name?.stringValue || '';
        const imageUrl = mainIconUrl || (expressions.length > 0 ? expressions[0].url : '');
        return { name, imageUrl, expressions };
      }).filter((c: any) => c && c.name && (c.imageUrl || c.expressions.length > 0));

      const nextCharSettings = { ...charSettings };
      let matchCount = 0;

      // 이름의 공백과 대소문자를 무시하고 비교하는 함수
      const normalizeName = (name: string) => name.replace(/\s+/g, '').toLowerCase();

      roomCharacters.forEach((roomChar: any) => {
        const normalizedRoomName = normalizeName(roomChar.name);
        
        // 1. 현재 화면에 있는 캐릭터 중 이름이 똑같은 캐릭터(제비)를 찾습니다.
        const matchedId = Object.keys(nextCharSettings).find(id => 
          normalizeName(nextCharSettings[id].name) === normalizedRoomName
        );
        
        if (matchedId) {
          const existingChar = nextCharSettings[matchedId];
          const existingExprs = (existingChar as any).expressions || [];
          const newExprs = roomChar.expressions || [];

          // 2. 💡 핵심: 기존 캐릭터가 가지고 있던 표정 뒤에, 새로 불러온 저널의 표정을 합칩니다!
          const combinedExprs = [...existingExprs];
          newExprs.forEach((newExpr: any) => {
            // 똑같은 이미지가 중복으로 들어가는 것을 방지합니다.
            if (!combinedExprs.some(e => e.url === newExpr.url)) {
              combinedExprs.push(newExpr);
            }
          });

          // 3. 하나로 뭉쳐진 스탠딩 이미지 꾸러미를 캐릭터에게 다시 저장합니다.
          nextCharSettings[matchedId] = {
            ...existingChar,
            imageUrl: existingChar.imageUrl || roomChar.imageUrl, 
            expressions: combinedExprs 
          } as any;
          
          matchCount++;
        }
      });

      let messages: any[] = [];
      let pageToken = '';
      let hasNextPage = true;
      
      while (hasNextPage) {
        const msgUrl = `https://firestore.googleapis.com/v1/projects/ccfolia-160aa/databases/(default)/documents/rooms/${roomId}/messages?pageSize=500${pageToken ? `&pageToken=${pageToken}` : ''}`;
        const msgRes = await fetch(msgUrl, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        const msgData = await msgRes.json();
        
        if (msgData.documents) {
          const parsedMsgs = msgData.documents.map((doc: any) => ({
            name: doc.fields?.name?.stringValue || '',
            text: doc.fields?.text?.stringValue || '',
            iconUrl: doc.fields?.iconUrl?.stringValue || ''
          })).filter((m: any) => m.iconUrl);
          
          messages = [...messages, ...parsedMsgs];
        }
        if (msgData.nextPageToken) pageToken = msgData.nextPageToken;
        else hasNextPage = false;
      }

      let expressionMatchCount = 0;
      const nextLogs = [...logs];
      
      // 🚨 텍스트의 HTML 태그, 공백, 줄바꿈을 전부 없애고 순수 글자만 남기는 함수
      const normalizeText = (text: string) => text.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, '').trim();
      
      const msgGroupByName: Record<string, any[]> = {};
      messages.forEach(m => {
        const n = normalizeName(m.name);
        if (!msgGroupByName[n]) msgGroupByName[n] = [];
        msgGroupByName[n].push(m);
      });

      nextLogs.forEach((log: any) => {
        if (log.isIllustration || log.isCommand) return; 
        
        const htmlText = normalizeText(log.content);
        if (!htmlText) return; 

        const logName = normalizeName(log.name);
        const msgsForName = msgGroupByName[logName] || [];
        
        // 1순위: [같은 발언자] 중에서 텍스트가 "완벽하게 똑같은" 것만 매칭! (가장 안전)
        let matchedMsgIndex = msgsForName.findIndex(m => normalizeText(m.text) === htmlText);
        
        // 2순위: 텍스트가 완벽히 같지 않더라도, '같은 발언자'이고 문장이 15글자 이상으로 아주 길 때만 부분 일치 허용 (도둑질 방지)
        if (matchedMsgIndex === -1 && htmlText.length >= 15) {
          matchedMsgIndex = msgsForName.findIndex(m => {
             const msgText = normalizeText(m.text);
             return msgText.length >= 15 && (msgText.includes(htmlText) || htmlText.includes(msgText));
          });
        }

        if (matchedMsgIndex !== -1) {
          const matchedMsg = msgsForName[matchedMsgIndex];
          log.iconUrl = matchedMsg.iconUrl; 
          expressionMatchCount++;
          
          msgsForName.splice(matchedMsgIndex, 1);
          const globalIdx = messages.findIndex(m => m === matchedMsg);
          if (globalIdx !== -1) messages.splice(globalIdx, 1);
          
        } else {
          // 3순위: 이름이 다르게 파싱되었을 경우를 대비한 전체 검색 (단, 완벽하게 일치 + 5글자 이상일 때만 허용!)
          if (htmlText.length >= 5) {
            const globalMatchIndex = messages.findIndex(m => normalizeText(m.text) === htmlText);
            if (globalMatchIndex !== -1) {
              const matchedMsg = messages[globalMatchIndex];
              log.iconUrl = matchedMsg.iconUrl;
              expressionMatchCount++;
              
              messages.splice(globalMatchIndex, 1);
              const groupName = normalizeName(matchedMsg.name);
              if (msgGroupByName[groupName]) {
                const groupIdx = msgGroupByName[groupName].findIndex(m => m === matchedMsg);
                if (groupIdx !== -1) msgGroupByName[groupName].splice(groupIdx, 1);
              }
            }
          }
        }
      });

      setCharSettings(nextCharSettings);
      setLogs(nextLogs);
      saveToHistory({ charSettings: nextCharSettings, logs: nextLogs });
      
      alert(`완료! 방에 있는 ${matchCount}명의 스탠딩을 가져왔고, ${expressionMatchCount}개 대사의 표정이 매칭되었습니다.`);
      setIsCcfoliaModalOpen(false);
      setCcfoliaRoomUrl('');

    } catch (error: any) {
      alert('데이터를 가져오는데 실패했습니다: ' + error.message);
    } finally {
      setIsCcfoliaLoading(false);
    }
  
  };

  const handleIllBulkFetch = async () => {
    if (!illBulkUrl) return;
    
    setIsIllBulkLoading(true);
    try {
      const response = await fetch('/api/imgur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: illBulkUrl }),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Imgur 정보를 가져오지 못했습니다.');
      }
      
      const images: { url: string; fileName: string; ext: string }[] = await response.json();
      setIllBulkImages(images);
      
      // All selected by default
      const initialSelected: Record<string, boolean> = {};
      images.forEach(img => {
        initialSelected[img.url] = true;
      });
      setSelectedIllBulkImages(initialSelected);
      setIsIllBulkModalOpen(true);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsIllBulkLoading(false);
    }
  };

  const applyIllBulkImages = () => {
    const selectedUrls = illBulkImages.filter(img => selectedIllBulkImages[img.url]);
    if (selectedUrls.length === 0) {
      alert('선택된 이미지가 없습니다.');
      return;
    }

    const defaultLogIndex = logs.length > 0 ? logs.length - 1 : 0;
    const defaultTabId = logs[defaultLogIndex]?.tabId || Object.keys(tabSettings)[0] || 'main';

    const nextLogs = [...logs];
    selectedUrls.forEach((img) => {
      const newIllustrationLog: LogEntry = {
        id: `ill_${Date.now()}_${Math.random().toString(36).substring(2, 11)}_${Math.floor(Math.random() * 1000)}`,
        color: '',
        tabId: defaultTabId,
        tab: tabSettings[defaultTabId]?.name || defaultTabId,
        charId: 'system',
        name: '',
        content: img.url,
        imageName: img.fileName,
        isCommand: false,
        isContinuation: false,
        isHiddenContent: false,
        isIllustration: true,
        isUnplaced: true,
        tabOverride: 'auto',
        width: defaultIllWidth,
        align: defaultIllAlign
      };
      nextLogs.push(newIllustrationLog);
    });

    setLogs(nextLogs);
    
    saveToHistory({
      logs: nextLogs
    });

    alert(`총 ${selectedUrls.length}개의 삽화가 일괄 등록되었습니다.`);
    setIsIllBulkModalOpen(false);
  };

  const saveToHistory = (state: any) => {
    const fullState = {
      charSettings,
      tabSettings,
      tabOrder,
      cssFormat,
      fontSize,
      textFontSize,
      lineHeight,
      letterSpacing,
      blockSpacing,
      avatarSizeValue,
      contentPadding,
      fontFamily,
      theme,
      darkBgColor,
      lightBgColor,
      disableOtherColor,
      filterBarMode,
      logs,
      insertedBlocks,
      mergeTabs: Array.from(mergeTabs),
      showTabNames: Array.from(showTabNames),
      mergeTabStyles: Array.from(mergeTabStyles),
      hideEmptyAvatars,
      hideAllAvatars,
      narrationCharacter,
      enableSentenceSpacing,
      showLogDivider,
      illustrations,
      ...state
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(fullState);
    if (newHistory.length > 15) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      applyState(prevState);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      applyState(nextState);
      setHistoryIndex(historyIndex + 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isEditable = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        (activeEl as HTMLElement).isContentEditable
      );
      if (isEditable) return;

      const isCtrl = e.ctrlKey || e.metaKey;
      if (isCtrl) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (key === 'y' && !e.shiftKey) {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [historyIndex, history]);

  const applyState = (state: any) => {
    setCharSettings(state.charSettings);
    setTabSettings(state.tabSettings);
    if (state.tabOrder) setTabOrder(state.tabOrder);
    setCssFormat(state.cssFormat);
    setFontSize(state.fontSize);
    if (state.textFontSize !== undefined) setTextFontSize(state.textFontSize);
    if (state.lineHeight !== undefined) setLineHeight(state.lineHeight);
    if (state.letterSpacing !== undefined) setLetterSpacing(state.letterSpacing);
    if (state.blockSpacing !== undefined) setBlockSpacing(state.blockSpacing);
    if (state.contentPadding !== undefined) setContentPadding(state.contentPadding);
    if (state.avatarSizeValue !== undefined) setAvatarSizeValue(state.avatarSizeValue);
    setFontFamily(state.fontFamily);
    setTheme(state.theme);
    if (state.darkBgColor) setDarkBgColor(state.darkBgColor);
    if (state.lightBgColor) setLightBgColor(state.lightBgColor);
    setDisableOtherColor(state.disableOtherColor);
    if (state.filterBarMode !== undefined) {
      setFilterBarMode(state.filterBarMode);
    } else if (state.isFilterBarEnabled !== undefined) {
      setFilterBarMode(state.isFilterBarEnabled ? 'floating' : 'none');
    }
    if (state.logs) {
      let nextLogs = state.logs;
      if (state.illustrations && state.illustrations.length > 0) {
        nextLogs = migrateIllustrationsToLogs(nextLogs, state.illustrations, state.tabSettings || state.tabSettings || tabSettings);
      }
      setLogs(nextLogs);
    }
    if (state.insertedBlocks) {
      setInsertedBlocks(state.insertedBlocks);
    } else if (state.insertedImages || state.splitPoints) {
      setInsertedBlocks(migrateToInsertedBlocks(state.insertedImages, state.splitPoints, state.sectionNames));
    }
    if (state.mergeTabs) setMergeTabs(new Set(state.mergeTabs));
    if (state.showTabNames) setShowTabNames(new Set(state.showTabNames));
    if (state.mergeTabStyles) setMergeTabStyles(new Set(state.mergeTabStyles));
    if (state.hideEmptyAvatars !== undefined) setHideEmptyAvatars(state.hideEmptyAvatars);
    if (state.hideAllAvatars !== undefined) setHideAllAvatars(state.hideAllAvatars);
    if (state.narrationCharacter !== undefined) setNarrationCharacter(state.narrationCharacter);
    if (state.enableSentenceSpacing !== undefined) setEnableSentenceSpacing(state.enableSentenceSpacing);
    if (state.showLogDivider !== undefined) setShowLogDivider(state.showLogDivider);
  };

  const resetSettings = () => {
    if (confirm('설정을 초기화하시겠습니까?')) {
      if (initialState) {
        const state = initialState;
        setCharSettings(state.charSettings);
        setTabSettings(state.tabSettings);
        setTabOrder(state.tabOrder);
        setCssFormat(state.cssFormat);
        setFontSize(state.fontSize);
        if (state.textFontSize !== undefined) setTextFontSize(state.textFontSize);
        if (state.lineHeight !== undefined) setLineHeight(state.lineHeight);
        if (state.letterSpacing !== undefined) setLetterSpacing(state.letterSpacing);
        if (state.blockSpacing !== undefined) setBlockSpacing(state.blockSpacing);
        if (state.contentPadding !== undefined) setContentPadding(state.contentPadding);
        if (state.avatarSizeValue !== undefined) setAvatarSizeValue(state.avatarSizeValue);
        setFontFamily(state.fontFamily);
        setTheme(state.theme);
        if (state.darkBgColor) setDarkBgColor(state.darkBgColor);
        if (state.lightBgColor) setLightBgColor(state.lightBgColor);
        setDisableOtherColor(state.disableOtherColor);
        setLogs(state.logs);
        if (state.insertedBlocks) {
          setInsertedBlocks(state.insertedBlocks || {});
        } else {
          setInsertedBlocks(migrateToInsertedBlocks(state.insertedImages, state.splitPoints, state.sectionNames));
        }
        setMergeTabs(new Set(state.mergeTabs || ['main', 'secret', 'other']));
        setShowTabNames(new Set(state.showTabNames || ['secret']));
        setMergeTabStyles(new Set(state.mergeTabStyles || ['secret']));
        setHideEmptyAvatars(state.hideEmptyAvatars || false);
        setHideAllAvatars(state.hideAllAvatars || false);
        setNarrationCharacter(state.narrationCharacter || null);
        setEnableSentenceSpacing(state.enableSentenceSpacing || false);
        setShowLogDivider(state.showLogDivider || false);
        saveToHistory(state);
      } else {
        setCssFormat('internal');
        setFontSize(14);
        setTextFontSize(14);
        setLineHeight(1.6);
        setLetterSpacing(0);
        setBlockSpacing(2);
        setContentPadding(12);
        setFontFamily('Noto Sans KR');
        setTheme('dark');
        setDarkBgColor('#212121');
        setLightBgColor('#ffffff');
        setDisableOtherColor(true);
        setMergeTabs(new Set(['main', 'secret', 'other']));
        setShowTabNames(new Set(['secret']));
        setMergeTabStyles(new Set(['secret']));
        setHideEmptyAvatars(false);
        setHideAllAvatars(false);
        setEnableSentenceSpacing(false);
        setShowLogDivider(false);
        setCharSortMode('appearance');
        setTabSortMode('appearance');
        setLibrarySortMode('newest');
        setSaveOptions({
          tabs: true,
          chars: true,
          design: true,
          splits: true,
          images: true,
          edits: true
        });
      }
    }
  };

  useEffect(() => {
    if (historyIndex === -1 && Object.keys(charSettings).length > 0) {
      saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily, theme, disableOtherColor });
    }
  }, [charSettings]);

  const renameCharacter = (charId: string, newName: string) => {
    if (!newName.trim()) {
      setRenamingChar(null);
      return;
    }

    // 1. 캐릭터 목록에서 이름 업데이트
    const nextCharSettings = { ...charSettings };
    if (nextCharSettings[charId]) {
      nextCharSettings[charId] = { ...nextCharSettings[charId], name: newName.trim() };
    }

    // 2. 채팅 로그에 이미 찍혀있는 예전 이름들도 새 이름으로 싹 다 업데이트!
    const nextLogs = logs.map(log => 
      log.charId === charId ? { ...log, name: newName.trim() } : log
    );

    setCharSettings(nextCharSettings);
    setLogs(nextLogs);
    setRenamingChar(null); // 편집 모드 종료
    saveToHistory({ charSettings: nextCharSettings, logs: nextLogs });
  };

  const copyCharacterData = (targetId: string, sourceId: string) => {
    const sourceChar = charSettings[sourceId];
    const targetChar = charSettings[targetId];
    
    if (!sourceChar || !targetChar) return;

    if (!window.confirm(`'${sourceChar.name}'의 모든 스탠딩 이미지와 크롭 설정을 '${targetChar.name}'에게 복사하시겠습니까?\n(기존 이미지는 덮어씌워집니다.)`)) return;

    const nextSettings = { ...charSettings };
    
    // B(source)의 모든 스탠딩 배열과 크롭 관련 데이터를 A(target)에게 덮어씌움!
    nextSettings[targetId] = {
      ...nextSettings[targetId],
      imageUrl: sourceChar.imageUrl,
      expressions: (sourceChar as any).expressions ? [...(sourceChar as any).expressions] : [],
      cropData: (sourceChar as any).cropData,
      rawCropState: (sourceChar as any).rawCropState,
      rawZoomState: (sourceChar as any).rawZoomState,
      excludedCropUrls: (sourceChar as any).excludedCropUrls ? [...(sourceChar as any).excludedCropUrls] : [],
    };

    setCharSettings(nextSettings);
    saveToHistory({ charSettings: nextSettings });
  };

  const handleRandomizeTabColors = () => {
    const defaultColors = [
      '#212121', '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3',
      '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
      '#ffc107', '#ff9800', '#ff5722', '#795548', '#607d8b', '#9e9e9e', '#e0e0e0'
    ];
    
    // Shuffle default colors
    const shuffled = [...defaultColors];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    const nextTabSettings = { ...tabSettings };
    const tabIds = Object.keys(nextTabSettings);
    
    tabIds.forEach((tabId, idx) => {
      const colorIdx = idx % shuffled.length;
      nextTabSettings[tabId] = {
        ...nextTabSettings[tabId],
        color: shuffled[colorIdx]
      };
    });
    
    setTabSettings(nextTabSettings);
    saveToHistory({ tabSettings: nextTabSettings });
  };

  const handleAddToLibrary = () => {
    const validChars = charOrder
      .map(id => charSettings[id])
      .filter(char => char && char.visible && char.imageUrl);
      
    if (validChars.length === 0) return;
    
    const newLibraryItem: CharacterLibraryItem = {
      id: `lib_${Date.now()}`,
      name: pageTitle || originalFileName || 'ccfolia',
      characters: validChars.map(char => ({
        name: char.name,
        color: char.color,
        imageUrl: char.imageUrl
      }))
    };
    
    setCharacterLibrary(prev => [...prev, newLibraryItem]);
  };

  const applyFromLibrary = (libraryItem: CharacterLibraryItem) => {
    let nextCharSettings = { ...charSettings };
    let hasChanges = false;
    
    libraryItem.characters.forEach(libChar => {
      Object.keys(nextCharSettings).forEach(charId => {
        if (nextCharSettings[charId].name === libChar.name) {
          nextCharSettings[charId] = {
            ...nextCharSettings[charId],
            color: libChar.color,
            imageUrl: libChar.imageUrl
          };
          hasChanges = true;
        }
      });
    });
    
    if (hasChanges) {
      setCharSettings(nextCharSettings);
      saveToHistory({ charSettings: nextCharSettings, tabSettings, cssFormat, fontSize, fontFamily, theme, disableOtherColor, logs });
    }
  };

  const applyCharacterFromLibrary = (libChar: { name: string; color: string; imageUrl: string }) => {
    let nextCharSettings = { ...charSettings };
    let hasChanges = false;
    
    Object.keys(nextCharSettings).forEach(charId => {
      if (nextCharSettings[charId].name === libChar.name) {
        nextCharSettings[charId] = {
          ...nextCharSettings[charId],
          color: libChar.color,
          imageUrl: libChar.imageUrl
        };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setCharSettings(nextCharSettings);
      saveToHistory({ charSettings: nextCharSettings, tabSettings, cssFormat, fontSize, fontFamily, theme, disableOtherColor, logs });
    }
    setOpenLibraryDropdownId(null);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const styleInputRef = useRef<HTMLInputElement>(null);

  // Parse HTML Log
  const handleLogUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.replace(/\.[^/.]+$/, "");
    setOriginalFileName(fileName);
    setPageTitle(''); // Reset custom title on new upload

    const {
      trimmedLogs,
      newChars,
      newCharOrder,
      newTabs,
      newTabOrder,
      colorsFound
    } = await parseLogFile(file);

    setLogs(trimmedLogs);
    setCharSettings(newChars);
    setCharOrder(newCharOrder);
    setExtractedColors(colorsFound);
    setTabSettings(newTabs);
    setTabOrder(newTabOrder);
    setInsertedBlocks({});
    
    if (!rememberSettings) {
      setMergeTabs(new Set(['main', 'secret', 'other']));
      setMergeTabStyles(new Set(['secret']));
      setShowTabNames(new Set(['secret']));
      setHideEmptyAvatars(false);
      setCssFormat('internal');
      setFontSize(14);
      setDisableOtherColor(true);
    }
    setPageTitle('');
    setActiveTab('tabs');

    // Save initial state for reset
    const initial = {
      charSettings: newChars,
      tabSettings: newTabs,
      tabOrder: newTabOrder,
      cssFormat: rememberSettings ? cssFormat : ('internal' as const),
      fontSize: rememberSettings ? fontSize : 14,
      textFontSize: rememberSettings ? textFontSize : 14,
      fontFamily: rememberSettings ? fontFamily : 'Noto Sans KR',
      theme: rememberSettings ? theme : ('dark' as const),
      disableOtherColor: rememberSettings ? disableOtherColor : true,
      logs: trimmedLogs,
      insertedImages: {},
      splitPoints: [] as number[],
      sectionNames: {} as Record<number, string>,
      mergeTabs: rememberSettings ? Array.from(mergeTabs) : ['main', 'secret', 'other'],
      showTabNames: rememberSettings ? Array.from(showTabNames) : ['secret'],
      mergeTabStyles: rememberSettings ? Array.from(mergeTabStyles) : ['secret'],
      hideEmptyAvatars: rememberSettings ? hideEmptyAvatars : false,
      hideAllAvatars: rememberSettings ? hideAllAvatars : false,
      showLogDivider: rememberSettings ? showLogDivider : false
    };
    setInitialState(initial);
    setHistory([initial]);
    setHistoryIndex(0);
  };

  const [jsonFileName, setJsonFileName] = useState('');

  // Handle Project Upload
  const handleProjectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const jsonText = await file.text();
      const json = JSON.parse(jsonText);
      
      let confirmMessage = "";
      
      if (logs.length > 0) {
        confirmMessage += "현재 작업 중인 데이터를 덮어씌우시겠습니까?\n";
      }
      
      const jsonTargetName = json.pageTitle || json.originalFileName;
      const currentTargetName = pageTitle || originalFileName;
      
      const cleanName = (name: string) => {
        if (!name) return "";
        return name.replace(/\.(html|htm|json)$/i, "").trim().toLowerCase();
      };
      
      if (jsonTargetName && currentTargetName && cleanName(jsonTargetName) !== cleanName(currentTargetName)) {
        confirmMessage += `\n주의: 이 프로젝트 파일은 "${jsonTargetName}" 프로젝트용입니다.\n현재 작업 중인 문서("${currentTargetName}")와 이름이 다릅니다.`;
      }
      
      if (confirmMessage) {
        if (!window.confirm(confirmMessage.trim() + "\n\n그래도 계속하시겠습니까?")) {
          e.target.value = '';
          return;
        }
      }

      if (json.charSettings) setCharSettings(json.charSettings);
      if (json.charOrder) setCharOrder(json.charOrder);
      if (json.tabSettings) setTabSettings(json.tabSettings);
      if (json.tabOrder) setTabOrder(json.tabOrder);
      if (json.pageTitle !== undefined) setPageTitle(json.pageTitle);
      
      if (json.logs) {
        let nextLogs = json.logs;
        if (json.illustrations && json.illustrations.length > 0) {
          nextLogs = migrateIllustrationsToLogs(nextLogs, json.illustrations, json.tabSettings || tabSettings);
        }
        setLogs(nextLogs);
      }
      
      if (json.cssFormat) setCssFormat(json.cssFormat);
      if (json.fontSize) setFontSize(json.fontSize);
      if (json.textFontSize !== undefined) setTextFontSize(json.textFontSize);
      if (json.lineHeight !== undefined) setLineHeight(json.lineHeight);
      if (json.letterSpacing !== undefined) setLetterSpacing(json.letterSpacing);
      if (json.blockSpacing !== undefined) setBlockSpacing(json.blockSpacing);
      if (json.contentPadding !== undefined) setContentPadding(json.contentPadding);
      if (json.avatarSizeValue !== undefined) setAvatarSizeValue(json.avatarSizeValue);
      if (json.fontFamily) setFontFamily(json.fontFamily);
      if (json.theme) setTheme(json.theme);
      if (json.darkBgColor !== undefined) setDarkBgColor(json.darkBgColor);
      if (json.lightBgColor !== undefined) setLightBgColor(json.lightBgColor);
      if (json.filterBarMode !== undefined) setFilterBarMode(json.filterBarMode);
      if (json.enableSentenceSpacing !== undefined) setEnableSentenceSpacing(json.enableSentenceSpacing);
      if (json.disableOtherColor !== undefined) setDisableOtherColor(json.disableOtherColor);
      if (json.showLogDivider !== undefined) setShowLogDivider(json.showLogDivider);
      
      if (json.insertedBlocks) {
        setInsertedBlocks(json.insertedBlocks);
      } else if (json.splitPoints || json.insertedImages) {
        setInsertedBlocks(migrateToInsertedBlocks(json.insertedImages, json.splitPoints, json.sectionNames));
      }
      
      if (json.mergeTabs) setMergeTabs(new Set(json.mergeTabs));
      if (json.showTabNames) setShowTabNames(new Set(json.showTabNames));
      if (json.mergeTabStyles) setMergeTabStyles(new Set(json.mergeTabStyles));
      if (json.hideEmptyAvatars !== undefined) setHideEmptyAvatars(json.hideEmptyAvatars);
      if (json.hideAllAvatars !== undefined) setHideAllAvatars(json.hideAllAvatars);
      if (json.narrationCharacter !== undefined) setNarrationCharacter(json.narrationCharacter);

      saveToHistory(json);
      setJsonFileName(file.name);
    } catch (err) {
      alert('프로젝트 파일을 읽는 중 오류가 발생했습니다.');
    }
    e.target.value = '';
  };

  const exportProject = () => {
    const data: any = { 
      originalFileName,
      pageTitle
    };
    
    if (saveOptions.chars) {
      data.charSettings = charSettings;
      data.charOrder = charOrder;
      data.narrationCharacter = narrationCharacter;
      data.hideEmptyAvatars = hideEmptyAvatars;
      data.hideAllAvatars = hideAllAvatars;
    }
    
    if (saveOptions.tabs) {
      data.tabSettings = tabSettings;
      data.tabOrder = tabOrder;
      data.mergeTabs = Array.from(mergeTabs);
      data.showTabNames = Array.from(showTabNames);
      data.mergeTabStyles = Array.from(mergeTabStyles);
      data.disableOtherColor = disableOtherColor;
    }
    
    if (saveOptions.design) {
      data.cssFormat = cssFormat;
      data.fontSize = fontSize;
      data.textFontSize = textFontSize;
      data.lineHeight = lineHeight;
      data.letterSpacing = letterSpacing;
      data.blockSpacing = blockSpacing;
      data.contentPadding = contentPadding;
      data.avatarSizeValue = avatarSizeValue;
      data.fontFamily = fontFamily;
      data.theme = theme;
      data.darkBgColor = darkBgColor;
      data.lightBgColor = lightBgColor;
      data.filterBarMode = filterBarMode;
      data.enableSentenceSpacing = enableSentenceSpacing;
      data.showLogDivider = showLogDivider;
    }
    
    if (saveOptions.splits || saveOptions.images) {
      data.insertedBlocks = insertedBlocks;
      // Legacy export support just in case
      if (saveOptions.splits) {
        data.splitPoints = Array.from(splitPoints);
        data.sectionNames = sectionNames;
      }
      if (saveOptions.images) {
        data.insertedImages = insertedImages;
      }
    }
    
    if (saveOptions.edits) {
      data.logs = logs;
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    let baseName = 'ccfolia_project';
    if (pageTitle) {
      baseName = pageTitle;
    } else if (originalFileName) {
      baseName = originalFileName.replace(/\.html$/, '');
    }
    
    a.download = `${baseName}.json`;
    a.click();
  };

  const mergedLogs = useMemo(() => {
    if (logs.length === 0) return [];
    
    const result: any[] = [];
    let prevVisibleLog: any | null = null;
    let currentSectionId = 'section-0';

    logs.forEach((log, idx) => {
      if (log.isUnplaced) return;

      if (log.isIllustration) {
        let resolvedTabId = log.tabOverride;
        if (resolvedTabId === 'auto' || !resolvedTabId || !tabSettings[resolvedTabId]) {
          // 직전 로그 블록 탐색
          let prevTabId = null;
          for (let i = idx - 1; i >= 0; i--) {
            if (logs[i] && !logs[i].isIllustration) {
              const tabId = logs[i].tabId;
              if (tabSettings[tabId] && tabSettings[tabId].visible !== false) {
                prevTabId = tabId;
                break;
              }
            }
          }
          if (prevTabId) {
            resolvedTabId = prevTabId;
          } else {
            // 직후 로그 블록 탐색 (가장 상단에 삽화가 들어간 예외 케이스)
            let nextTabId = null;
            for (let i = idx + 1; i < logs.length; i++) {
              if (logs[i] && !logs[i].isIllustration) {
                const tabId = logs[i].tabId;
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
            tabOverride: log.tabOverride || 'auto',
            width: log.width,
            align: log.align || 'center',
            illustration: {
              id: log.id,
              url: log.content,
              tabOverride: log.tabOverride || 'auto',
              width: log.width,
              align: log.align || 'center'
            },
            sectionId: currentSectionId
          };
          result.push(illLogEntry);
          prevVisibleLog = illLogEntry;
        }
        return;
      }

      const isVisibleContent = tabSettings[log.tabId]?.visible && charSettings[log.charId]?.visible !== false;
      const hasImage = insertedBlocks[log.id]?.some((b: any) => b.type === 'image');
      
      let mappedLog: any = null;
      if (isVisibleContent) {
        mappedLog = { ...log, isHiddenContent: false };
      } else if (hasImage) {
        mappedLog = { ...log, isHiddenContent: true };
      }

      if (mappedLog) {
        const tabSet = tabSettings[mappedLog.tabId];
        const format = tabSet?.format || 'main';
        const stableId = mappedLog.id.startsWith('merged:') ? mappedLog.id.split(',').pop()! : mappedLog.id;
        const prevStableId = prevVisibleLog && !prevVisibleLog.isIllustration ? (prevVisibleLog.id.startsWith('merged:') ? prevVisibleLog.id.split(',').pop()! : prevVisibleLog.id) : '';
        const prevHasBlock = prevVisibleLog && !prevVisibleLog.isIllustration && !!insertedBlocks[prevStableId]?.length;

        let isContinuation = false;
                if (prevVisibleLog && !prevVisibleLog.isIllustration) {
          const prevFormat = tabSettings[prevVisibleLog.tabId]?.format || 'main';
          const isPrevHidden = prevVisibleLog.isHiddenContent;
          if (!mappedLog.isHiddenContent && 
              !isPrevHidden &&
              mergeTabs.has(format) && 
              mergeTabs.has(prevFormat) &&
              prevVisibleLog.name === mappedLog.name && 
              prevVisibleLog.tab === mappedLog.tab && 
              !mappedLog.isCommand && 
              !prevVisibleLog.isCommand &&
              !prevHasBlock &&
              (prevVisibleLog.iconUrl || charSettings[prevVisibleLog.charId]?.imageUrl) === (mappedLog.iconUrl || charSettings[mappedLog.charId]?.imageUrl)
          ) {
            isContinuation = true;
          }
        }

        const newLog = { ...mappedLog, isContinuation, sectionId: currentSectionId };
        result.push(newLog);
        prevVisibleLog = newLog;

        if (splitPoints.has(stableId)) {
          currentSectionId = `section-${stableId}`;
        }
      }
    });

    return result;
  }, [logs, mergeTabs, tabSettings, charSettings, insertedBlocks, splitPoints]);

  useLayoutEffect(() => {
    if (listRef.current) {
      setListOffset(listRef.current.offsetTop);
    }
  }, [mergedLogs.length, sectionNames, splitPoints]);

  const splitPointsArray = useMemo(() => {
    return mergedLogs
      .map((log, idx) => ({ log, idx }))
      .filter(({ log }) => {
        const stableId = log.id.startsWith('merged:') ? log.id.split(',').pop()! : log.id;
        return splitPoints.has(stableId);
      })
      .map(({ idx }) => idx);
  }, [mergedLogs, splitPoints]);

  const sectionsList = useMemo(() => {
    if (mergedLogs.length === 0) return [];
    const list = [];
    
    const firstEnd = splitPointsArray.length > 0 ? splitPointsArray[0] : mergedLogs.length - 1;
    list.push({ 
      id: 'section-0', 
      name: sectionNames[0] || '섹션 1',
      startBlock: 1,
      endBlock: firstEnd + 1,
      targetOriginalIndex: 0
    });

    splitPointsArray.forEach((idx, i) => {
      const splitLog = mergedLogs[idx];
      const stableId = splitLog ? (splitLog.id.startsWith('merged:') ? splitLog.id.split(',').pop()! : splitLog.id) : '';
      const startBlock = idx + 2; // +1 for 0-index, +1 for next block
      const endBlock = i + 1 < splitPointsArray.length ? splitPointsArray[i + 1] + 1 : mergedLogs.length;
      
      list.push({ 
        id: `section-${stableId}`, 
        name: sectionNames[stableId] || `섹션 ${i + 2}`,
        startBlock,
        endBlock,
        targetOriginalIndex: idx + 1
      });
    });
    return list;
  }, [splitPointsArray, sectionNames, mergedLogs]);

  const scrollToSection = (targetOriginalIndex: number, sectionId: string) => {
    if (targetOriginalIndex === 0 || sectionId === 'section-0') {
      rowVirtualizer.scrollToIndex(0, { align: 'start' });
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (previewContainerRef.current) {
            previewContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
          }
        }, 10);
      });
      return;
    }

    const virtualIndex = displayItems.findIndex(item => item.originalIndex === targetOriginalIndex);
    if (virtualIndex !== -1) {
      rowVirtualizer.scrollToIndex(virtualIndex, { align: 'start' });
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          const container = previewContainerRef.current;
          if (el && container) {
            const elRect = el.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const offsetTop = elRect.top - containerRect.top + container.scrollTop - 50;
            container.scrollTo({ top: offsetTop, behavior: 'auto' });
          }
        }, 30);
      });
    }
  };

  const scrollToIllustrationLog = (targetOriginalLogIndex: number) => {
    let virtualIndex = -1;
    let targetIndexToFind = targetOriginalLogIndex;
    
    // Find nearest visible log backwards
    while (targetIndexToFind >= 0) {
      virtualIndex = displayItems.findIndex(item => {
        const stableId = item.log.id.startsWith('merged:') ? item.log.id.split(',').pop()! : item.log.id;
        const originalLogIndex = logs.findIndex((l: any) => l.id === stableId);
        return originalLogIndex === targetIndexToFind;
      });
      if (virtualIndex !== -1) break;
      targetIndexToFind--;
    }

    // If none found, find nearest visible log forwards
    if (virtualIndex === -1) {
      targetIndexToFind = targetOriginalLogIndex + 1;
      while (targetIndexToFind < logs.length) {
        virtualIndex = displayItems.findIndex(item => {
          const stableId = item.log.id.startsWith('merged:') ? item.log.id.split(',').pop()! : item.log.id;
          const originalLogIndex = logs.findIndex((l: any) => l.id === stableId);
          return originalLogIndex === targetIndexToFind;
        });
        if (virtualIndex !== -1) break;
        targetIndexToFind++;
      }
    }

    if (virtualIndex !== -1) {
      rowVirtualizer.scrollToIndex(virtualIndex, { align: 'center' });
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          const el = document.getElementById(`log-item-${targetIndexToFind}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('bg-[#499bc8]/10');
            el.classList.add('transition-all');
            setTimeout(() => {
              el.classList.remove('bg-[#499bc8]/10');
            }, 1500);
          }
        }, 120);
      });
    }
  };

  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const { displayItems, searchMatchIndices } = useMemo(() => {
    if (!searchQuery) {
      return {
        displayItems: mergedLogs.map((log, index) => ({ log, isMatched: false, originalIndex: index })),
        searchMatchIndices: []
      };
    }
    const lowerQuery = searchQuery.toLowerCase();
    const indices: number[] = [];
    const items = mergedLogs.map((log, index) => {
      const isMatched = log.content.toLowerCase().includes(lowerQuery) || log.name.toLowerCase().includes(lowerQuery);
      if (isMatched) {
        indices.push(index);
      }
      return { log, isMatched, originalIndex: index };
    });
    return { displayItems: items, searchMatchIndices: indices };
  }, [mergedLogs, searchQuery]);

  const displayItemsNameWidth = useMemo(() => {
    if (!hideAllAvatars) return 120;
    if (typeof document === 'undefined') return 120;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 120;
    
    // font values
    const fw = fonts.find(f => f.name === fontFamily)?.value || 'sans-serif';
    const nameSizePixel = textFontSize * 0.96;
    ctx.font = `bold ${nameSizePixel}px ${fw}`;
    
    let mw = 0;
    for (const item of displayItems) {
      const log = item.log;
      if (log.charId !== narrationCharacter && !log.isContinuation) {
         if (tabSettings[log.tabId]?.visible !== false && charSettings[log.charId]?.visible !== false) {
           const w = ctx.measureText(log.name + ':').width;
           if (w > mw) mw = w;
         }
      }
    }
    
    return Math.min(Math.max(48, Math.ceil(mw + 8)), 120);
  }, [displayItems, textFontSize, fontFamily, narrationCharacter, hideAllAvatars, tabSettings, charSettings]);

  useEffect(() => {
    if (searchQuery) {
      setCurrentMatchIndex(searchMatchIndices.length > 0 ? 0 : -1);
    } else {
      setCurrentMatchIndex(-1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const onAddBlock = useCallback((id: string, index: number, type: 'split' | 'image', data?: any) => {
    const next = { ...insertedBlocks };
    if (!next[id]) next[id] = [];
    next[id] = [...next[id]];
    const newBlock: InsertedBlock = type === 'image' 
      ? { id: `img_${Date.now()}_${Math.random().toString(36).substr(2,9)}`, type: 'image', url: data.url, width: '400', align: 'center' }
      : { id: `split_${Date.now()}_${Math.random().toString(36).substr(2,9)}`, type: 'split', name: '' };
    next[id].splice(index, 0, newBlock);
    setInsertedBlocks(next);
    saveToHistory({ insertedBlocks: next });
    setImageInputLoc(null);
  }, [insertedBlocks, saveToHistory]);

  const onAddIllustration = useCallback((afterLogId: string, url: string, tabOverride: string) => {
    const logIdx = logs.findIndex((l: any) => l.id === afterLogId);
    if (logIdx === -1) return;

    const referenceLog = logs[logIdx];
    const defaultTabId = tabOverride === 'auto' || !tabOverride ? referenceLog.tabId : tabOverride;
    const newIllustrationLog: LogEntry = {
      id: `ill_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      color: '',
      tabId: defaultTabId,
      tab: tabSettings[defaultTabId]?.name || defaultTabId,
      charId: 'system',
      name: '',
      content: url,
      isCommand: false,
      isContinuation: false,
      isHiddenContent: false,
      isIllustration: true,
      tabOverride: tabOverride || 'auto',
      width: defaultIllWidth,
      align: defaultIllAlign
    };

    const nextLogs = [...logs];
    nextLogs.splice(logIdx + 1, 0, newIllustrationLog);
    setLogs(nextLogs);
    saveToHistory({ logs: nextLogs });
    setImageInputLoc(null);
  }, [logs, tabSettings, saveToHistory]);

  const onUpdateIllustration = useCallback((id: string, updates: Partial<Illustration> & { afterLogIndex?: number | null, targetLogId?: string, position?: 'before' | 'after' }) => {
    const logIdx = logs.findIndex((l: any) => l.id === id);
    if (logIdx === -1) return;

    const nextLogs = [...logs];
    const target = { ...nextLogs[logIdx] };

    if (updates.targetLogId && updates.position) {
      target.isUnplaced = false;
      target.tabOverride = 'auto'; // Force 'auto' when drag-and-dropped
      const oldIdx = logIdx;
      nextLogs[logIdx] = target;
      const [removed] = nextLogs.splice(oldIdx, 1);
      
      let targetIdx = nextLogs.findIndex((l: any) => l.id === updates.targetLogId);
      if (targetIdx === -1) targetIdx = 0;
      
      let newIdx = updates.position === 'before' ? targetIdx : targetIdx + 1;
      nextLogs.splice(newIdx, 0, removed);
      
      setLogs(nextLogs);
      saveToHistory({ logs: nextLogs });
    } else if (updates.afterLogIndex !== undefined) {
      if (updates.afterLogIndex === null) {
        target.isUnplaced = true;
        nextLogs[logIdx] = target;
        // Keep it at current position but mark unplaced
        setLogs(nextLogs);
        saveToHistory({ logs: nextLogs });
      } else {
        target.isUnplaced = false;
        const oldIdx = logIdx;
        let newIdx = updates.afterLogIndex;
        // Prevent going out of bounds
        newIdx = Math.max(0, Math.min(nextLogs.length - 1, newIdx));
        nextLogs[logIdx] = target;
        const [removed] = nextLogs.splice(oldIdx, 1);
        nextLogs.splice(newIdx, 0, removed);
        setLogs(nextLogs);
        saveToHistory({ logs: nextLogs });
      }
    } else {
      if (updates.url !== undefined) target.content = updates.url;
      if (updates.tabOverride !== undefined) target.tabOverride = updates.tabOverride;
      if (updates.width !== undefined) target.width = updates.width;
      if (updates.align !== undefined) target.align = updates.align;

      nextLogs[logIdx] = target;
      setLogs(nextLogs);
      saveToHistory({ logs: nextLogs });
    }
  }, [logs, saveToHistory]);

  const onRemoveIllustration = useCallback((id: string) => {
    const nextLogs = logs.filter((l: any) => l.id !== id);
    setLogs(nextLogs);
    saveToHistory({ logs: nextLogs });
  }, [logs, saveToHistory]);

  const handleApplyBulkIllustrationSettings = useCallback(() => {
    const nextLogs = logs.map((l: any) => {
      if (l.isIllustration) {
        return { ...l, width: defaultIllWidth, align: defaultIllAlign };
      }
      return l;
    });
    setLogs(nextLogs);
    saveToHistory({ logs: nextLogs });
    alert('모든 삽화의 크기와 정렬이 일괄 변경되었습니다.');
  }, [logs, defaultIllWidth, defaultIllAlign, saveToHistory]);

  const onUpdateBlock = useCallback((id: string, blockId: string, updates: Partial<InsertedBlock>) => {
    const next = { ...insertedBlocks };
    if (next[id]) {
      next[id] = next[id].map((b: InsertedBlock) => b.id === blockId ? { ...b, ...updates } as InsertedBlock : b);
      setInsertedBlocks(next);
      saveToHistory({ insertedBlocks: next });
    }
  }, [insertedBlocks, saveToHistory]);

  const onRemoveBlock = useCallback((id: string, blockId: string) => {
    const next = { ...insertedBlocks };
    if (next[id]) {
      next[id] = next[id].filter((b: InsertedBlock) => b.id !== blockId);
      if (next[id].length === 0) delete next[id];
      setInsertedBlocks(next);
      saveToHistory({ insertedBlocks: next });
    }
  }, [insertedBlocks, saveToHistory]);

  const onToggleImageInput = useCallback((id: string, index: number) => {
    setImageInputLoc(prev => 
      prev?.logId === id && prev.insertIndex === index 
        ? null 
        : { logId: id, insertIndex: index }
    );
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: displayItems.length,
    getScrollElement: () => previewContainerRef.current,
    estimateSize: () => 100,
    overscan: 10,
    scrollMargin: listOffset,
  });

  useEffect(() => {
    if (searchMatchIndices.length > 0 && currentMatchIndex >= 0 && currentMatchIndex < searchMatchIndices.length) {
      setTimeout(() => {
        rowVirtualizer.scrollToIndex(searchMatchIndices[currentMatchIndex], { align: 'center' });
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMatchIndex, searchMatchIndices]);

  const sortedCharOrder = useMemo(() => {
    if (charSortMode === 'appearance') return charOrder;
    return [...charOrder].sort((idA, idB) => {
      const a = charSettings[idA]?.name || 'Unknown';
      const b = charSettings[idB]?.name || 'Unknown';

      // Handle "Unknown" or empty names by putting them at the end
      if (a === 'Unknown' && b !== 'Unknown') return 1;
      if (a !== 'Unknown' && b === 'Unknown') return -1;
      
      const isAEnglish = /^[a-zA-Z]/.test(a);
      const isBEnglish = /^[a-zA-Z]/.test(b);
      
      if (isAEnglish && !isBEnglish) return -1;
      if (!isAEnglish && isBEnglish) return 1;

      return a.localeCompare(b, 'ko', { sensitivity: 'base', numeric: true });
    });
  }, [charOrder, charSortMode, charSettings]);

  const sortedTabOrder = useMemo(() => {
    if (tabSortMode === 'appearance') return tabOrder;
    return [...tabOrder].sort((idA, idB) => {
      const a = tabSettings[idA]?.name || 'Unknown';
      const b = tabSettings[idB]?.name || 'Unknown';

      // Handle "Unknown" or empty names by putting them at the end
      if (a === 'Unknown' && b !== 'Unknown') return 1;
      if (a !== 'Unknown' && b === 'Unknown') return -1;
      
      const isAEnglish = /^[a-zA-Z]/.test(a);
      const isBEnglish = /^[a-zA-Z]/.test(b);
      
      if (isAEnglish && !isBEnglish) return -1;
      if (!isAEnglish && isBEnglish) return 1;

      return a.localeCompare(b, 'ko', { sensitivity: 'base', numeric: true });
    });
  }, [tabOrder, tabSortMode, tabSettings]);

  const addCustomCharacter = (customName?: string) => {
    const newId = `custom_${Date.now()}`;
    
    // Find unique name like "새 캐릭터", "새 캐릭터 (1)", "새 캐릭터 (2)"...
    let baseName = customName?.trim() || "새 캐릭터";
    let newName = baseName;
    let counter = 1;
    const existingNames = Object.values(charSettings).map(c => (c as CharSetting).name);
    while (existingNames.includes(newName)) {
      newName = `${baseName} (${counter})`;
      counter++;
    }

    const newChar: CharSetting = {
      id: newId,
      name: newName,
      color: '#9E9E9E',
      visible: true,
      imageUrl: ''
    };
    const nextCharSettings = { ...charSettings, [newId]: newChar };
    const nextCharOrder = [newId, ...charOrder];

    setCharSettings(nextCharSettings);
    setCharOrder(nextCharOrder);
    saveToHistory({ charSettings: nextCharSettings, charOrder: nextCharOrder });
  };

  const onChangeSpeaker = useCallback((logId: string, newCharId: string) => {
    const newChar = charSettings[newCharId];
    if (!newChar) return;

    if (logId.startsWith('merged:')) {
      const ids = logId.replace('merged:', '').split(',');
      const firstId = ids[0];
      const otherIds = ids.slice(1);

      const next = logs.filter(l => !otherIds.includes(l.id)).map(l => 
        l.id === firstId ? { ...l, charId: newChar.id, name: newChar.name, color: newChar.color } : l
      );
      setLogs(next);
      saveToHistory({ logs: next });
    } else {
      const next = logs.map(l => 
        l.id === logId ? { ...l, charId: newChar.id, name: newChar.name, color: newChar.color } : l
      );
      setLogs(next);
      saveToHistory({ logs: next });
    }
  }, [logs, charSettings, saveToHistory]);

    const onChangeExpression = useCallback((logId: string, newIconUrl: string) => {
    if (logId.startsWith('merged:')) {
      const ids = logId.replace('merged:', '').split(',');
      const firstId = ids[0];
      const otherIds = ids.slice(1);

      const next = logs.filter(l => !otherIds.includes(l.id)).map(l => 
        l.id === firstId ? { ...l, iconUrl: newIconUrl } : l
      );
      setLogs(next);
      saveToHistory({ logs: next });
    } else {
      const next = logs.map(l => 
        l.id === logId ? { ...l, iconUrl: newIconUrl } : l
      );
      setLogs(next);
      saveToHistory({ logs: next });
    }
  }, [logs, saveToHistory]);

  const onChangeTab = useCallback((logId: string, newTabId: string) => {
    const newTab = tabSettings[newTabId];
    if (!newTab) return;

    if (logId.startsWith('merged:')) {
      const ids = logId.replace('merged:', '').split(',');
      const firstId = ids[0];
      const otherIds = ids.slice(1);

      const next = logs.filter(l => !otherIds.includes(l.id)).map(l => 
        l.id === firstId ? { ...l, tabId: newTab.id, tab: newTab.name } : l
      );
      setLogs(next);
      saveToHistory({ logs: next });
    } else {
      const next = logs.map(l => 
        l.id === logId ? { ...l, tabId: newTab.id, tab: newTab.name } : l
      );
      setLogs(next);
      saveToHistory({ logs: next });
    }
  }, [logs, tabSettings, saveToHistory]);

  const onEditLog = useCallback((id: string, content: string) => {
    if (id.startsWith('merged:')) {
      const ids = id.replace('merged:', '').split(',');
      const firstId = ids[0];
      const otherIds = ids.slice(1);
      
      const next = logs.filter(l => !otherIds.includes(l.id)).map(l => l.id === firstId ? { ...l, content } : l);
      setLogs(next);
      saveToHistory({ logs: next });
    } else {
      const next = logs.map(l => l.id === id ? { ...l, content } : l);
      setLogs(next);
      saveToHistory({ logs: next });
    }
  }, [logs, saveToHistory]);

  const onDeleteLog = useCallback((id: string) => {
    // Find index in mergedLogs before deleting
    const idx = mergedLogs.findIndex(l => l.id === id);

    if (id.startsWith('merged:')) {
      const ids = id.replace('merged:', '').split(',');
      const next = logs.filter(l => !ids.includes(l.id));
      setLogs(next);
      saveToHistory({ logs: next });
    } else {
      const next = logs.filter(l => l.id !== id);
      setLogs(next);
      saveToHistory({ logs: next });
    }

    if (idx !== -1) {
      const stableId = id.startsWith('merged:') ? id.split(',').pop()! : id;
      
      const nextBlocks = { ...insertedBlocks };
      if (nextBlocks[stableId]) {
        delete nextBlocks[stableId];
      }
      setInsertedBlocks(nextBlocks);
      
      saveToHistory({ 
        insertedBlocks: nextBlocks 
      });
    }
  }, [logs, mergedLogs, insertedBlocks, saveToHistory]);

  const insertLogBlock = useCallback((afterLogId: string, insertBefore: boolean = false) => {
    const lastId = afterLogId.startsWith('merged:')
      ? afterLogId.replace('merged:', '').split(',').pop()!
      : afterLogId;

    const targetIndex = logs.findIndex(l => l.id === lastId);
    if (targetIndex === -1) return;

    const referenceLog = logs[targetIndex];
    const newLogId = `log_${Date.now()}`;
    const newLog: LogEntry = {
      id: newLogId,
      charId: referenceLog.charId,
      name: referenceLog.name,
      color: referenceLog.color,
      tabId: referenceLog.tabId,
      tab: referenceLog.tab,
      content: "",
      isCommand: false,
      isHiddenContent: false,
      isContinuation: false,
      sectionId: referenceLog.sectionId,
    };

    const nextLogs = [...logs];
    if (insertBefore) {
      nextLogs.splice(targetIndex, 0, newLog);
    } else {
      nextLogs.splice(targetIndex + 1, 0, newLog);
    }
    setLogs(nextLogs);
    saveToHistory({ logs: nextLogs });
    setEditingLogId(newLogId);
  }, [logs, saveToHistory]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('클립보드에 복사되었습니다.');
    }).catch(err => {
      console.error('복사 실패:', err);
    });
  };

  const getHtmlString = (sectionId?: string) => {
    const selectedFont = fonts.find(f => f.name === fontFamily) || fonts[0];
    const targetLogs = sectionId ? mergedLogs.filter(log => log.sectionId === sectionId) : mergedLogs;
    const filteredLogs = targetLogs.filter(log => 
      tabSettings[log.tabId]?.visible && 
      (charSettings[log.charId]?.visible !== false)
    );

    return generateFinalHtmlStr(
      filteredLogs,
      mergedLogs,
      charSettings,
      tabSettings,
      cssFormat,
      theme,
      darkBgColor,
      lightBgColor,
      filterBarMode,
      fontSize,
      fontFamily,
      disableOtherColor,
      hideEmptyAvatars,
      hideAllAvatars,
      narrationCharacter,
      enableSentenceSpacing,
      insertedBlocks,
      mergeTabs,
      mergeTabStyles,
      showTabNames,
      pageTitle,
      selectedFont.value,
      textFontSize,
      lineHeight,
      letterSpacing,
      blockSpacing,
      contentPadding,
      avatarSizeValue,
      showLogDivider,
      illustrations,
      logs
    );
  };

  const downloadHtml = (section?: { id: string; name: string }) => {
    const html = getHtmlString(section?.id);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fileName = pageTitle || originalFileName || 'ccfolia';
    let suffix = '_log';
    if (section) {
      suffix = section.name ? `_${section.name}` : `_${section.id}`;
    }
    a.download = `${fileName}${suffix}.html`;
    a.click();
  };

  const downloadZip = async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    const fileName = pageTitle || originalFileName || 'ccfolia';
    const folderName = `${fileName}_log`;
    const folder = zip.folder(folderName);

    sectionsList.forEach((s, i) => {
      const selectedFont = fonts.find(f => f.name === fontFamily) || fonts[0];
      const targetLogs = mergedLogs.filter(log => log.sectionId === s.id);
      const filteredLogs = targetLogs.filter(log => 
        tabSettings[log.tabId]?.visible && 
        (charSettings[log.charId]?.visible !== false)
      );

      const html = generateFinalHtmlStr(
        filteredLogs,
        mergedLogs,
        charSettings,
        tabSettings,
        cssFormat,
        theme,
        darkBgColor,
        lightBgColor,
        filterBarMode,
        fontSize,
        fontFamily,
        disableOtherColor,
        hideEmptyAvatars,
        hideAllAvatars,
        narrationCharacter,
        enableSentenceSpacing,
        insertedBlocks,
        mergeTabs,
        mergeTabStyles,
        showTabNames,
        pageTitle,
        selectedFont.value,
        textFontSize,
        lineHeight,
        letterSpacing,
        blockSpacing,
        contentPadding,
        avatarSizeValue,
        showLogDivider,
        illustrations,
        logs
      );
      
      const finalName = s.name ? `${fileName}_${s.name}` : `${fileName}_section_${i + 1}`;
      folder?.file(`${finalName}.html`, html);
    });

    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTabChange = (newTab: 'files' | 'tabs' | 'chars' | 'illustrations' | 'settings') => {
    if (newTab === activeTab) return;
    if (sidebarScrollRef.current) {
      scrollPositions.current[activeTab] = sidebarScrollRef.current.scrollTop;
    }
    setActiveTab(newTab);
  };

  const handleGlobalDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const mockEvent = { target: { files: [file] } } as any;
    if (file.name.toLowerCase().endsWith('.html') || file.name.toLowerCase().endsWith('.htm')) {
      await handleLogUpload(mockEvent);
    } else if (file.name.toLowerCase().endsWith('.json')) {
      await handleProjectUpload(mockEvent);
    }
  };

if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-[100dvh] bg-[#0f0f0f] text-white font-sans">
        <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-12 h-12 bg-[#5ca5d4] rounded-xl flex items-center justify-center mb-2 shadow-lg shadow-blue-500/20">
             <span className="text-2xl">🔒</span>
          </div>
        
          <p className="text-xs text-white/50 mb-2">비공개 사이트입니다.</p>
          
          <div className="flex gap-2 w-full">
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') {
                  if (passwordInput === '@jjangmilk__') { 
                    setIsLocked(false);
                  } else {
                    alert('비밀번호가 틀렸습니다.');
                    setPasswordInput('');
                  }
                }
              }}
              className="flex-1 bg-black/20 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-[#5ca5d4] text-sm text-white placeholder:text-white/30 transition-colors"
              placeholder="비밀번호 입력"
              autoFocus
            />
            <button
              onClick={() => {
                if (passwordInput === '@jjangmilk__') {
                  setIsLocked(false);
                } else {
                  alert('비밀번호가 틀렸습니다.');
                  setPasswordInput('');
                }
              }}
              className="bg-[#5ca5d4] hover:bg-[#499bc8] text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shrink-0"
            >
              입장
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SettingsProvider settings={{
      theme,
      fontSize,
      textFontSize,
      fontFamily,
      cssFormat,
      disableOtherColor,
      showTabNames,
      mergeTabStyles,
      charSettings,
      tabSettings,
      hideEmptyAvatars,
      hideAllAvatars,
      narrationCharacter,
      enableSentenceSpacing,
      lineHeight,
      letterSpacing,
      blockSpacing,
      contentPadding,
      avatarSizeValue,
      showLogDivider
    }}>
      <div 
        className="flex flex-col md:flex-row h-[100dvh] bg-[#121212] font-sans text-zinc-200 overflow-hidden relative"
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.types.some(t => t === 'Files')) {
            setIsDraggingFile(true);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingFile(false);
        }}
      >
        {isDraggingFile && (
          <div 
            className="absolute inset-0 z-[1000000] bg-[#050505]/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (e.target === e.currentTarget) {
                setIsDraggingFile(false);
              }
            }}
            onDrop={handleGlobalDrop}
          >
            <div className="pointer-events-none flex flex-col items-center justify-center w-full max-w-xl p-16 rounded-[2.5rem] border-2 border-dashed border-[#499bc8]/50 bg-[#499bc8]/5 backdrop-blur-2xl shadow-[0_0_100px_rgba(230,0,92,0.15)] animate-in zoom-in-95 duration-300 mx-4">
              <div className="relative flex items-center justify-center w-24 h-24 mb-6 rounded-3xl bg-black/20">
                <FileDown className="w-10 h-10 text-[#499bc8] animate-bounce drop-shadow-[0_0_15px_rgba(230,0,92,0.5)]" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2 drop-shadow-md">파일을 여기에 놓아주세요</h2>
              <p className="text-white/50 text-xs sm:text-sm font-medium">HTML 로그 파일 또는 JSON 프로젝트 백업</p>
            </div>
          </div>
        )}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "w-full md:w-[420px] bg-[#1a1a1a] border-r border-white/5 flex-col shadow-2xl z-20 shrink-0",
          mobileTab === 'settings' ? 'flex' : 'hidden md:flex'
        )}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/5 bg-[#1a1a1a] shrink-0">
          <div className="flex items-center justify-between gap-4">
            
            {/* 왼쪽: 아이콘 및 제목 */}
            <div className="flex items-center gap-3 min-w-0">
              {/* 아이콘 색상을 파란색(#5ca5d4)으로 변경 */}
              <div className="w-10 h-10 bg-[#499bc8] rounded-xl shadow-lg shrink-0 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex flex-col justify-center gap-0.5">
                <h1 className="text-[16px] font-bold text-white whitespace-nowrap leading-tight">코코포리아 로그 편집기</h1>
                <h1 className="text-[16px] font-bold text-white whitespace-nowrap leading-tight">스탠딩&표정 확장판</h1>
              </div>
            </div>

            {/* 오른쪽: 크레딧 및 경고 문구 */}
            <div className="flex flex-col items-start text-left shrink-0 text-[13px] text-white/50 font-medium leading-[1.4]">
              <p>사이트 원본: 한냥</p>
              <p>기능추가: 밀크</p>
              <p>!! 외부 유출XX !!</p>
            </div>
            
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/5 bg-[#1a1a1a] shrink-0">
          {[
            { id: 'files', icon: Upload, label: '파일' },
            { id: 'tabs', icon: Settings, label: '탭' },
            { id: 'chars', icon: User, label: '캐릭터' },
            { id: 'illustrations', icon: ImageIcon, label: '삽화' },
            { id: 'settings', icon: Palette, label: '디자인' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-all relative ${
                activeTab === tab.id ? 'text-[#499bc8]' : 'text-white/30 hover:text-white/60'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#499bc8] "
                />
              )}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6" ref={sidebarScrollRef}>
          <AnimatePresence 
            mode="wait"
            onExitComplete={() => {
              if (sidebarScrollRef.current) {
                // Ensure immediate position restoration happens after unmount, but before remount finishes
                // using a setTimeout of 0 pushes it to the end of the execution queue 
                // so the DOM can update and actually accept the new scrollTop
                setTimeout(() => {
                  if (sidebarScrollRef.current) {
                    sidebarScrollRef.current.scrollTop = scrollPositions.current[activeTab] || 0;
                  }
                }, 0);
              }
            }}
          >
            {activeTab === 'files' && (
              <motion.div 
                key="files"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Section>
                  <SectionTitle icon={MessageSquare} title="로그 업로드" />
                  <label 
                    htmlFor="main-log-upload"
                    className="w-full h-[50px] px-3 flex items-center justify-between border-2 border-dashed border-white/5 rounded-xl hover:border-[#499bc8] hover:bg-[#499bc8]/5 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors shrink-0",
                        originalFileName ? "bg-[#499bc8]/20" : "bg-[#242424] group-hover:bg-[#499bc8]/20"
                      )}>
                        <Upload className={cn(
                          "w-3.5 h-3.5 transition-colors",
                          originalFileName ? "text-[#499bc8]" : "text-white/20 group-hover:text-[#499bc8]"
                        )} />
                      </div>
                      <div className="text-left w-full overflow-hidden">
                        <p className={cn(
                          "text-[11px] font-bold truncate leading-none mt-0.5 transition-colors",
                          originalFileName ? "text-white/90" : "text-white/60"
                        )}>
                          {originalFileName ? `${originalFileName}.html` : 'HTML 로그 파일 선택'}
                        </p>
                      </div>
                    </div>
                    {originalFileName ? (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setLogs([]);
                          setOriginalFileName('');
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0 flex items-center justify-center w-6 h-6 z-10 relative"
                        title="업로드 취소"
                      >
                        <X className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                      </button>
                    ) : (
                      <div className="w-6 h-6 shrink-0" />
                    )}
                  </label>
                  <input type="file" id="main-log-upload" ref={fileInputRef} onChange={handleLogUpload} accept=".html" className="hidden" />
                </Section>

                <Section>
                  <SectionTitle 
                    icon={Palette} 
                    title="프로젝트 관리"
                    tooltip={
                      <div className="text-[11px] leading-relaxed w-[220px] text-left">
                        <p className="mb-2">
                          섹션 분할, 삽화, 탭, 캐릭터 설정 등 현재의 모든 편집 데이터를 JSON 파일로 내보냅니다. 원본 로그를 업로드한 상태에서 이 파일을 불러오면 이전 작업 상태를 그대로 복원합니다.
                        </p>
                        <p className="text-[#499bc8] font-medium">
                          프로젝트 파일은 편집 정보만 포함하므로, 원본 로그 파일이 없으면 복원되지 않습니다.
                        </p>
                      </div>
                    }
                  />
                  <div 
                    onClick={() => {
                      if (logs.length > 0) styleInputRef.current?.click();
                    }}
                    className={cn(
                      "w-full h-[50px] px-3 flex items-center justify-between border-2 border-dashed rounded-xl transition-all group",
                      logs.length > 0 
                        ? "border-white/5 hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer"
                        : "border-white/5 opacity-50 cursor-not-allowed bg-white/5"
                    )}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={cn(
                        "p-1.5 rounded-lg transition-colors shrink-0",
                        jsonFileName ? "bg-blue-500/20" : (logs.length > 0 ? "bg-[#242424] group-hover:bg-blue-500/20" : "bg-white/5")
                      )}>
                        <FileJson className={cn(
                          "w-3.5 h-3.5 transition-colors",
                          jsonFileName ? "text-blue-400" : (logs.length > 0 ? "text-white/20 group-hover:text-blue-400" : "text-white/20")
                        )} />
                      </div>
                      <div className="text-left w-full overflow-hidden">
                        <p className={cn(
                          "text-[11px] font-bold truncate leading-none mt-0.5 transition-colors",
                          jsonFileName ? "text-white/90" : "text-white/60",
                          logs.length === 0 && "opacity-50"
                        )}>
                          {jsonFileName || '프로젝트 파일(.json) 선택'}
                        </p>
                      </div>
                    </div>
                    {jsonFileName ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setJsonFileName('');
                          if (styleInputRef.current) styleInputRef.current.value = '';
                        }}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors shrink-0 flex items-center justify-center w-6 h-6"
                        title="업로드 취소"
                      >
                        <X className="w-3.5 h-3.5 text-white/60 hover:text-white" />
                      </button>
                    ) : (
                      <div className="w-6 h-6 shrink-0" />
                    )}
                  </div>
                  <input type="file" ref={styleInputRef} onChange={handleProjectUpload} accept=".json" className="hidden" />
                </Section>
              </motion.div>
            )}

            {activeTab === 'tabs' && (
              <motion.div 
                key="tabs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Section>
                  <div className="space-y-2">
                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl  space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white/70">탭 이름 표시</span>
                      </div>
                      <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5 gap-0.75">
                        {(['main', 'other', 'info', 'secret'] as TabFormat[]).map(f => (
                          <button
                            key={f}
                            onClick={() => {
                              const next = new Set(showTabNames);
                              if (next.has(f)) next.delete(f);
                              else next.add(f);
                              setShowTabNames(next);
                              saveToHistory({ showTabNames: Array.from(next) });
                            }}
                            className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${
                              showTabNames.has(f) 
                                ? 'bg-[#499bc8] text-white ' 
                                : 'text-white/30 hover:text-white/60'
                            }`}
                          >
                            {f === 'main' ? '메인' : f === 'other' ? '잡담' : f === 'info' ? '정보' : '비밀'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl  space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white/70">발언자별 통합</span>
                        <div className="text-[9px] text-white/30 font-medium text-right">
                          연속되는 대사를 하나의 블록으로 합칩니다.
                        </div>
                      </div>
                      <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5 gap-0.75">
                        {(['main', 'other', 'info', 'secret'] as TabFormat[]).map(f => (
                          <button
                            key={f}
                            onClick={() => {
                              const next = new Set(mergeTabs);
                              if (next.has(f)) next.delete(f);
                              else next.add(f);
                              setMergeTabs(next);
                            }}
                            className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${
                              mergeTabs.has(f) 
                                ? 'bg-[#499bc8] text-white ' 
                                : 'text-white/30 hover:text-white/60'
                            }`}
                          >
                            {f === 'main' ? '메인' : f === 'other' ? '잡담' : f === 'info' ? '정보' : '비밀'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 border border-white/5 rounded-xl  space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white/70">탭별 통합</span>
                        <div className="text-[9px] text-white/30 font-medium text-right">
                          동일한 탭의 블록을 연결합니다.
                        </div>
                      </div>
                      <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5 gap-0.75">
                        {(['main', 'other', 'info', 'secret'] as TabFormat[]).map(f => {
                          const isDisabled = f === 'main' || f === 'other';
                          return (
                            <button
                              key={f}
                              disabled={isDisabled}
                              onClick={() => {
                                const next = new Set(mergeTabStyles);
                                if (next.has(f)) next.delete(f);
                                else next.add(f);
                                setMergeTabStyles(next);
                              }}
                              className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${
                                isDisabled 
                                  ? 'bg-transparent text-white/10 cursor-not-allowed'
                                  : mergeTabStyles.has(f) 
                                    ? 'bg-[#499bc8] text-white ' 
                                    : 'text-white/30 hover:text-white/60'
                              }`}
                            >
                              {f === 'main' ? '메인' : f === 'other' ? '잡담' : f === 'info' ? '정보' : '비밀'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </Section>

                <Section>
                  <SectionTitle 
                    icon={Settings} 
                    title="개별 탭 설정" 
                    tooltip={<div className="text-[11px] leading-relaxed w-[210px] text-left">Alt 키를 누른 채로 클릭하면 해당 항목만 남기고 모두 숨길 수 있습니다.</div>} 
                    rightElement={
                      <div className="flex items-center gap-1.5">
                        <button 
                          onClick={handleRandomizeTabColors}
                          className="flex items-center gap-1 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-white/40 hover:text-white transition-all border border-white/5"
                          title="모든 탭에 무작위 색상을 겹치지 않게 지정합니다"
                        >
                          <Palette className="w-3 h-3" />
                          무작위 색상 지정
                        </button>
                        <button 
                          onClick={() => {
                            setTabSortMode(prev => prev === 'appearance' ? 'alphabetical' : 'appearance');
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-white/40 hover:text-white transition-all border border-white/5"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          {tabSortMode === 'appearance' ? '등장순' : '가나다순'}
                        </button>
                      </div>
                    }
                  />
                  <div className="space-y-2">
                  {sortedTabOrder.length > 0 ? (
                    sortedTabOrder.map(tabId => {
                      const tab = tabSettings[tabId];
                      if (!tab) return null;
                      return (
                        <div key={tab.id} className="p-3 bg-white/5 rounded-xl border border-white/5  flex flex-col gap-3">
                        <div className="flex items-center gap-2">
                          <Toggle 
                            enabled={tab.visible} 
                            onChange={(val, e) => {
                              if (e && e.altKey) {
                                let next = { ...tabSettings };
                                const isSolo = Object.keys(next).every(k => k === tab.id ? next[k].visible : !next[k].visible);
                                if (isSolo) {
                                  Object.keys(next).forEach(k => next[k] = { ...next[k], visible: true });
                                } else {
                                  Object.keys(next).forEach(k => next[k] = { ...next[k], visible: false });
                                  next[tab.id].visible = true;
                                }
                                setTabSettings(next);
                                saveToHistory({ charSettings, tabSettings: next, cssFormat, fontSize, fontFamily, theme, disableOtherColor });
                              } else {
                                const next = { ...tabSettings, [tab.id]: { ...tab, visible: val } };
                                setTabSettings(next);
                                saveToHistory({ charSettings, tabSettings: next, cssFormat, fontSize, fontFamily, theme, disableOtherColor });
                              }
                            }} 
                          />
                          {renamingTab === tab.id ? (
                            <div className="flex gap-1 flex-1">
                              <input 
                                type="text"
                                value={newTabNameInput}
                                autoFocus
                                onChange={(e) => setNewTabNameInput(e.target.value)}
                                onBlur={() => renameTab(tab.id, newTabNameInput)}
                                onKeyDown={(e) => {
                                  if (e.nativeEvent.isComposing) return;
                                  if (e.key === 'Enter') renameTab(tab.id, newTabNameInput);
                                  if (e.key === 'Escape') setRenamingTab(null);
                                }}
                                className="bg-black/40 text-[11px] font-bold text-white px-2 py-1 rounded border border-[#499bc8] outline-none flex-1"
                              />
                              <button 
                                onClick={() => renameTab(tab.id, newTabNameInput)}
                                className="p-1 bg-[#499bc8] text-white rounded"
                              >
                                <CheckSquare className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 flex-1 overflow-hidden">
                              <span 
                                className="text-[11px] font-bold truncate text-white/80"
                              >
                                {tab.name}
                              </span>
                              <button 
                                onClick={() => { setRenamingTab(tab.id); setNewTabNameInput(tab.name); }}
                                className="p-1 text-white/20 hover:text-[#499bc8] transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5 gap-3 flex-1">
                            {(['main', 'other', 'info', 'secret'] as TabFormat[]).map(f => (
                              <button
                                key={f}
                                onClick={() => {
                                  const next = { ...tabSettings, [tab.id]: { ...tab, format: f } };
                                  setTabSettings(next);
                                  saveToHistory({ charSettings, tabSettings: next, cssFormat, fontSize, fontFamily, theme, disableOtherColor });
                                }}
                                className={`flex-1 py-1 text-[9px] font-bold rounded-md transition-all ${
                                  tab.format === f 
                                    ? 'bg-[#499bc8] text-white ' 
                                    : 'text-white/30 hover:text-white/60'
                                }`}
                              >
                                {f === 'main' ? '메인' : f === 'other' ? '잡담' : f === 'info' ? '정보' : '비밀'}
                              </button>
                            ))}
                          </div>
                          
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                if (activeColorPicker === `tab-${tab.id}`) {
                                  setActiveColorPicker(null);
                                  setColorPickerRect(null);
                                } else {
                                  setActiveColorPicker(`tab-${tab.id}`);
                                  setColorPickerRect(e.currentTarget.getBoundingClientRect());
                                }
                              }}
                              className="w-6 h-6 rounded-md border border-white/10  transition-all hover:scale-105"
                              style={{ backgroundColor: tab.color || '#ffd400' }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                    <div className="text-center py-20 text-white/10">
                      <Settings className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">로그를 먼저 업로드하세요</p>
                    </div>
                  )}
                  </div>
                </Section>
              </motion.div>
            )}

            {activeTab === 'chars' && (
              <motion.div 
                key="chars"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Section>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl  relative h-11" ref={narrationDropdownRef}>
                      <span className="text-[11px] font-bold text-white/70">나레이션 캐릭터</span>
                      <div className="relative">
                        <button
                          onClick={() => setIsNarrationDropdownOpen(!isNarrationDropdownOpen)}
                          className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-lg text-[10px] text-white/80 px-2 py-1 outline-none hover:border-white/20 transition-colors"
                        >
                          <span className="max-w-[100px] truncate">{narrationCharacter ? charSettings[narrationCharacter]?.name || narrationCharacter : '선택 안 함'}</span>
                          <ChevronDown className="w-3 h-3 opacity-50" />
                        </button>
                        
                        {isNarrationDropdownOpen && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-[#222] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
                              <button
                                onClick={() => {
                                  setNarrationCharacter(null);
                                  saveToHistory({ narrationCharacter: null });
                                  setIsNarrationDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-[11px] rounded-lg transition-colors",
                                  !narrationCharacter ? "bg-[#499bc8] text-white font-bold" : "text-white/60 hover:bg-white/5 hover:text-white"
                                )}
                              >
                                선택 안 함
                              </button>
                              {Object.keys(charSettings).map(charId => {
                                const char = charSettings[charId];
                                if (!char) return null;
                                return (
                                  <button
                                    key={charId}
                                    onClick={() => {
                                      setNarrationCharacter(charId);
                                      saveToHistory({ narrationCharacter: charId });
                                      setIsNarrationDropdownOpen(false);
                                    }}
                                    className={cn(
                                      "w-full text-left px-3 py-2 text-[11px] rounded-lg transition-colors truncate",
                                      narrationCharacter === charId ? "bg-[#499bc8] text-white font-bold" : "text-white/60 hover:bg-white/5 hover:text-white"
                                    )}
                                  >
                                    {char.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {narrationCharacter && (
                      <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl  h-11">
                        <span className="text-[11px] font-bold text-white/70">나레이션 문단 자동 나누기</span>
                        <Toggle 
                          enabled={enableSentenceSpacing} 
                          onChange={(val) => {
                            setEnableSentenceSpacing(val);
                            saveToHistory({ enableSentenceSpacing: val });
                          }} 
                        />
                      </div>
                    )}
                
                    </div>
                </Section>

                <Section>
                  <SectionTitle 
                    icon={List} 
                    title="발언자 목록" 
                    tooltip={<div className="text-[11px] leading-relaxed w-[210px] text-left">Alt 키를 누른 채로 클릭하면 해당 항목만 남기고 모두 숨길 수 있습니다.</div>}
                    rightElement={
                      <div className="flex items-center gap-2">
                        
                        <button 
                          onClick={() => {
                            if (charSortMode === 'appearance') {
                              setCharSortMode('alphabetical');
                            } else {
                              const allCharIds = Object.keys(charSettings);
                              const seen = new Set<string>();
                              const newOrder: string[] = [];
                              logs.forEach(log => {
                                if (log.charId && allCharIds.includes(log.charId) && !seen.has(log.charId)) {
                                  seen.add(log.charId);
                                  newOrder.push(log.charId);
                                }
                              });
                              allCharIds.forEach(id => {
                                if (!seen.has(id)) {
                                  newOrder.push(id);
                                }
                              });
                              setCharOrder(newOrder);
                              setCharSortMode('appearance');
                              saveToHistory({ charOrder: newOrder, charSortMode: 'appearance' });
                            }
                          }}
                          className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-white/40 hover:text-white transition-all border border-white/5"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          {charSortMode === 'appearance' ? '등장순' : '가나다순'}
                        </button>
                      </div>
                    }

                    
                  />
                  <div className="flex items-stretch gap-2 mb-4">
  <input
    type="text"
    value={ccfoliaRoomUrl}
    onChange={(e) => setCcfoliaRoomUrl(e.target.value)}
    placeholder="https://ccfolia.com/rooms/..."
    /* 조건문을 지우고 항상 어두운 사이드바에 어울리는 색상으로 고정합니다 */
    className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#499bc8]"
    onKeyDown={(e) => {
      if (e.nativeEvent.isComposing) return;
      if (e.key === 'Enter' && ccfoliaRoomUrl.trim()) {
        handleCcfoliaRoomFetch();
      }
    }}
  />
                    <button
                      onClick={handleCcfoliaRoomFetch}
                      disabled={!ccfoliaRoomUrl.trim() || isCcfoliaLoading}
                      className="w-[110px] bg-[#499bc8] hover:bg-[#2767a4] disabled:opacity-50 disabled:hover:bg-[#499bc8] text-white rounded-xl font-bold shrink-0 flex flex-col items-center justify-center transition-colors "
                    >
                      {isCcfoliaLoading ? (
                        <span className="animate-spin w-5 h-5 border-2 border-white/20 border-t-white rounded-full" />
                      ) : (
                        <>
                          <span className="text-[10px] opacity-90 leading-tight">코코포리아 룸</span>
                          <span className="text-sm leading-tight mt-0.5">불러오기</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mb-3 flex gap-1.5">
                    <input
                      type="text"
                      placeholder="추가할 캐릭터 이름 입력..."
                      value={newCharName}
                      onChange={(e) => setNewCharName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return;
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newCharName.trim()) {
                            addCustomCharacter(newCharName);
                            setNewCharName('');
                          } else {
                            addCustomCharacter();
                          }
                        }
                      }}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-white placeholder:text-white/30 outline-none focus:border-[#499bc8] transition-colors"
                    />
                    <button
                      onClick={() => {
                        if (newCharName.trim()) {
                          addCustomCharacter(newCharName);
                          setNewCharName('');
                        } else {
                          addCustomCharacter();
                        }
                      }}
                      className="shrink-0 flex items-center justify-center gap-1 px-3 bg-[#499bc8] hover:bg-[#2767a4] rounded-xl transition-all text-white text-[10px] font-bold "
                    >
                      <Plus className="w-3.5 h-3.5" />
                      추가
                    </button>
                  </div>
                  {sortedCharOrder.length > 0 ? (
                    <div className="space-y-2">
                    {sortedCharOrder.map(charId => {
                      const char = charSettings[charId];
                      if (!char) return null;
                      return (
                        <div key={char.id} className="p-2 bg-white/5 rounded-2xl border border-white/5  flex flex-col gap-2 relative group/charitem">
                          <div className="flex items-center gap-2 w-full min-w-0">
                          <div className="shrink-0 flex items-center h-7">
                            <Toggle 
                              enabled={char.visible} 
                              onChange={(val, e) => {
                                if (e && e.altKey) {
                                  let next = { ...charSettings };
                                  const isSolo = Object.keys(next).every(k => k === char.id ? next[k].visible : !next[k].visible);
                                  if (isSolo) {
                                    Object.keys(next).forEach(k => next[k] = { ...next[k], visible: true });
                                  } else {
                                    Object.keys(next).forEach(k => next[k] = { ...next[k], visible: false });
                                    next[char.id].visible = true;
                                  }
                                  setCharSettings(next);
                                  saveToHistory({ charSettings: next, tabSettings, cssFormat, fontSize, fontFamily, theme, disableOtherColor });
                                } else {
                                  const next = { ...charSettings, [char.id]: { ...char, visible: val } };
                                  setCharSettings(next);
                                  saveToHistory({ charSettings: next, tabSettings, cssFormat, fontSize, fontFamily, theme, disableOtherColor });
                                }
                              }} 
                            />
                          </div>
                          
                          {renamingChar === char.id ? (
                            <div className="flex items-center gap-1 w-32 shrink-0 h-7">
                              <input 
                                type="text" 
                                value={newNameInput}
                                onChange={(e) => setNewNameInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.nativeEvent.isComposing) return;
                                  if (e.key === 'Enter') renameCharacter(char.id, newNameInput);
                                  if (e.key === 'Escape') setRenamingChar(null);
                                }}
                                className="w-full text-[10px] font-bold px-1 py-1 border border-[#499bc8] rounded outline-none bg-black/20 text-white"
                                autoFocus
                              />
                              <button 
                                onClick={() => renameCharacter(char.id, newNameInput)}
                                className="p-1 bg-[#499bc8] text-white rounded"
                              >
                                <CheckSquare className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 w-24 shrink-0 overflow-visible relative h-7">
                              <CharacterNameWithTooltip name={char.name} />
                              <button 
                                onClick={() => { setRenamingChar(char.id); setNewNameInput(char.name); }}
                                className="p-0.5 text-white/20 hover:text-[#499bc8] transition-colors"
                              >
                                <Pencil className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          )}

                          <div className="relative shrink-0 flex items-center h-7">
                            <button
                              onClick={(e) => {
                                if (activeColorPicker === char.id) {
                                  setActiveColorPicker(null);
                                  setColorPickerRect(null);
                                } else {
                                  setActiveColorPicker(char.id);
                                  setColorPickerRect(e.currentTarget.getBoundingClientRect());
                                }
                              }}
                              className="w-5 h-5 rounded-md border border-white/10  transition-transform active:scale-90"
                              style={{ backgroundColor: char.color }}
                            />
                          </div>

                          
                          <div className="flex items-stretch justify-end gap-1 ml-auto h-8 shrink-0">
                            
                            {/* 💡 공간을 확 줄인 스탠딩 복사 드롭다운 */}
                            <div className="flex items-center bg-[#499bc8]/10 border border-[#499bc8]/30 rounded hover:bg-[#499bc8]/20 transition-colors">
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    copyCharacterData(char.id, e.target.value);
                                    e.target.value = ""; 
                                  }
                                }}
                                className="bg-transparent text-[#499bc8] text-[9px] font-bold outline-none cursor-pointer w-[56px] text-center px-1"
                              >
                                {/* 별도의 텍스트 라벨 없이 기본 옵션 이름 자체를 '복사'로 변경 */}
                                <option value="" className="bg-zinc-800">복사</option>
                                {sortedCharOrder.filter(id => id !== char.id).map(id => (
                                  <option key={id} value={id} className="bg-zinc-800">
                                    {charSettings[id].name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <button 
                              onClick={() => {
                                const firstExprUrl = (char as any).expressions?.[0]?.url || char.imageUrl;
                                const refUrl = selectedCropRef[char.id] || firstExprUrl || '';
                                
                                const excludedArray = (char as any).excludedCropUrls || [];
                                setCropExcludedExpressions(new Set(excludedArray));

                                setCropModal({
                                  isOpen: true,
                                  charId: char.id,
                                  imageUrl: refUrl,
                                  crop: (char as any).rawCropState || { x: 0, y: 0 },
                                  zoom: (char as any).rawZoomState || 1
                                });
                              }}
                              className="px-1.5 py-0.5 bg-[#499bc8]/20 hover:bg-[#499bc8]/40 text-[#499bc8] hover:text-white border border-[#499bc8]/30 rounded text-[8px] font-bold transition-colors flex items-center justify-center gap-0.5 min-w-[46px] leading-tight shrink-0"
                            >
                              <Scissors className="w-2.5 h-2.5 shrink-0" />
                              <div className="flex flex-col text-center">
                                <span>영역</span>
                                <span>지정</span>
                              </div>
                            </button>
                            
                            <button 
                              onClick={() => handleAddFileExpression(char.id)}
                              className="px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-[8px] font-bold transition-colors flex items-center justify-center gap-0.5 min-w-[46px] leading-tight shrink-0"
                            >
                              <span className="text-[10px] leading-none shrink-0">+</span>
                              <div className="flex flex-col text-center">
                                <span>PC</span>
                                <span>추가</span>
                              </div>
                            </button>
                          </div>
                          

                          </div>
                          {(char as any).expressions && (char as any).expressions.length > 0 && (
                          <div className="mt-2 p-2 bg-black/20 rounded-xl border border-white/5 flex gap-2 overflow-x-auto custom-scrollbar">
                            {(char as any).expressions.map((expr: any, idx: number) => (
                              <div key={idx} className="relative group shrink-0">
                                <div
                                  onClick={() => setSelectedCropRef(prev => ({ ...prev, [char.id]: expr.url }))}
                                  className={cn(
                                    "w-16 h-16 rounded overflow-hidden bg-black/40 mb-1 border-2 cursor-pointer transition-all relative",
                                    (selectedCropRef[char.id] || char.imageUrl) === expr.url
                                      ? "border-[#499bc8] shadow-[0_0_8px_rgba(73,155,200,0.5)]"
                                      : "border-white/10 hover:border-white/30"
                                  )}
                                >
                                  <img
                                    src={expr.url}
                                    alt={expr.label}
                                    className="w-full h-full object-cover object-top pointer-events-none"
                                    referrerPolicy="no-referrer"
                                  />
                                  {(selectedCropRef[char.id] || char.imageUrl) === expr.url && (
                                    <div className="absolute top-1 left-1 bg-[#499bc8] text-white text-[8px] font-bold px-1 py-0.5 rounded shadow-sm">
                                      기준
                                    </div>
                                  )}
                                </div>
                                <div className="text-[10px] text-center text-stone-300 font-medium truncate w-16 px-1">
                                  {expr.label}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        </div>
                      );
                    })}

                  </div>
                ) : (
                  <div className="text-center py-20 text-white/10">
                    <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">로그를 먼저 업로드하세요</p>
                  </div>
                )}
                </Section>
              </motion.div>
            )}

            {activeTab === 'illustrations' && (
              <motion.div 
                key="illustrations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <Section>
                  <SectionTitle 
                    icon={Settings2} 
                    title="일괄 설정 변경"
                  />
                  <div className="mt-2.5 p-2 px-3 bg-white/5 border border-white/5 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
                    {/* Left: Alignment Selector & Size Control */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 정렬 버튼 (좌, 중, 우) */}
                      <div className="flex bg-black/20 p-0.5 rounded-lg border border-white/5 h-7 items-center">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <button
                            key={align}
                            onClick={() => setDefaultIllAlign(align)}
                            className={cn(
                              "h-6 px-2 flex items-center justify-center rounded transition-all",
                              defaultIllAlign === align 
                                ? "bg-white/10 text-white font-bold " 
                                : "text-white/30 hover:text-white/60"
                            )}
                            title={align === 'left' ? '왼쪽' : align === 'center' ? '가운데' : '오른쪽'}
                          >
                            {align === 'left' ? (
                              <AlignLeft className="w-3 h-3" />
                            ) : align === 'center' ? (
                              <AlignCenter className="w-3 h-3" />
                            ) : (
                              <AlignRight className="w-3 h-3" />
                            )}
                          </button>
                        ))}
                      </div>

                      {/* 드롭다운/입력창 겸용 크기 제어기 + 단위 선택 버튼 (% / px) */}
                      <SizeControl value={defaultIllWidth} onChange={setDefaultIllWidth} />
                    </div>

                    {/* Right: 일괄 적용 버튼 */}
                    <button
                      onClick={handleApplyBulkIllustrationSettings}
                      className="py-1.5 px-3 bg-[#499bc8] hover:bg-[#2767a4] text-white text-[10px] font-bold rounded-lg transition-all active:scale-[0.98] shadow-md shadow-[#499bc8]/10 shrink-0"
                    >
                      일괄 적용
                    </button>
                  </div>
                </Section>

                <Section>
                  <SectionTitle 
                    icon={ImageIcon} 
                    title="삽화 목록"
                    tooltip={
                      <div className="text-[11px] leading-relaxed w-[260px] text-left break-keep">
                        Imgur 앨범 주소를 입력하고 불러오기를 누르면 이미지 파일들을 한번에 등록할 수 있습니다. (url 형식: https://imgur.com/a/앨범주소)<br/><br/>
                        삽화를 삽입할 땐 손잡이를 잡고 원하는 위치로 드래그하거나, 로그 #를 입력하면 됩니다. 로그 #는 미리보기 탭에서 로그 블럭에 마우스를 올려 확인할 수 있습니다.<br/><br/>
                        위치 아이콘(<MapPin className="w-3 h-3 inline text-white/50 mb-0.5 mx-0.5"/>)을 누르면 삽화의 위치로 이동할 수 있습니다.<br/><br/>
                        탭 드롭다운으로 소속된 탭을 바꿀 수 있습니다. (자동: 바로 직전 대사의 탭을 따라감)
                      </div>
                    }
                    rightElement={
                      logs.length > 0 ? (
                        <div className="flex items-center gap-1.5 min-w-0 max-w-[180px] sm:max-w-[240px]">
                          <input
                            type="text"
                            placeholder="Imgur 앨범 주소"
                            value={illBulkUrl}
                            onChange={(e) => setIllBulkUrl(e.target.value)}
                            className="flex-1 min-w-0 text-[9px] px-2 py-1.5 bg-black/40 border border-white/10 rounded-lg outline-none focus:border-[#499bc8] text-white/80 transition-colors placeholder:text-white/20"
                          />
                          <button
                            onClick={handleIllBulkFetch}
                            disabled={isIllBulkLoading || !illBulkUrl}
                            className="px-2.5 py-1.5 bg-[#499bc8] hover:bg-[#2767a4] disabled:bg-white/5 disabled:cursor-not-allowed disabled:text-white/20 text-white text-[9px] font-bold rounded-lg transition-all whitespace-nowrap active:scale-95 flex items-center gap-1"
                          >
                            {isIllBulkLoading ? '불러오는 중...' : '불러오기'}
                          </button>
                        </div>
                      ) : undefined
                    }
                  />

                  {logs.length > 0 ? (
                    illustrations.length > 0 ? (
                      <div className="space-y-2 mt-3">
                        {illustrations.map((ill) => {
                          let prevLog = null;
                          let nextLog = null;
                          if (ill.afterLogIndex !== null) {
                            for (let i = ill.afterLogIndex; i >= 0; i--) {
                              if (logs[i] && !logs[i].isIllustration) {
                                prevLog = logs[i];
                                break;
                              }
                            }
                            for (let i = ill.afterLogIndex + 1; i < logs.length; i++) {
                              if (logs[i] && !logs[i].isIllustration) {
                                nextLog = logs[i];
                                break;
                              }
                            }
                          }

                          const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '');
                          const prevSummary = ill.afterLogIndex !== null ? (prevLog ? `${prevLog.name || '무명'}: ${stripHtml(prevLog.content)}` : '(없음)') : '위치 미지정';
                          const nextSummary = ill.afterLogIndex !== null ? (nextLog ? `${nextLog.name || '무명'}: ${stripHtml(nextLog.content)}` : '(없음)') : '위치 미지정';
                          return (
                            <div 
                              key={ill.id} 
                              className="flex items-center gap-3.5 p-2.5 bg-white/5 border border-white/5 rounded-2xl text-white relative pr-6.5 group/ill"
                            >
                              <div 
                                className="w-16 h-16 shrink-0 bg-black/40 border border-white/10 rounded-xl overflow-hidden flex items-center justify-center relative group cursor-zoom-in"
                                onMouseEnter={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setHoverImgRect(rect);
                                  setHoverImgUrl(ill.url);
                                  setHoverImgLabel(ill.imageName || null);
                                }}
                                onMouseLeave={() => {
                                  setHoverImgRect(null);
                                  setHoverImgUrl(null);
                                  setHoverImgLabel(null);
                                }}
                              >
                                <img src={ill.url} className="w-full h-full object-cover" alt="삽화" referrerPolicy="no-referrer" />
                              </div>

                              <div className="flex-grow flex flex-col gap-2 min-w-0">
                                {/* Line 1: ID, Tab */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1 shrink-0">

                                    <div className="flex bg-black/30 border border-white/10 rounded-lg focus-within:border-[#499bc8] transition-colors overflow-hidden h-7">
                                      <button 
                                        className="px-2 flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white border-r border-white/10 bg-white/5"
                                        onClick={() => {
                                          if (ill.afterLogIndex !== null) {
                                            const val = Math.max(1, Math.min(logs.length, ill.afterLogIndex));
                                            onUpdateIllustration(ill.id, { afterLogIndex: val - 1 });
                                          }
                                        }}
                                      ><ChevronLeft className="w-3 h-3"/></button>
                                      <input
                                        type="text"
                                        value={ill.afterLogIndex !== null ? ill.afterLogIndex + 1 : ''}
                                        placeholder="#"
                                        onChange={(e) => {
                                          if (e.target.value === '') {
                                            onUpdateIllustration(ill.id, { afterLogIndex: null });
                                            return;
                                          }
                                          let val = parseInt(e.target.value);
                                          if (isNaN(val)) return;
                                          val = Math.max(1, Math.min(logs.length, val));
                                          onUpdateIllustration(ill.id, { afterLogIndex: val - 1 });
                                        }}
                                        className="bg-transparent text-center text-[10px] text-white/80 outline-none w-10 font-mono font-bold placeholder:text-white/20"
                                      />
                                      <button 
                                        className="px-2 flex items-center justify-center hover:bg-white/10 text-white/40 hover:text-white border-l border-white/10 bg-white/5"
                                        onClick={() => {
                                          if (ill.afterLogIndex !== null) {
                                            const val = Math.max(1, Math.min(logs.length, ill.afterLogIndex + 2));
                                            onUpdateIllustration(ill.id, { afterLogIndex: val - 1 });
                                          } else {
                                            onUpdateIllustration(ill.id, { afterLogIndex: logs.length > 0 ? logs.length - 1 : 0 });
                                          }
                                        }}
                                      ><ChevronRight className="w-3 h-3"/></button>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[9px] text-white/30 font-bold whitespace-nowrap">탭</span>
                                    <div className="w-[100px]">
                                      <SearchableSelect 
                                        value={ill.tabOverride || 'auto'}
                                        onChange={(val) => onUpdateIllustration(ill.id, { tabOverride: val })}
                                        options={[
                                          { label: '자동', value: 'auto' },
                                          ...Object.entries(tabSettings).map(([tabId, tab]: [string, any]) => ({
                                            label: tab.name || tabId,
                                            value: tabId,
                                            isGrayed: tab.visible === false
                                          }))
                                        ]}
                                        placeholder="자동"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Line 2: Info Text, Action Buttons */}
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex flex-col gap-0.5 text-[9px] text-white/40 font-medium min-w-0 flex-1" title={`위: ${prevSummary}\n아래: ${nextSummary}`}>
                                    <div className="flex items-center gap-1">
                                      <ArrowUp className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{prevSummary}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <ArrowDown className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{nextSummary}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => scrollToIllustrationLog(ill.afterLogIndex)}
                                      className="p-1.5 bg-white/5 hover:bg-[#499bc8]/20 text-white/50 hover:text-[#499bc8] rounded-lg transition-all active:scale-95 shrink-0 flex items-center justify-center"
                                      title="미리보기 위치로 이동"
                                    >
                                      <MapPin className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => onRemoveIllustration(ill.id)}
                                      className="p-1.5 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-lg transition-all active:scale-95 shrink-0 flex items-center justify-center"
                                      title="삭제"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* 우측 세로 길쭉한 손잡이 */}
                              <div
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", ill.id);
                                  e.dataTransfer.setData("application/json", JSON.stringify({ type: "illustration", id: ill.id }));
                                  e.dataTransfer.effectAllowed = "move";
                                  
                                  const cardEl = e.currentTarget.closest('.group\\/ill');
                                  if (cardEl) {
                                    // 1. Create a container
                                    const dragGhost = document.createElement('div');
                                    dragGhost.style.position = 'fixed';
                                    dragGhost.style.top = '-1000px';
                                    dragGhost.style.left = '-1000px';
                                    dragGhost.style.display = 'flex';
                                    dragGhost.style.alignItems = 'stretch';
                                    dragGhost.style.gap = '4px';
                                    dragGhost.style.background = '#1a1a1a';
                                    dragGhost.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                                    dragGhost.style.borderRadius = '12px';
                                    dragGhost.style.padding = '4px';
                                    dragGhost.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.5)';
                                    dragGhost.style.pointerEvents = 'none';
                                    dragGhost.style.zIndex = '999999';

                                    // 2. Clone/get the image element
                                    const imgEl = cardEl.querySelector('img');
                                    const imgWrapper = document.createElement('div');
                                    imgWrapper.style.width = '48px';
                                    imgWrapper.style.height = '48px';
                                    imgWrapper.style.borderRadius = '8px';
                                    imgWrapper.style.overflow = 'hidden';
                                    imgWrapper.style.background = '#0a0a0a';
                                    imgWrapper.style.display = 'flex';
                                    imgWrapper.style.alignItems = 'center';
                                    imgWrapper.style.justifyContent = 'center';
                                    
                                    if (imgEl) {
                                      const newImg = imgEl.cloneNode() as HTMLImageElement;
                                      newImg.style.width = '100%';
                                      newImg.style.height = '100%';
                                      newImg.style.objectFit = 'cover';
                                      imgWrapper.appendChild(newImg);
                                    } else {
                                      // Render placeholder icon or emoji
                                      const text = document.createElement('span');
                                      text.innerText = '🖼️';
                                      text.style.fontSize = '20px';
                                      imgWrapper.appendChild(text);
                                    }
                                    dragGhost.appendChild(imgWrapper);

                                    // 3. Clone/create the handle
                                    const handleWrapper = document.createElement('div');
                                    handleWrapper.style.width = '18px';
                                    handleWrapper.style.background = 'rgba(255, 255, 255, 0.08)';
                                    handleWrapper.style.borderRadius = '6px';
                                    handleWrapper.style.display = 'flex';
                                    handleWrapper.style.alignItems = 'center';
                                    handleWrapper.style.justifyContent = 'center';
                                    handleWrapper.style.color = 'rgba(255, 255, 255, 0.5)';
                                    handleWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>`;
                                    document.body.appendChild(dragGhost);
                                    e.dataTransfer.setDragImage(dragGhost, 28, 28);

                                    // Clean up
                                    setTimeout(() => {
                                      if (dragGhost.parentNode) {
                                        dragGhost.parentNode.removeChild(dragGhost);
                                      }
                                    }, 0);
                                  }
                                  
                                  setIsDraggingIllustration(true);
                                }}
                                onDragEnd={() => {
                                  setIsDraggingIllustration(false);
                                }}
                                className="absolute top-0 right-0 bottom-0 w-4.5 bg-white/5 hover:bg-white/10 border-l border-white/5 flex items-center justify-center cursor-grab active:cursor-grabbing group/handle transition-colors rounded-r-2xl"
                                title="드래그하여 대사 사이로 삽화 이동"
                              >
                                <GripVertical className="w-3 h-3 text-white/30 group-hover/handle:text-white/70 transition-colors" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : null
                  ) : (
                    <div className="text-center py-20 text-white/10">
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-20 text-white" />
                      <p className="text-sm font-medium">로그를 먼저 업로드하세요</p>
                    </div>
                  )}
                </Section>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <Section>
                  <SectionTitle 
                    icon={Layout} 
                    title="테마 설정" 
                    rightElement={
                      <div className="flex gap-1.5 items-center">
                        {theme === 'dark' ? (
                          <>
                            <button 
                              onClick={() => { setDarkBgColor('#212121'); saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily, theme, darkBgColor: '#212121', lightBgColor, disableOtherColor }); }}
                              className={cn("w-[22px] h-[22px] rounded border transition-colors relative flex items-center justify-center", darkBgColor === '#212121' ? "border-[#499bc8] ring-1 ring-[#499bc8]" : "border-white/20 hover:border-white/40")}
                              style={{ backgroundColor: '#212121' }}
                            >
                              {darkBgColor === '#212121' && <div className="w-1.5 h-1.5 rounded-full bg-[#499bc8]" />}
                            </button>
                            <button 
                              onClick={() => { setDarkBgColor('#121212'); saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily, theme, darkBgColor: '#121212', lightBgColor, disableOtherColor }); }}
                              className={cn("w-[22px] h-[22px] rounded border transition-colors relative flex items-center justify-center", darkBgColor === '#121212' ? "border-[#499bc8] ring-1 ring-[#499bc8]" : "border-white/20 hover:border-white/40")}
                              style={{ backgroundColor: '#121212' }}
                            >
                              {darkBgColor === '#121212' && <div className="w-1.5 h-1.5 rounded-full bg-[#499bc8]" />}
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => { setLightBgColor('#ffffff'); saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily, theme, darkBgColor, lightBgColor: '#ffffff', disableOtherColor }); }}
                              className={cn("w-[22px] h-[22px] rounded border transition-colors  relative flex items-center justify-center", lightBgColor === '#ffffff' ? "border-[#499bc8] ring-1 ring-[#499bc8]" : "border-black/10 hover:border-black/30")}
                              style={{ backgroundColor: '#ffffff' }}
                            >
                              {lightBgColor === '#ffffff' && <div className="w-1.5 h-1.5 rounded-full bg-[#499bc8]" />}
                            </button>
                            <button 
                              onClick={() => { setLightBgColor('#f8f9fa'); saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily, theme, darkBgColor, lightBgColor: '#f8f9fa', disableOtherColor }); }}
                              className={cn("w-[22px] h-[22px] rounded border transition-colors  relative flex items-center justify-center", lightBgColor === '#f8f9fa' ? "border-[#499bc8] ring-1 ring-[#499bc8]" : "border-black/10 hover:border-black/30")}
                              style={{ backgroundColor: '#f8f9fa' }}
                            >
                              {lightBgColor === '#f8f9fa' && <div className="w-1.5 h-1.5 rounded-full bg-[#499bc8]" />}
                            </button>
                          </>
                        )}
                      </div>
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => { setTheme('dark'); saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily, theme: 'dark', darkBgColor, lightBgColor, disableOtherColor }); }}
                      className={`py-2 px-3 rounded-xl border-2 transition-all text-[11px] font-bold ${
                        theme === 'dark' 
                          ? 'bg-[#499bc8] border-[#499bc8] text-white' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'
                      }`}
                    >
                      다크 모드
                    </button>
                    <button 
                      onClick={() => { setTheme('light'); saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily, theme: 'light', darkBgColor, lightBgColor, disableOtherColor }); }}
                      className={`py-2 px-3 rounded-xl border-2 transition-all text-[11px] font-bold ${
                        theme === 'light' 
                          ? 'bg-white border-white text-zinc-900' 
                          : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'
                      }`}
                    >
                      화이트 모드
                    </button>
                  </div>
                </Section>

                <Section>
                  <SectionTitle icon={Eye} title="로그 표시 설정" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl  h-11 relative">
                      <span className="text-[11px] font-bold text-white/70">로그 구분선 표시</span>
                      <Toggle 
                        enabled={showLogDivider} 
                        onChange={(val) => {
                          setShowLogDivider(val);
                          saveToHistory({ showLogDivider: val });
                        }} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl  h-11 relative">
                      <span className="text-[11px] font-bold text-white/70">잡담 색상을 회색으로 통일</span>
                      <Toggle 
                        enabled={disableOtherColor} 
                        onChange={(val) => {
                          setDisableOtherColor(val);
                          saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily, theme, disableOtherColor: val });
                        }} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl  h-11 relative">
                      <span className="text-[11px] font-bold text-white/70">이미지 배경 숨김</span>
                      <Toggle 
                        enabled={hideEmptyAvatars} 
                        onChange={(val) => {
                          setHideEmptyAvatars(val);
                          saveToHistory({ hideEmptyAvatars: val });
                        }} 
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl  h-11 relative">
                      <span className="text-[11px] font-bold text-white/70">스탠딩 숨김</span>
                      <Toggle 
                        enabled={hideAllAvatars} 
                        onChange={(val) => {
                          setHideAllAvatars(val);
                          saveToHistory({ hideAllAvatars: val });
                        }} 
                      />
                    </div>
                  </div>
                </Section>

                <Section>
                  <SectionTitle icon={Type} title="폰트 설정" />
                  <div className="relative" ref={fontDropdownRef}>
                    <button
                      onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                      className="w-full p-3 bg-white/5 border border-white/5 rounded-xl text-xs font-bold outline-none hover:border-white/20 transition-all flex items-center justify-between text-white/80"
                    >
                      <span style={{ fontFamily: fonts.find(f => f.name === fontFamily)?.value }}>{fontFamily}</span>
                      <ChevronDown className="w-4 h-4 opacity-50" />
                    </button>
                    
                    {isFontDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-2 w-full bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-1">
                          {fonts.map(f => (
                            <button
                              key={f.name}
                              onClick={() => {
                                setFontFamily(f.name);
                                saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily: f.name, theme, disableOtherColor });
                                setIsFontDropdownOpen(false);
                              }}
                              style={{ fontFamily: f.value }}
                              className={cn(
                                "w-full text-left px-3 py-2 text-xs rounded-lg transition-colors",
                                fontFamily === f.name ? "bg-[#499bc8] text-white font-bold" : "text-white/60 hover:bg-white/5 hover:text-white"
                              )}
                            >
                              {f.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Section>

                <Section>
                  <div className="pt-0.5 pb-2">
                    <NumberAdjuster 
                      label="전체 크기 조절" min={10} max={30} step={1} value={fontSize} unit="px" highlightDefault={14} hideReset icon={Scaling}
                      isSubHeader={false}
                      tooltip={<div className="text-[11px] leading-relaxed w-[170px] text-left">슬라이더 범위를 벗어나는 수치는 직접 입력해주세요.</div>}
                      rightElement={
                        <button
                          onClick={() => setIsAdvancedLayoutOpen(!isAdvancedLayoutOpen)}
                          className="flex items-center gap-1.5 ml-2 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-bold text-white/40 hover:text-white transition-all border border-white/5"
                        >
                          <Settings2 className="w-3 h-3" />
                          {isAdvancedLayoutOpen ? '설정 닫기' : '상세 설정'}
                        </button>
                      }
                      onChange={(val) => { setFontSize(val); }} onSave={(val) => { saveToHistory({ fontSize: val }); }}
                    />
                  </div>
                  {isAdvancedLayoutOpen && (
                    <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200 mt-2">
                      <div className="flex items-center bg-black/20 p-0.5 rounded-lg border border-white/5 gap-0.75 shrink-0">
                        <button 
                          onClick={() => {
                            setLineHeight(1.5); setContentPadding(15); setBlockSpacing(-12); setAvatarSizeValue(42); setLetterSpacing(0);
                            saveToHistory({ lineHeight: 1.5, contentPadding: 15, blockSpacing: -12, avatarSizeValue: 42, letterSpacing: 0 });
                          }}
                          className={cn("flex-1 py-1 text-[9px] font-bold rounded-md transition-all", (lineHeight === 1.5 && contentPadding === 15 && blockSpacing === -12 && avatarSizeValue === 42 && letterSpacing === 0) ? "bg-white/15 text-white " : "text-white/30 hover:text-white/60")}
                        >좁게</button>
                        <button 
                          onClick={() => {
                            setTextFontSize(14); setLineHeight(1.6); setLetterSpacing(0); setBlockSpacing(2); setContentPadding(12); setAvatarSizeValue(46);
                            saveToHistory({ textFontSize: 14, lineHeight: 1.6, letterSpacing: 0, blockSpacing: 2, contentPadding: 12, avatarSizeValue: 46 });
                          }}
                          className={cn("flex-1 py-1 text-[9px] font-bold rounded-md transition-all", (textFontSize === 14 && lineHeight === 1.6 && letterSpacing === 0 && blockSpacing === 2 && contentPadding === 12 && avatarSizeValue === 46) ? "bg-white/15 text-white " : "text-white/30 hover:text-white/60")}
                        >
                          기본
                        </button>
                        <button 
                          onClick={() => {
                            setTextFontSize(14); setLineHeight(2.0); setLetterSpacing(0); setBlockSpacing(6); setContentPadding(20); setAvatarSizeValue(46);
                            saveToHistory({ textFontSize: 14, lineHeight: 2.0, letterSpacing: 0, blockSpacing: 6, contentPadding: 20, avatarSizeValue: 46 });
                          }}
                          className={cn("flex-1 py-1 text-[9px] font-bold rounded-md transition-all", (textFontSize === 14 && lineHeight === 2.0 && letterSpacing === 0 && blockSpacing === 6 && contentPadding === 20 && avatarSizeValue === 46) ? "bg-white/15 text-white " : "text-white/30 hover:text-white/60")}
                        >넓게</button>
                      </div>
                      
                      <NumberAdjuster 
                        label="글자 크기" min={10} max={18} step={1} value={textFontSize} unit="px" highlightDefault={14} icon={Type}
                        onChange={(val) => { setTextFontSize(val); }} onSave={(val) => { saveToHistory({ textFontSize: val }); }}
                      />

                      <NumberAdjuster 
                        label="이미지 크기" min={30} max={80} step={1} value={avatarSizeValue} unit="px" highlightDefault={46} icon={User}
                        onChange={(val) => { setAvatarSizeValue(val); }} onSave={(val) => { saveToHistory({ avatarSizeValue: val }); }}
                      />
                      
                      <NumberAdjuster 
                        label="자간" min={-1.5} max={1.5} step={0.1} value={letterSpacing} unit="px" highlightDefault={0} icon={UnfoldHorizontal}
                        onChange={(val) => { setLetterSpacing(val); }} onSave={(val) => { saveToHistory({ letterSpacing: val }); }}
                      />

                      <NumberAdjuster 
                        label="줄간격" min={1} max={3} step={0.1} value={lineHeight} highlightDefault={1.6} icon={UnfoldVertical}
                        onChange={(val) => { setLineHeight(val); }} onSave={(val) => { saveToHistory({ lineHeight: val }); }}
                      />

                      <NumberAdjuster 
                        label="블록 간격" min={-20} max={30} step={2} value={blockSpacing} unit="px" highlightDefault={2} icon={MoveVertical}
                        onChange={(val) => { setBlockSpacing(val); }} onSave={(val) => { saveToHistory({ blockSpacing: val }); }}
                      />

                      <NumberAdjuster 
                        label="좌우 여백" min={0} max={40} step={0.5} value={contentPadding} unit="px" highlightDefault={12} icon={MoveHorizontal}
                        onChange={(val) => { setContentPadding(val); }} onSave={(val) => { saveToHistory({ contentPadding: val }); }}
                      />
                    </div>
                  )}
                </Section>

                <Section>
                  <SectionTitle icon={Palette} title="CSS 출력 형식" />
                  
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-xl  relative h-11 mb-2" ref={filterDropdownRef}>
                    <span className="text-[11px] font-bold text-white/70">로그 필터 컨트롤러</span>
                    <div className="relative">
                      <button
                        onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                        className="flex items-center gap-2 bg-black/20 border border-white/10 rounded-lg text-[10px] text-white/80 px-2 py-1 outline-none hover:border-white/20 transition-colors"
                      >
                        <span className="max-w-[100px] truncate">
                          {filterBarMode === 'none' ? '사용 안 함' : filterBarMode === 'floating' ? '플로팅 버튼' : '본문 헤더 고정'}
                        </span>
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      </button>
                      
                      {isFilterDropdownOpen && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-[#222] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                          <div className="p-1">
                            {([
                              { value: 'none', label: '사용 안 함' },
                              { value: 'floating', label: '플로팅 버튼' },
                              { value: 'fixed', label: '본문 헤더 고정' }
                            ] as const).map(opt => (
                              <button
                                key={opt.value}
                                onClick={() => {
                                  setFilterBarMode(opt.value);
                                  saveToHistory({ charSettings, tabSettings, cssFormat, fontSize, fontFamily, theme, darkBgColor, lightBgColor, disableOtherColor, filterBarMode: opt.value });
                                  setIsFilterDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2 text-[11px] rounded-lg transition-colors",
                                  filterBarMode === opt.value ? "bg-[#499bc8] text-white font-bold" : "text-white/60 hover:bg-white/5 hover:text-white"
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Tooltip position="bottom" className="text-center" content={
                      <>스타일 코드를 상단에 배치해 코드 단축 <span className="text-[#499bc8] font-medium">(권장)</span></>
                    }>
                      <button 
                        onClick={() => { setCssFormat('internal'); saveToHistory({ charSettings, tabSettings, cssFormat: 'internal', fontSize, fontFamily, theme, disableOtherColor }); }}
                        className={`w-full py-2 px-3 rounded-xl border-2 transition-all text-[11px] font-bold ${
                          cssFormat === 'internal' 
                            ? 'bg-[#499bc8] border-[#499bc8] text-white' 
                            : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'
                        }`}
                      >
                        내부 스타일
                      </button>
                    </Tooltip>
                    <Tooltip position="bottom" className="text-center" content={
                      <>티스토리 기본 스킨/모바일 모드 사용 시 권장</>
                    }>
                      <button 
                        onClick={() => { setCssFormat('inline'); saveToHistory({ charSettings, tabSettings, cssFormat: 'inline', fontSize, fontFamily, theme, disableOtherColor }); }}
                        className={`w-full py-2 px-3 rounded-xl border-2 transition-all text-[11px] font-bold ${
                          cssFormat === 'inline' 
                            ? 'bg-[#499bc8] border-[#499bc8] text-white' 
                            : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'
                        }`}
                      >
                        인라인 스타일
                      </button>
                    </Tooltip>
                  </div>
                </Section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-white/5 bg-[#1a1a1a] shrink-0 space-y-1">
          <div className="flex items-center gap-1">
            <button 
              onClick={undo}
              disabled={historyIndex <= 0}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-10 transition-all text-[9px] font-bold border border-white/5"
              title="되돌리기"
            >
              <Undo2 className="w-3 h-3" />
              되돌리기
            </button>
            <button 
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white disabled:opacity-10 transition-all text-[9px] font-bold border border-white/5"
              title="다시 실행"
            >
              <Redo2 className="w-3 h-3" />
              다시 실행
            </button>
            <button 
              onClick={resetSettings}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/5 hover:bg-red-500/20 rounded-lg text-white/40 hover:text-red-400 transition-all text-[9px] font-bold border border-white/5"
              title="초기화"
            >
              <RotateCcw className="w-3 h-3" />
              초기화
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/5 relative z-50">
            <div className="flex items-center gap-1.5">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <button
                  type="button"
                  onClick={() => setRememberSettings(!rememberSettings)}
                  className={cn(
                    "relative inline-flex h-3.5 w-6 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    rememberSettings ? "bg-[#499bc8]" : "bg-white/20"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-2.5 w-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      rememberSettings ? "translate-x-2.5" : "translate-x-0"
                    )}
                  />
                </button>
                <span className={cn(
                    "text-[9px] font-bold transition-colors",
                    rememberSettings ? "text-white/80" : "text-white/30"
                )}>설정 기억하기</span>
              </label>
              <Tooltip position="top" content={
                <div className="text-[11px] leading-relaxed w-[220px] text-left">
                  <p className="mb-2">
                    변경되는 설정을 브라우저에 자동 저장합니다. 모든 데이터는 서버 전송 없이 개인 기기에만 보관됩니다. <span className="text-white/30 text-[9px]">(브라우저 캐시 삭제 시 초기화)</span>
                  </p>
                  <p className="text-[#499bc8] font-medium">
                    토글을 끄면 저장된 데이터가 삭제되며, 새로고침 시 기본 설정으로 돌아갑니다.
                  </p>
                </div>
              }>
                <HelpCircle className="w-3 h-3 text-white/20 hover:text-white/40 cursor-help transition-colors" />
              </Tooltip>
            </div>
            <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.3em]">v1.1</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 flex-col bg-[#0f0f0f] relative overflow-hidden min-w-0",
        mobileTab === 'preview' ? 'flex' : 'hidden md:flex'
      )}>
        <div className={cn(
          "h-16 border-b flex items-center justify-between px-4 xl:px-8 shrink-0 gap-4 min-w-0",
          "bg-[#1a1a1a] border-white/5"
        )}>
          <div className="flex items-center gap-3 xl:gap-6 shrink-0 min-w-0">
            <div className="flex items-center">
              <div 
                className={cn(
                  "flex items-center overflow-hidden shrink-0 transition-all duration-200 ease-out border rounded-full",
                  isSearchExpanded 
                    ? "w-[240px] px-3 py-1.5 bg-white/5 border-white/10" 
                    : "w-8 h-8 bg-white/5 hover:bg-white/10 border-white/10 cursor-pointer justify-center"
                )}
                onClick={() => {
                  if (!isSearchExpanded) {
                    setIsSearchExpanded(true);
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }
                }}
              >
                <Search className={cn("shrink-0", isSearchExpanded ? "w-3.5 h-3.5 text-white/50" : "w-3.5 h-3.5 text-white/60 hover:text-white")} />
                
                {isSearchExpanded && (
                  <>
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing) return;
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (e.shiftKey) {
                            setCurrentMatchIndex(prev => prev > 0 ? prev - 1 : searchMatchIndices.length - 1);
                          } else {
                            setCurrentMatchIndex(prev => prev < searchMatchIndices.length - 1 ? prev + 1 : 0);
                          }
                        }
                      }}
                      placeholder="로그 검색..."
                      className="bg-transparent border-none outline-none text-xs text-white ml-2 w-full placeholder:text-white/30"
                    />
                    {searchQuery && searchMatchIndices.length > 0 && (
                      <div className="flex items-center gap-1 mr-1">
                        <span className="text-[10px] text-white/50 whitespace-nowrap">
                          {currentMatchIndex + 1} / {searchMatchIndices.length}
                        </span>
                        <div className="flex items-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentMatchIndex(prev => prev > 0 ? prev - 1 : searchMatchIndices.length - 1);
                            }}
                            className="p-1 hover:bg-white/20 rounded-md text-white/50 hover:text-white transition-colors"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setCurrentMatchIndex(prev => prev < searchMatchIndices.length - 1 ? prev + 1 : 0);
                            }}
                            className="p-1 hover:bg-white/20 rounded-md text-white/50 hover:text-white transition-colors"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setIsSearchExpanded(false); 
                        setSearchQuery(''); 
                      }}
                      className="shrink-0 ml-1 p-0.5 rounded-full hover:bg-white/20 text-white/50 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className={cn("hidden xl:block h-4 w-px shrink-0", "bg-white/10")} />
            <p className={cn("hidden xl:block text-[11px] font-bold truncate", "text-white/30")}>
              총 <span className={cn("text-white/60", searchQuery && "text-[#499bc8]")}>{searchQuery ? searchMatchIndices.length : logs.length}</span>개의 로그 항목
            </p>
          </div>

          <div className="flex items-center gap-2 xl:gap-3 shrink-1 min-w-0">
            {isTitleEditing ? (
              <div className="flex items-center gap-1 shrink-1 min-w-0">
                <div className="relative w-28 xl:w-48 shrink-1 min-w-[80px]">
                  <input 
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing) return;
                      if (e.key === 'Enter') {
                        setPageTitle(tempTitle);
                        saveToHistory({ pageTitle: tempTitle });
                        setIsTitleEditing(false);
                      } else if (e.key === 'Escape') {
                        setTempTitle(pageTitle);
                        setIsTitleEditing(false);
                      }
                    }}
                    className={cn(
                      "w-full border rounded-xl px-3 py-2 text-[11px] font-bold outline-none transition-colors",
                      "bg-black/20 border-[#499bc8] text-white placeholder:text-white/20"
                    )}
                    placeholder="제목 입력"
                    autoFocus
                    onBlur={() => {
                      // Small delay to allow button click
                      setTimeout(() => setIsTitleEditing(false), 200);
                    }}
                  />
                </div>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setPageTitle(tempTitle);
                    saveToHistory({ pageTitle: tempTitle });
                    setIsTitleEditing(false);
                  }}
                  className="px-2.5 py-2 bg-[#499bc8] text-white rounded-xl text-[10px] font-bold hover:bg-[#2767a4] transition-all active:scale-95 shrink-0"
                >
                  확인
                </button>
              </div>
            ) : (
              <div 
                onClick={() => {
                  setIsTitleEditing(true);
                  setTempTitle(pageTitle);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 cursor-pointer group transition-colors shrink-1 min-w-0"
              >
                <span className={cn(
                  "text-[11px] font-bold truncate max-w-[100px] xl:max-w-[180px]",
                  pageTitle ? "text-white" : "text-white/20"
                )}>
                  {pageTitle || "제목 변경"}
                </span>
                <Pencil className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 transition-colors shrink-0" />
              </div>
            )}
            <div className="relative">
              <button 
                onClick={() => setShowSaveMenu(!showSaveMenu)}
                className={cn(
                  "flex items-center justify-center gap-2 px-3 xl:px-4 py-2 border rounded-xl transition-all text-[11px] font-bold shrink-0",
                  "bg-white/5 hover:bg-white/10 border-white/10 text-white/60 hover:text-white"
                )}
                title="프로젝트 저장"
              >
                <FileJson className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xl:inline-block truncate">프로젝트 저장</span>
              </button>

              <AnimatePresence>
                {showSaveMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSaveMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden p-2"
                    >
                      <div className="space-y-0.5">
                        <div className="px-3 py-1"><p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">설정 (Settings)</p></div>
                        {[
                          { id: 'tabs', label: '탭' },
                          { id: 'chars', label: '캐릭터' },
                          { id: 'design', label: '디자인' },
                        ].map((item) => (
                          <label key={item.id} className="flex items-center gap-2.5 p-1.5 px-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group">
                            <input 
                              type="checkbox"
                              checked={(saveOptions as any)[item.id]}
                              onChange={(e) => setSaveOptions(prev => ({ ...prev, [item.id]: e.target.checked }))}
                              className="hidden"
                            />
                            <div className={cn(
                              "w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0",
                              (saveOptions as any)[item.id] ? "bg-[#499bc8] border-[#499bc8]" : "bg-white/5 border-white/20 group-hover:border-white/40"
                            )}>
                              {(saveOptions as any)[item.id] && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-[11px] font-bold text-white flex-1">{item.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="space-y-0.5 mt-2">
                        <div className="px-3 py-1"><p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">편집 (Edits)</p></div>
                        {[
                          { id: 'splits', label: '섹션 이름 및 분할 위치' },
                          { id: 'images', label: '이미지 삽입' },
                          { id: 'edits', label: '대사 수정 내역' },
                        ].map((item) => (
                          <label key={item.id} className="flex items-center gap-2.5 p-1.5 px-3 hover:bg-white/5 rounded-lg transition-colors cursor-pointer group">
                            <input 
                              type="checkbox"
                              checked={(saveOptions as any)[item.id]}
                              onChange={(e) => setSaveOptions(prev => ({ ...prev, [item.id]: e.target.checked }))}
                              className="hidden"
                            />
                            <div className={cn(
                              "w-3.5 h-3.5 rounded-sm flex items-center justify-center border transition-colors shrink-0",
                              (saveOptions as any)[item.id] ? "bg-[#499bc8] border-[#499bc8]" : "bg-white/5 border-white/20 group-hover:border-white/40"
                            )}>
                              {(saveOptions as any)[item.id] && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="text-[11px] font-bold text-white flex-1">{item.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="h-px bg-white/5 my-2" />
                      
                      <button 
                        onClick={() => { exportProject(); setShowSaveMenu(false); }}
                        className="w-full flex items-center justify-center gap-2 p-2.5 bg-[#499bc8] hover:bg-[#2767a4] rounded-xl text-white transition-all text-[11px] font-bold shadow-lg mt-1"
                      >
                        <FileJson className="w-3.5 h-3.5" />
                        JSON 저장
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="flex items-center justify-center gap-2 px-3 xl:px-6 py-2 bg-[#499bc8] hover:bg-[#2767a4] rounded-xl text-white shadow-lg transition-all text-[11px] font-bold shrink-0"
                title="HTML 다운로드"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xl:inline-block truncate">HTML 다운로드</span>
              </button>
              
              <AnimatePresence>
                {showDownloadMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDownloadMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-64 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden p-2"
                    >
                      <button 
                        onClick={() => { copyToClipboard(getHtmlString()); setShowDownloadMenu(false); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                      >
                        <Copy className="w-4 h-4 text-blue-400" />
                        <div>
                          <p className="text-[11px] font-bold text-white">HTML 복사</p>
                          <p className="text-[9px] text-white/30">클립보드에 전체 HTML 복사</p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 pr-2">
                        <button 
                          onClick={() => { downloadHtml(); setShowDownloadMenu(false); }}
                          className="flex-1 flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                        >
                          <FileText className="w-4 h-4 text-emerald-400" />
                          <div>
                            <p className="text-[11px] font-bold text-white">전체 다운로드</p>
                            <p className="text-[9px] text-white/30">하나의 HTML 파일로 저장</p>
                          </div>
                        </button>
                      </div>
                      
                      {splitPoints.size > 0 && (
                        <>
                          <div className="h-px bg-white/5 my-1" />
                          <div className="px-3 py-2">
                            <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest">분할 섹션</p>
                          </div>
                          <div className="max-h-64 overflow-y-auto custom-scrollbar">
                            {sectionsList.map((s, i) => (
                              <div key={i} className="flex items-center gap-2 pr-2 group">
                                <button 
                                  onClick={() => { downloadHtml({ id: s.id, name: s.name }); setShowDownloadMenu(false); }}
                                  className="flex-1 flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                                >
                                  <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-[9px] font-bold text-white/40 group-hover:text-white/60">
                                    {i + 1}
                                  </div>
                                  <div>
                                    <p className="text-[11px] font-bold text-white truncate max-w-[120px]">{s.name}</p>
                                    <p className="text-[9px] text-white/30">{s.startBlock} ~ {s.endBlock}번 블록</p>
                                  </div>
                                </button>
                                <button 
                                  onClick={() => { copyToClipboard(getHtmlString(s.id)); setShowDownloadMenu(false); }}
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/30 hover:text-white"
                                  title="HTML 복사"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="h-px bg-white/5 my-1" />
                          <button 
                            onClick={() => { downloadZip(); setShowDownloadMenu(false); }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-[#499bc8]/20 rounded-xl transition-colors text-left group"
                          >
                            <Plus className="w-4 h-4 text-[#499bc8]" />
                            <div>
                              <p className="text-[11px] font-bold text-[#499bc8]">ZIP으로 모두 저장</p>
                              <p className="text-[9px] text-[#499bc8]/40">모든 섹션을 압축파일로 저장</p>
                            </div>
                          </button>
                        </>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Preview Area */}
        <div 
          ref={previewContainerRef}
          className={cn(
            "flex-1 overflow-y-auto custom-scrollbar relative min-w-0 transition-colors",
            isDraggingIllustration && "is-dragging-illustration"
          )}
          style={{ 
            '--name-col-width': `${displayItemsNameWidth}px`,
            backgroundColor: theme === 'dark' ? darkBgColor : lightBgColor
          } as React.CSSProperties}
        >
          <div className="w-full min-w-0 min-h-full flex flex-col">
            {logs.length > 0 ? (
              <div className="relative group/preview">
                <div 
                  className="min-h-screen relative transition-colors"
                  style={{
                    backgroundColor: theme === 'dark' ? darkBgColor : lightBgColor
                  }}
                >
                  {/* Top Section Name Input */}
                  <div id="section-0" className="max-w-[800px] mx-auto px-4 pt-2 font-sans relative">
                    <div className="flex items-end justify-between max-w-full border-b border-[#499bc8]">
                      <div className="bg-[#499bc8] rounded-t-lg px-4 py-1 flex items-center shadow-lg gap-2">
                        <SectionNameEditor 
                          initialName={sectionNames[0] || ''}
                          defaultName="섹션 1"
                          onSave={(name) => {
                            const nextBlocks = migrateToInsertedBlocks(insertedImages, splitPointsArr, { ...sectionNames, [0]: name });
                            setInsertedBlocks(nextBlocks);
                            saveToHistory({ insertedBlocks: nextBlocks });
                          }}
                        />
                        <div className="p-1 ml-2 invisible pointer-events-none flex-shrink-0">
                          <div className="w-3 h-3" />
                        </div>
                      </div>
                      <div className={cn(
                        "text-[10px] font-bold mb-1 ml-4",
                        theme === 'dark' ? "text-white/40" : "text-zinc-400"
                      )}>
                        {`1 - ${splitPointsArray.length > 0 ? splitPointsArray[0] + 1 : mergedLogs.length}번 블록`}
                      </div>
                    </div>
                  </div>

                  {/* We render the logs as a list of components for interactivity */}
                  <div className="log-container" style={{ 
                    maxWidth: '800px', 
                    margin: '0 auto', 
                    padding: '0 0 40px 0',
                    backgroundColor: theme === 'dark' ? darkBgColor : lightBgColor,
                    color: theme === 'dark' ? '#EEEEEE' : '#333333',
                    fontFamily: fontFamily !== '(폰트 적용X)' ? (fonts.find(f => f.name === fontFamily)?.value || 'sans-serif') : undefined,
                    fontSize: `${fontSize}px`
                  }}>
                    {/* Inject Base Styles */}
                    <style>{`
                      @import url('https://hangeul.pstatic.net/hangeul_static/css/nanum-gothic-coding.css');
                      .log-item-wrapper { 
                        position: relative; 
                        transition: background-color 0s;
                      }
                      .log-item-wrapper:hover, .log-item-wrapper.is-editing {
                        background-color: ${theme === 'dark' ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.055)'};
                      }
                      .section-name-input {
                        background: transparent;
                        border: none;
                        border-bottom: 1px dashed #499bc8;
                        color: white;
                        font-size: 11px;
                        font-weight: bold;
                        padding: 2px 4px;
                        width: 150px;
                        outline: none;
                      }
                      .section-name-input::placeholder {
                        color: #499bc8;
                        opacity: 0.4;
                      }
                      .boundary-trigger {
                        position: relative;
                        height: 16px;
                        margin: -8px 0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        gap: 8px;
                        z-index: 50;
                        opacity: 0;
                        transition: opacity 0.2s;
                      }
                      .boundary-trigger:hover {
                        opacity: 1;
                      }
                      .boundary-trigger::before {
                        content: '';
                        position: absolute;
                        left: 0;
                        right: 0;
                        top: 50%;
                        height: 1px;
                        background: rgba(230,0,92,0.4);
                        transform: translateY(-50%);
                        z-index: -1;
                        pointer-events: none;
                      }
                      .virtualize-row:hover {
                        z-index: 50 !important;
                      }
                      .split-line {
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 2px;
                        background: #499bc8;
                        box-shadow: 0 0 10px rgba(230,0,92,0.5);
                        z-index: 10;
                      }
                    `}</style>

                    <div
                      ref={listRef}
                      style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: '100%',
                        position: 'relative',
                        marginTop: '-12px'
                      }}
                    >
                      {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                        const displayItem = displayItems[virtualItem.index];
                        const { log, isMatched, originalIndex: globalIdx } = displayItem;
                        const idx = globalIdx;
                        const isPrevSameTab = idx > 0 && mergedLogs[idx - 1].tab === log.tab;
                        const isNextSameTab = idx < mergedLogs.length - 1 && mergedLogs[idx + 1].tab === log.tab;
                        const stableId = log.id.startsWith('merged:') ? log.id.split(',').pop()! : log.id;
                        const originalLogIndex = logs.findIndex((l: any) => l.id === stableId);
                        
                        const isPrevNarration = idx > 0 && mergedLogs[idx - 1].charId === narrationCharacter && (tabSettings[mergedLogs[idx - 1].tabId]?.format || 'main') === 'main';
                        const isNextNarration = idx < mergedLogs.length - 1 && mergedLogs[idx + 1].charId === narrationCharacter && (tabSettings[mergedLogs[idx + 1].tabId]?.format || 'main') === 'main';

                        return (
                          <div
                            key={virtualItem.key}
                             id={`log-item-${originalLogIndex}`}
                            data-index={virtualItem.index}
                            ref={rowVirtualizer.measureElement}
                            className="virtualize-row"
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              transform: `translateY(${Math.round(virtualItem.start)}px)`,
                            }}
                          >
                            <LogItem 
                              idx={globalIdx}
                              isHighlighted={isMatched}
                              isCurrentMatch={currentMatchIndex >= 0 && searchMatchIndices[currentMatchIndex] === idx}
                              searchQuery={searchQuery}
                              stableId={stableId}
                              log={log}
                              mergedLogs={mergedLogs}
                              insertedBlocks={insertedBlocks[stableId] || []}
                              startBlocks={idx === 0 ? (insertedBlocks['__start__'] || []) : []}
                              imageInputLoc={imageInputLoc}
                              splitPointsArray={splitPointsArray}
                              onAddBlock={onAddBlock}
                              onAddIllustration={onAddIllustration}
                              onUpdateIllustration={onUpdateIllustration}
                              onRemoveIllustration={onRemoveIllustration}
                              originalLogIndex={originalLogIndex}
                              illustrations={illustrations}
                              onUpdateBlock={onUpdateBlock}
                              onRemoveBlock={onRemoveBlock}
                              onToggleImageInput={onToggleImageInput}
                              onEditLog={onEditLog}
                              onDeleteLog={onDeleteLog}
                              insertLogBlock={insertLogBlock}
                              onChangeSpeaker={onChangeSpeaker}
                              onChangeExpression={onChangeExpression}
                              onChangeTab={onChangeTab}
                              charSettings={charSettings}
                              tabOrder={tabOrder}
                              mergedLogsCount={mergedLogs.length}
                              isPrevSameTab={isPrevSameTab}
                              isNextSameTab={isNextSameTab}
                              isNextContinuation={idx < mergedLogs.length - 1 && mergedLogs[idx + 1].isContinuation}
                              isPrevBlock={idx > 0 && !!insertedBlocks[mergedLogs[idx - 1].id.startsWith('merged:') ? mergedLogs[idx - 1].id.split(',').pop()! : mergedLogs[idx - 1].id]?.length}
                              isPrevNarration={isPrevNarration}
                              isNextNarration={isNextNarration}
                              editingLogId={editingLogId}
                              setEditingLogId={setEditingLogId}
                              isDraggingIllustration={isDraggingIllustration}
                            />
                          </div>
                        );
                      })}
                    </div>
                    {/* Spacer for visibility (Preview only) */}
                    <div className="w-full shrink-0" style={{ height: '60px' }} />

                    {/* Portal Hover Image Tooltip */}
                    {hoverImgRect && hoverImgUrl && (() => {
                      const tooltipWidth = 200;
                      const showOnRight = hoverImgRect.left - tooltipWidth < 10;
                      const leftPos = showOnRight 
                        ? hoverImgRect.right + 10 
                        : hoverImgRect.left - tooltipWidth - 10;
                      
                      let topPos = hoverImgRect.top + hoverImgRect.height / 2 - 100;
                      if (topPos < 10) topPos = 10;
                      else if (topPos + 220 > window.innerHeight) topPos = Math.max(10, window.innerHeight - 220);

                      return (
                        <div 
                          className="fixed z-[9999] pointer-events-none"
                          style={{
                            left: `${leftPos}px`,
                            top: `${topPos}px`,
                          }}
                        >
                          <div className="bg-[#1a1a1a] p-2 rounded-2xl border border-white/20 shadow-2xl flex flex-col items-center justify-center max-w-[200px]">
                            <img src={hoverImgUrl} alt="" referrerPolicy="no-referrer" className="w-auto h-auto min-w-[80px] min-h-[80px] max-w-[180px] max-h-[180px] object-contain rounded-xl block bg-black/40" />
                            {hoverImgLabel && (
                              <div className="text-[10px] font-bold text-white/70 text-center mt-1.5 truncate w-full px-1">
                                {hoverImgLabel}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                    
                  </div>
                </div>

                {activeColorPicker && colorPickerRect && (
                  <>
                    {activeColorPicker.startsWith('tab-') ? (
                      <ColorPickerPopup 
                        color={tabSettings[activeColorPicker.replace('tab-', '')]?.color || '#ffd400'} 
                        extractedColors={Array.from(new Set([...extractedColors, ...Object.values(charSettings).map((c: any) => c.color), ...Object.values(tabSettings).filter((t: any) => t.color).map((t: any) => t.color)]))}
                        triggerRect={colorPickerRect}
                        onClose={() => {
                          setActiveColorPicker(null);
                          setColorPickerRect(null);
                        }}
                        onChange={(newColor) => {
                          const tabId = activeColorPicker.replace('tab-', '');
                          const next = { ...tabSettings, [tabId]: { ...tabSettings[tabId], color: newColor } };
                          setTabSettings(next);
                          saveToHistory({ charSettings, tabSettings: next, cssFormat, fontSize, fontFamily, theme, disableOtherColor });
                        }}
                      />
                    ) : (
                      <ColorPickerPopup 
                        color={charSettings[activeColorPicker]?.color || '#ffffff'} 
                        extractedColors={Array.from(new Set([...extractedColors, ...Object.values(charSettings).map((c: any) => c.color), ...Object.values(tabSettings).filter((t: any) => t.color).map((t: any) => t.color)]))}
                        triggerRect={colorPickerRect}
                        onClose={() => {
                          setActiveColorPicker(null);
                          setColorPickerRect(null);
                        }}
                        onChange={(newColor) => {
                          const next = { ...charSettings, [activeColorPicker]: { ...charSettings[activeColorPicker], color: newColor } };
                          setCharSettings(next);
                          saveToHistory({ charSettings: next, tabSettings, cssFormat, fontSize, fontFamily, theme, disableOtherColor });
                        }}
                      />
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 py-40">
                <div className="relative">
                  <div className={cn(
                    "w-32 h-32 rounded-full flex items-center justify-center",
                    theme === 'dark' ? "bg-white/5" : "bg-zinc-900/5"
                  )}>
                    <Upload className={cn("w-12 h-12", theme === 'dark' ? "text-white/10" : "text-zinc-900/20")} />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className={cn(
                    "text-2xl font-bold tracking-tight",
                    theme === 'dark' ? "text-white/40" : "text-zinc-900/40"
                  )}>로그 파일을 기다리고 있어요</p>
                  <p className={cn(
                    "text-sm font-medium",
                    theme === 'dark' ? "text-white/20" : "text-zinc-900/40"
                  )}>CCFOLIA에서 추출한 HTML 파일을 업로드하여 시작하세요</p>
                </div>
                <label 
                  htmlFor="main-log-upload"
                  className="px-8 py-3 bg-[#499bc8] text-white rounded-2xl text-sm font-bold hover:bg-[#2767a4] transition-all shadow-xl active:scale-95 cursor-pointer inline-block"
                >
                  업로드하기
                </label>
              </div>
            )}
          </div>
        </div>
        {logs.length > 0 && (
          <div 
            className="z-50 flex flex-col items-end"
            style={{ position: 'fixed', bottom: '19px', right: '19px' }}
            onMouseEnter={() => setIsTocHovered(true)}
            onMouseLeave={() => setIsTocHovered(false)}
          >
            <AnimatePresence>
              {isTocHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="mb-3 bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[350px] w-56 transform origin-bottom-right"
                >
                  <div className="px-3 border-b border-white/10 bg-white/5 flex items-center justify-center shrink-0" style={{ height: '26px' }}>
                    <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-widest text-center m-0 leading-none">섹션 이동</h3>
                  </div>
                  <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
                    {sectionsList.map((sec) => (
                      <button
                        key={sec.id}
                        onClick={() => scrollToSection(sec.targetOriginalIndex, sec.id)}
                        className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        <span className="truncate pr-2">{sec.name}</span>
                        <span className="text-[10px] font-mono text-white/30 whitespace-nowrap">{sec.startBlock}~{sec.endBlock}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div 
              className="bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-black/80 transition-colors shadow-lg cursor-pointer shrink-0"
              style={{ width: '50px', height: '50px', borderRadius: '50%' }}
            >
              <List className="w-6 h-6" />
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Mobile Bottom Tab Bar */}
      <div className="md:hidden h-16 bg-[#1a1a1a] border-t border-white/5 flex shrink-0 z-50">
        <button 
          onClick={() => setMobileTab('settings')} 
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
            mobileTab === 'settings' ? "text-[#499bc8]" : "text-white/40 hover:text-white/60"
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-bold">설정</span>
        </button>
        <button 
          onClick={() => setMobileTab('preview')} 
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-1 transition-colors",
            mobileTab === 'preview' ? "text-[#499bc8]" : "text-white/40 hover:text-white/60"
          )}
        >
          <Eye className="w-5 h-5" />
          <span className="text-[10px] font-bold">미리보기</span>
        </button>
      </div>
            {/*
              {bulkImages.length > 0 && (
                <div className="flex flex-col gap-3">
                  {bulkImportStep === 1 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] text-white/40">{bulkImages.length}개 로드됨</span>
                      </div>
                      <div className="bg-black/20 border border-white/10 rounded-xl max-h-[50vh] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5">
                        {bulkImages.map((img, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-colors border border-white/5 bg-white/[0.01]">
                            <div className="w-12 h-12 shrink-0 rounded bg-black/40 border border-white/10 overflow-hidden flex items-center justify-center">
                              <img src={img.url} className="w-full h-full object-contain" alt={img.fileName} referrerPolicy="no-referrer" />
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                              <div className="text-[11px] font-bold text-white truncate">{img.fileName}</div>
                              <div className="text-[9px] text-white/30 truncate">{img.url}</div>
                            </div>
                            <div className="shrink-0 w-44 flex flex-col justify-center">
                              <SearchableSelect 
                                value={bulkImageMapping[img.url] || ""}
                                onChange={(id) => setBulkImageMapping(prev => ({ ...prev, [img.url]: id }))}
                                options={[{ label: "선택 안 함", value: "" }, ...Object.entries(charSettings).map(([id, char]) => ({ label: (char as CharSetting).name, value: id }))]}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-bold text-white/40">
                          미지정 {bulkImages.filter(img => !bulkImageMapping[img.url]).length}개 중 {bulkImages.filter(img => !bulkImageMapping[img.url] && bulkSelectedIllustrations[img.url]).length}개 선택됨
                        </span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const next: Record<string, boolean> = { ...bulkSelectedIllustrations };
                              bulkImages.filter(img => !bulkImageMapping[img.url]).forEach(img => {
                                next[img.url] = true;
                              });
                              setBulkSelectedIllustrations(next);
                            }}
                            className="text-[10px] font-bold text-white/50 hover:text-white transition-colors"
                          >
                            전체 선택
                          </button>
                          <span className="text-white/20 text-[10px]">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              const next: Record<string, boolean> = { ...bulkSelectedIllustrations };
                              bulkImages.filter(img => !bulkImageMapping[img.url]).forEach(img => {
                                next[img.url] = false;
                              });
                              setBulkSelectedIllustrations(next);
                            }}
                            className="text-[10px] font-bold text-white/50 hover:text-white transition-colors"
                          >
                            선택 해제
                          </button>
                        </div>
                      </div>
                      
                      {bulkImages.filter(img => !bulkImageMapping[img.url]).length === 0 ? (
                        <div className="bg-black/20 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center gap-2">
                          <ImageIcon className="w-8 h-8 text-white/20" />
                          <p className="text-[11px] text-white/50">모든 이미지가 캐릭터에 매칭되었습니다.</p>
                          <p className="text-[9px] text-white/30">캐릭터로 선택되지 않은 이미지가 있을 때만 삽화로 지정할 수 있습니다.</p>
                        </div>
                      ) : (
                        <div className="bg-black/20 border border-white/10 rounded-xl p-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {bulkImages
                              .filter(img => !bulkImageMapping[img.url])
                              .map((img, idx) => {
                                const isSelected = !!bulkSelectedIllustrations[img.url];
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      setBulkSelectedIllustrations(prev => ({
                                        ...prev,
                                        [img.url]: !prev[img.url]
                                      }));
                                    }}
                                    className={cn(
                                      "aspect-square rounded-xl bg-black/40 border-2 overflow-hidden relative cursor-pointer group transition-all",
                                      isSelected 
                                        ? "border-[#499bc8] ring-2 ring-[#499bc8]/30 shadow-[0_0_15px_rgba(230,0,92,0.2)]" 
                                        : "border-white/10 hover:border-white/20 hover:scale-[1.02]"
                                    )}
                                  >
                                    <img src={img.url} className="w-full h-full object-cover select-none pointer-events-none" alt={img.fileName} referrerPolicy="no-referrer" />
                                    
                                    {isSelected && (
                                      <div className="absolute top-2 right-2 w-5 h-5 bg-[#499bc8] rounded-full flex items-center justify-center shadow-lg border border-white/20 animate-in zoom-in duration-100">
                                        <Check className="w-3 h-3 text-white stroke-[3px]" />
                                      </div>
                                    )}
                                    
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                                      <div className="text-[9px] text-white font-bold truncate">{img.fileName}</div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="px-5 py-4 border-t border-white/5 bg-black/20 flex justify-between items-center gap-2">
              <button 
                onClick={() => setIsBulkImgurModalOpen(false)}
                className="px-4 py-2 rounded-lg text-[11px] font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors outline-none"
              >
                취소
              </button>
              
              <div className="flex gap-2">
                {bulkImportStep === 1 ? (
                  <button 
                    onClick={() => {
                      const nextSelected = { ...bulkSelectedIllustrations };
                      bulkImages.forEach(img => {
                        if (!bulkImageMapping[img.url] && nextSelected[img.url] === undefined) {
                          nextSelected[img.url] = true;
                        }
                      });
                      setBulkSelectedIllustrations(nextSelected);
                      setBulkImportStep(2);
                    }}
                    disabled={bulkImages.length === 0}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold text-white bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed transition-colors outline-none"
                  >
                    삽화 선택
                  </button>
                ) : (
                  <button 
                    onClick={() => setBulkImportStep(1)}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold text-white bg-white/10 hover:bg-white/20 transition-colors outline-none"
                  >
                    캐릭터 선택
                  </button>
                )}
                
                <button 
                  onClick={applyBulkImages}
                  disabled={bulkImages.length === 0}
                  className="px-4 py-2 rounded-lg text-[11px] font-bold text-white bg-[#499bc8] hover:bg-[#2767a4] disabled:bg-[#499bc8]/50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(230,0,92,0.3)] transition-all outline-none"
                >
                  확인 및 적용
                </button>
              </div>
            </div>
          </div>
        </div>
      */}

      {isCcfoliaModalOpen && (
        <div className="fixed inset-0 z-[2000000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-[520px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-4 flex items-center justify-between border-b border-white/5">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-[#499bc8]" />
                코코포리아 룸 연동
              </h2>
              <button onClick={() => setIsCcfoliaModalOpen(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white outline-none" aria-label="닫기">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 flex gap-2">
              <input
                type="url"
                placeholder="코코포리아 룸 링크"
                value={ccfoliaRoomUrl}
                onChange={(e) => setCcfoliaRoomUrl(e.target.value)}
                className="flex-1 min-w-0 text-[10px] px-3 py-2 bg-black/20 border border-white/10 rounded-xl outline-none focus:border-[#499bc8] text-white/80 transition-colors"
              />
              <button onClick={handleCcfoliaRoomFetch} disabled={isCcfoliaLoading || !ccfoliaRoomUrl.trim()} className="px-3 py-2 bg-[#499bc8] hover:bg-[#2767a4] disabled:bg-white/5 disabled:cursor-not-allowed disabled:text-white/20 text-white text-[11px] font-bold rounded-xl transition-colors whitespace-nowrap">
                {isCcfoliaLoading ? '불러오는 중...' : '불러오기'}
              </button>
            </div>
          </div>
        </div>
      )}

{cropModal.isOpen && (
  <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
    <div className="bg-zinc-900 rounded-2xl w-full max-w-[400px] shadow-2xl overflow-hidden flex flex-col border border-white/10">
      
      {/* 상단 헤더 */}
      <div className="p-4 flex justify-between items-center bg-zinc-900">
        <div>
          <div className="text-[10px] font-bold text-[#499bc8] tracking-wider mb-0.5">FACE CROP</div>
          <h3 className="text-xl font-bold text-white">얼굴 영역 지정</h3>
        </div>
        <button onClick={() => setCropModal(prev => ({ ...prev, isOpen: false }))} className="text-stone-400 hover:text-white p-2">✕</button>
      </div>
      
      <div className="px-4 pb-3 text-xs text-stone-400 leading-relaxed">
        마우스로 끌어 이동하고 휠을 굴려 크기를 조절하세요.<br/>모든 표정에 같은 1:1 영역이 일괄 적용됩니다.
      </div>

      {/* 진짜 크롭 화면 영역 */}
      <div className="relative w-full h-[400px] bg-black">
        <Cropper
          image={cropModal.imageUrl}
          crop={cropModal.crop}
          zoom={cropModal.zoom}
          aspect={1}
          cropShape="rect"
          showGrid={false}
          zoomSpeed={0.1}
          onCropChange={(crop) => setCropModal(prev => ({ ...prev, crop }))}
          onZoomChange={(zoom) => setCropModal(prev => ({ ...prev, zoom }))}
          onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPercent(croppedArea)}
        />
      </div>

      {/* 하단 영역 (제외 갤러리 + 저장 버튼) */}
      {/* 🚨↓↓ 수정할 부분: 하단 갤러리 영역 상단 (전체 선택/해제 버튼 추가) ↓↓🚨 */}
      <div className="bg-zinc-900 border-t border-white/10">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[10px] font-bold text-white/50">크롭 적용할 표정 선택</span>
            
            {/* 💡 새로 추가된 전체 선택/해제 버튼 */}
            <div className="flex gap-2 items-center">
              <button 
                onClick={() => setCropExcludedExpressions(new Set())}
                className="text-[9px] font-bold text-[#499bc8] hover:text-white transition-colors"
              >
                모두 포함
              </button>
              <span className="text-white/20 text-[9px]">|</span>
              <button 
                onClick={() => {
                  const allUrls = (charSettings[cropModal.charId] as any)?.expressions?.map((e: any) => e.url) || [];
                  setCropExcludedExpressions(new Set(allUrls));
                }}
                className="text-[9px] font-bold text-[#499bc8] hover:text-white transition-colors"
              >
                모두 제외
              </button>
            </div>
            
          </div>
          
          <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2 px-1">
            {(charSettings[cropModal.charId] as any)?.expressions?.map((expr: any, idx: number) => {
              const isExcluded = cropExcludedExpressions.has(expr.url);
              return (
                <div 
                  key={idx} 
                  className="relative shrink-0 cursor-pointer"
                  onClick={() => {
                    setCropExcludedExpressions(prev => {
                      const next = new Set(prev);
                      if (next.has(expr.url)) next.delete(expr.url);
                      else next.add(expr.url);
                      return next;
                    });
                  }}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-lg overflow-hidden bg-black/40 border-2 transition-all relative",
                    isExcluded ? "border-transparent opacity-40" : "border-[#499bc8] ring-1 ring-[#499bc8]/30"
                  )}>
                    <img src={expr.url} alt="" className="w-full h-full object-cover object-top pointer-events-none" referrerPolicy="no-referrer"/>
                    {isExcluded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <X className="w-5 h-5 text-white/70 stroke-[3px]" />
                      </div>
                    )}
                  </div>
                  <div className={cn("text-[9px] text-center font-medium mt-1 truncate w-12", isExcluded ? "text-white/30 line-through" : "text-white/80")}>
                    {expr.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 하단 저장 버튼 */}
        <div className="p-3 pt-0">
          <button
            onClick={() => {
              if (croppedAreaPercent) {
                const nextSettings = { ...charSettings };
                nextSettings[cropModal.charId] = {
                  ...nextSettings[cropModal.charId],
                  cropData: croppedAreaPercent, 
                  rawCropState: cropModal.crop,
                  rawZoomState: cropModal.zoom,
                  // 💡 저장할 때 제외된 표정 목록도 캐릭터 데이터에 함께 저장합니다!
                  excludedCropUrls: Array.from(cropExcludedExpressions)
                } as any;
                
                setCharSettings(nextSettings);
                saveToHistory({ charSettings: nextSettings });
                setCropModal(prev => ({ ...prev, isOpen: false }));
              }
            }}
            className="w-full py-2.5 bg-[#499bc8] hover:bg-[#387da3] text-white font-bold rounded-xl transition-colors text-[11px]"
          >
            선택한 표정에 크롭 영역 적용하기
          </button>
        </div>
      </div>
    </div>
  </div>
)}
      <Analytics />
    </div>
    </SettingsProvider>
  );
  
}
