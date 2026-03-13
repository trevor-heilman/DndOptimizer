/**
 * 16 theme-matched book/character colors for the arcane library shelf.
 * Each entry maps a color key to its gradient, accent, label text, and border colors.
 */
import type { BookColor } from '../types/api';

export interface BookPalette {
  name: string;
  grad: string;
  accent: string;
  label: string;
  border: string;
}

export const BOOK_PALETTES: Record<BookColor, BookPalette> = {
  violet:   { name: 'Violet',   grad: 'linear-gradient(180deg, #3b0764 0%, #1e0533 100%)', accent: '#a78bfa', label: '#e9d5ff', border: 'rgba(167,139,250,0.45)' },
  crimson:  { name: 'Crimson',  grad: 'linear-gradient(180deg, #7f1d1d 0%, #450a0a 100%)', accent: '#f87171', label: '#fee2e2', border: 'rgba(248,113,113,0.45)' },
  emerald:  { name: 'Emerald',  grad: 'linear-gradient(180deg, #14532d 0%, #052e16 100%)', accent: '#6ee7b7', label: '#d1fae5', border: 'rgba(110,231,183,0.40)' },
  sapphire: { name: 'Sapphire', grad: 'linear-gradient(180deg, #1e3a5f 0%, #0c1d33 100%)', accent: '#93c5fd', label: '#dbeafe', border: 'rgba(147,197,253,0.45)' },
  amber:    { name: 'Amber',    grad: 'linear-gradient(180deg, #7c2d12 0%, #3b1005 100%)', accent: '#fca553', label: '#ffedd5', border: 'rgba(252,165,83,0.45)'  },
  teal:     { name: 'Teal',     grad: 'linear-gradient(180deg, #134e4a 0%, #042f2e 100%)', accent: '#2dd4bf', label: '#ccfbf1', border: 'rgba(45,212,191,0.40)'  },
  indigo:   { name: 'Indigo',   grad: 'linear-gradient(180deg, #1e1b4b 0%, #0b0921 100%)', accent: '#a5b4fc', label: '#e0e7ff', border: 'rgba(165,180,252,0.45)' },
  gold:     { name: 'Gold',     grad: 'linear-gradient(180deg, #713f12 0%, #2d1a05 100%)', accent: '#fde68a', label: '#fef9c3', border: 'rgba(253,230,138,0.45)' },
  ruby:     { name: 'Ruby',     grad: 'linear-gradient(180deg, #881337 0%, #4c0519 100%)', accent: '#fb7185', label: '#fecdd3', border: 'rgba(251,113,133,0.45)' },
  forest:   { name: 'Forest',   grad: 'linear-gradient(180deg, #2d4a1e 0%, #142008 100%)', accent: '#86efac', label: '#dcfce7', border: 'rgba(134,239,172,0.40)' },
  slate:    { name: 'Slate',    grad: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)', accent: '#94a3b8', label: '#e2e8f0', border: 'rgba(148,163,184,0.40)' },
  rose:     { name: 'Rose',     grad: 'linear-gradient(180deg, #6d1b47 0%, #340a22 100%)', accent: '#f9a8d4', label: '#fce7f3', border: 'rgba(249,168,212,0.40)' },
  copper:   { name: 'Copper',   grad: 'linear-gradient(180deg, #7c3d12 0%, #431d07 100%)', accent: '#fb923c', label: '#fed7aa', border: 'rgba(251,146,60,0.45)'  },
  midnight: { name: 'Midnight', grad: 'linear-gradient(180deg, #0f172a 0%, #06080f 100%)', accent: '#818cf8', label: '#c7d2fe', border: 'rgba(129,140,248,0.45)' },
  ivory:    { name: 'Ivory',    grad: 'linear-gradient(180deg, #44403c 0%, #1c1917 100%)', accent: '#e7e5e4', label: '#fafaf9', border: 'rgba(231,229,228,0.30)' },
  obsidian: { name: 'Obsidian', grad: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)', accent: '#71717a', label: '#d4d4d8', border: 'rgba(113,113,122,0.35)' },
  white:    { name: 'White',    grad: 'linear-gradient(180deg, #f1f5f9 0%, #cbd5e1 100%)', accent: '#475569', label: '#0f172a', border: 'rgba(148,163,184,0.55)' },
};

export const BOOK_COLOR_LIST: BookColor[] = [
  'violet', 'crimson', 'emerald', 'sapphire',
  'amber',  'teal',    'indigo',  'gold',
  'ruby',   'forest',  'slate',   'rose',
  'copper', 'midnight','ivory',   'obsidian',
  'white',
];

/** Returns the palette for a given color key, falling back to violet. */
export function getBookPalette(color?: string | null): BookPalette {
  return BOOK_PALETTES[(color as BookColor) ?? 'violet'] ?? BOOK_PALETTES.violet;
}
