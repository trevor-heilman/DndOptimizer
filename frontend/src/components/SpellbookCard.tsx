/**
 * Spellbook Card — rendered as an arcane book spine on the library shelf.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Spellbook } from '../types/api';
import { getBookPalette } from '../constants/bookColors';
import { exportSpellbook } from '../services/spellbooks';
import { downloadJson } from '../utils/download';

interface SpellbookCardProps {
  spellbook: Spellbook;
  /** Fallback color index used only when spellbook.book_color is absent (legacy). */
  colorIndex?: number;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

/** Legacy fallback palette list (same order as before, indexed by colorIndex). */
const LEGACY_PALETTE_KEYS = [
  'violet','ruby','emerald','sapphire','amber','teal','indigo','gold',
] as const;

export function SpellbookCard({ spellbook, colorIndex = 0, onDelete, onDuplicate }: SpellbookCardProps) {
  const [hovered, setHovered] = useState(false);
  const [exporting, setExporting] = useState(false);
  const colorKey = spellbook.book_color ?? LEGACY_PALETTE_KEYS[colorIndex % LEGACY_PALETTE_KEYS.length];
  const palette = getBookPalette(colorKey);
  const preparedCount = spellbook.prepared_spell_count ?? spellbook.prepared_spells?.length ?? 0;
  const totalSpells = spellbook.spell_count ?? 0;

  const handleExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    setExporting(true);
    try {
      const data = await exportSpellbook(spellbook.id);
      downloadJson(data, `${spellbook.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      className="relative flex-shrink-0 select-none"
      style={{ width: '76px' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Hover popover ────────────────────────────────────────────── */}
      <div
        className="absolute z-50 left-1/2 w-56 rounded-xl p-4 transition-all duration-200"
        style={{
          bottom: 'calc(100% + 8px)',
          transform: `translateX(-50%) translateY(${hovered ? '0px' : '6px'})`,
          background: '#0d0720',
          border: `1px solid ${palette.border}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.75), 0 0 20px ${palette.accent}18`,
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        <p className="font-display text-sm font-bold mb-1 leading-snug" style={{ color: spellbook.label_color || palette.label }}>
          {spellbook.name}
        </p>
        {spellbook.character_class && (
          <p className="font-display text-[10px] uppercase tracking-widest mb-1" style={{ color: palette.accent, opacity: 0.75 }}>
            {spellbook.character_class}{spellbook.character_level ? ` · Lv ${spellbook.character_level}` : ''}
          </p>
        )}
        {spellbook.description && (
          <p className="font-body text-xs text-parchment-400 mb-3 italic" style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {spellbook.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs mb-3 font-body text-parchment-300">
          <span>{totalSpells} spells</span>
          {preparedCount > 0 && (
            <span
              className="px-1.5 py-0.5 rounded text-[10px]"
              style={{ background: '#14200a', color: '#86efac', border: '1px solid #166534' }}
            >
              {preparedCount} prepared
            </span>
          )}
        </div>
        <div className="flex gap-1.5">
          <Link
            to={`/spellbooks/${spellbook.id}`}
            className="flex-1 text-center font-display text-xs py-1.5 px-2 rounded transition-colors"
            style={{ background: palette.accent + '22', color: palette.label, border: `1px solid ${palette.border}` }}
          >
            Open
          </Link>
          {onDuplicate && (
            <button
              onClick={(e) => { e.preventDefault(); onDuplicate(spellbook.id); }}
              className="font-display text-xs py-1.5 px-2 rounded text-parchment-400 hover:text-parchment-200 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              title="Duplicate"
            >
              ⧉
            </button>
          )}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="font-display text-xs py-1.5 px-2 rounded text-parchment-400 hover:text-parchment-200 transition-colors disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Export JSON"
          >
            ↓
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if (window.confirm(`Delete "${spellbook.name}"?`)) onDelete(spellbook.id);
              }}
              className="font-display text-xs py-1.5 px-2 rounded transition-colors"
              style={{ background: 'rgba(220,38,38,0.08)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }}
              title="Delete"
            >
              ✕
            </button>
          )}
        </div>
        {spellbook.updated_at && (
          <p className="font-body text-[10px] text-smoke-500 italic mt-2">
            Updated {new Date(spellbook.updated_at).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* ── Book spine ───────────────────────────────────────────────── */}
      <Link
        to={`/spellbooks/${spellbook.id}`}
        className="flex flex-col items-center rounded-sm cursor-pointer transition-all duration-300"
        style={{
          height: '228px',
          background: palette.grad,
          border: `1px solid ${palette.border}`,
          boxShadow: hovered
            ? `0 -10px 28px ${palette.accent}28, 3px 6px 16px rgba(0,0,0,0.7)`
            : '2px 4px 10px rgba(0,0,0,0.55)',
          transform: hovered ? 'translateY(-18px)' : 'translateY(0)',
        }}
        tabIndex={-1}
        aria-label={`Open spellbook: ${spellbook.name}`}
      >
        {/* Top band */}
        <div className="w-full h-3 rounded-t-sm flex-shrink-0" style={{ background: palette.accent + '28', borderBottom: `1px solid ${palette.accent}55` }} />
        <div className="w-3/4 h-px flex-shrink-0 mt-0.5" style={{ background: palette.accent + '55' }} />

        {/* Title — vertical, bottom-to-top */}
        <div
          className="flex-1 flex items-center justify-center w-full overflow-hidden px-1.5 py-2"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          <span
            className="font-display text-[11px] font-bold uppercase tracking-wide"
            style={{
              color: spellbook.label_color || palette.label,
              textShadow: `0 0 10px ${palette.accent}55`,
              maxHeight: '130px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {spellbook.name}
          </span>
        </div>

        {/* Center ornament */}
        <div className="flex-shrink-0 my-0.5">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <circle cx="9" cy="9" r="5.5" stroke={palette.accent} strokeWidth="0.7" strokeOpacity="0.6" />
            <circle cx="9" cy="9" r="2.5" fill={palette.accent} fillOpacity="0.4" />
            <line x1="9" y1="1.5" x2="9" y2="4" stroke={palette.accent} strokeWidth="0.7" strokeOpacity="0.55" />
            <line x1="9" y1="14" x2="9" y2="16.5" stroke={palette.accent} strokeWidth="0.7" strokeOpacity="0.55" />
            <line x1="1.5" y1="9" x2="4" y2="9" stroke={palette.accent} strokeWidth="0.7" strokeOpacity="0.55" />
            <line x1="14" y1="9" x2="16.5" y2="9" stroke={palette.accent} strokeWidth="0.7" strokeOpacity="0.55" />
          </svg>
        </div>

        {/* Spell count */}
        <div className="flex-shrink-0 text-center mt-0.5">
          <span className="font-display text-[9px] font-semibold uppercase tracking-widest" style={{ color: palette.accent, opacity: 0.7 }}>
            {totalSpells}
          </span>
        </div>

        {/* Bottom band */}
        <div className="w-3/4 h-px flex-shrink-0 mb-0.5" style={{ background: palette.accent + '55' }} />
        <div className="w-full h-3 rounded-b-sm flex-shrink-0" style={{ background: palette.accent + '28', borderTop: `1px solid ${palette.accent}55` }} />
      </Link>
    </div>
  );
}

export default SpellbookCard;
