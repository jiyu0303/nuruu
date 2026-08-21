export type TabFormat = 'main' | 'other' | 'info' | 'secret';

export interface LogEntry {
  id: string;
  color: string;
  tabId: string;
  tab: string; // The original name
  charId: string;
  name: string; // The original name
  content: string;
  isCommand: boolean;
  isContinuation?: boolean;
  isHiddenContent?: boolean;
  sectionId?: string;

  // Illustration fields
  isIllustration?: boolean;
  isUnplaced?: boolean;
  tabOverride?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  iconUrl?: string; 
}

export interface CharSetting {
  id: string;
  name: string;
  color: string;
  imageUrl: string;
  expressions?: { label: string; url: string }[];
  imageName?: string;
  visible: boolean;
    expressions?: { label: string; url: string }[]; 
}

export interface TabSetting {
  id: string;
  name: string;
  format: TabFormat;
  visible: boolean;
  color?: string; // For secret format
}

export interface CharacterLibraryItem {
  id: string;
  name: string;
  characters: {
    name: string;
    color: string;
    imageUrl: string;
  }[];
}

export interface ColorPickerPopupProps {
  color: string;
  extractedColors: string[];
  triggerRect: DOMRect;
  onChange: (newColor: string) => void;
  onClose: () => void;
}

export interface Illustration {
  id: string;
  url: string;
  imageName?: string;
  afterLogIndex: number | null;
  tabOverride: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

