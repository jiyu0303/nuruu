import { twMerge } from 'tailwind-merge';
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const r = (n: number) => Math.round(n * 10) / 10;

export const rgbToHex = (colorStr: string) => {
  if (!colorStr) return '#000000';
  const trimmed = colorStr.trim();
  if (trimmed.startsWith('#')) return trimmed;
  
  const match = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
  if (!match) return '#000000';
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const linkifyAndFormat = (text: string) => {
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  let processed = text.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: underline;">$1</a>');
  processed = processed.replace(/\n/g, '<br/>');
  return processed;
};

export const hexToRgbValues = (hex: string) => {
  if (!hex) return { r: 0, g: 0, b: 0 };
  const str = hex.replace('#', '');
  const r = parseInt(str.length === 3 ? str.slice(0, 1).repeat(2) : str.slice(0, 2), 16) || 0;
  const g = parseInt(str.length === 3 ? str.slice(1, 2).repeat(2) : str.slice(2, 4), 16) || 0;
  const b = parseInt(str.length === 3 ? str.slice(2, 3).repeat(2) : str.slice(4, 6), 16) || 0;
  return { r, g, b };
};

export const rgbToHexValues = ({ r, g, b }: { r: number; g: number; b: number }) => {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

export const hexToHsl = (hex: string) => {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;
  if (max === min) h = s = 0;
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const getFileNameFromUrl = (url: string) => {
  try {
    const decoded = decodeURIComponent(url);
    const lastSlash = decoded.lastIndexOf('/');
    if (lastSlash === -1) return url;
    let name = decoded.substring(lastSlash + 1);
    const queryIndex = name.indexOf('?');
    if (queryIndex !== -1) {
      name = name.substring(0, queryIndex);
    }
    return name || 'image';
  } catch (e) {
    return 'image';
  }
};
