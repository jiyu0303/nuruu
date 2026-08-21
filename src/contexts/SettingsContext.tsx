import React, { createContext, useContext, useMemo } from 'react';
import { CharSetting, TabSetting } from '../types';

export type SettingsContextType = {
  theme: 'light' | 'dark';
  fontSize: number;
  textFontSize: number;
  fontFamily: string;
  cssFormat: 'inline' | 'class';
  disableOtherColor: boolean;
  showTabNames: Set<string>;
  mergeTabStyles: Set<string>;
  charSettings: Record<string, CharSetting>;
  tabSettings: Record<string, TabSetting>;
  hideEmptyAvatars: boolean;
  hideAllAvatars: boolean;
  narrationCharacter: string | null;
  enableSentenceSpacing: boolean;
  lineHeight: number;
  letterSpacing: number;
  blockSpacing: number;
  contentPadding: number;
  avatarSizeValue: number;
  showLogDivider: boolean;
};

export const SettingsContext = createContext<SettingsContextType | null>(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{
  settings: SettingsContextType;
  children: React.ReactNode;
}> = ({ settings, children }) => {
  // Use useMemo to prevent unnecessary re-renders when the settings object reference changes but its items are effectively the same.
  // Actually, we'll depend on the properties inside settings.
  const value = useMemo(() => settings, [
    settings.theme,
    settings.fontSize,
    settings.textFontSize,
    settings.fontFamily,
    settings.cssFormat,
    settings.disableOtherColor,
    settings.showTabNames,
    settings.mergeTabStyles,
    settings.charSettings,
    settings.tabSettings,
    settings.hideEmptyAvatars,
    settings.hideAllAvatars,
    settings.narrationCharacter,
    settings.enableSentenceSpacing,
    settings.lineHeight,
    settings.letterSpacing,
    settings.blockSpacing,
    settings.contentPadding,
    settings.avatarSizeValue,
    settings.showLogDivider
  ]);
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

