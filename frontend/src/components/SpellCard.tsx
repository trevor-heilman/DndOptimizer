/**
 * Spell Card Component
 */
import { Link } from 'react-router-dom';
import type { Spell } from '../types/api';
import { getSchoolColors, getDamageColors } from '../constants/spellColors';

interface SpellCardProps {
  spell: Spell;
  /** Optional router state forwarded to the Link (e.g. spellbook context) */
  linkState?: object;
}

const TAG_STYLES: Record<string, { bg: string; color: string }> = {
  damage:        { bg: '#450a0a55', color: '#fca5a5' },
  healing:       { bg: '#052e1655', color: '#86efac' },
  aoe:           { bg: '#3c200555', color: '#fdba74' },
  crowd_control: { bg: '#2e1a5f55', color: '#c4b5fd' },
  summoning:     { bg: '#0c1a3355', color: '#93c5fd' },
  buff:          { bg: '#3d2a0a55', color: '#fde68a' },
  debuff:        { bg: '#1a0a2e55', color: '#d8b4fe' },
  utility:       { bg: '#1e1e2e55', color: '#94a3b8' },
};

function tagLabel(tag: string): string {
  return tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SpellCard({ spell, linkState }: SpellCardProps) {
  const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
  const schoolText = spell.school.charAt(0).toUpperCase() + spell.school.slice(1);
  const schoolColor = getSchoolColors(spell.school);

  return (
    <Link
      to={`/spells/${spell.id}`}
      state={linkState}
      className="block rounded-lg border border-smoke-700 bg-smoke-900
                 hover:border-opacity-80 hover:-translate-y-0.5
                 hover:shadow-lg transition-all duration-200 p-4 group"
      style={{ borderLeftColor: schoolColor.border, borderLeftWidth: 3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2 gap-2">
        <h3 className="font-display text-base font-semibold text-parchment-100 group-hover:text-gold-300 transition-colors leading-tight">
          {spell.name}
        </h3>
        {spell.concentration && (
          <span className="shrink-0 text-xs px-1.5 py-0.5 rounded font-display"
                style={{ background: '#3d2a0a55', color: '#fcd34d', border: '1px solid #78350f' }}>
            ◎ Conc
          </span>
        )}
      </div>

      {/* Level + School badges */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-display font-medium px-2 py-0.5 rounded"
              style={{ background: '#2a2a35', color: '#fbbf24', border: '1px solid #4b4b58' }}>
          {levelText}
        </span>
        <span className="text-xs font-display font-medium px-2 py-0.5 rounded"
              style={{ background: schoolColor.bg, color: schoolColor.text, border: `1px solid ${schoolColor.border}44` }}>
          {schoolText}
        </span>
        {spell.ritual && (
          <span className="text-xs font-display px-1.5 py-0.5 rounded"
                style={{ background: '#2e1a5f44', color: '#c4b5fd', border: '1px solid #4c1d9544' }}>
            Ritual
          </span>
        )}
      </div>

      {/* Description */}
      <p className="font-body text-sm text-parchment-400 mb-3 line-clamp-2 leading-relaxed">
        {spell.description}
      </p>

      {/* Cast / Range footer */}
      <div className="flex items-center gap-4 text-xs text-smoke-400 font-body">
        <span>⏱ {spell.casting_time}</span>
        <span>⊕ {spell.range}</span>
      </div>

      {/* Damage components */}
      {spell.damage_components && spell.damage_components.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {spell.damage_components.slice(0, 3).map((dc, idx) => {
            const dc_colors = getDamageColors(dc.damage_type ?? '');
            return (
              <span
                key={idx}
                className="text-xs font-body font-medium px-2 py-0.5 rounded"
                style={{ background: dc_colors.bg, color: dc_colors.text }}
              >
                {dc.dice_count}d{dc.die_size} {dc.damage_type}
              </span>
            );
          })}
        </div>
      )}

      {/* Gameplay tags */}
      {spell.tags && spell.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {spell.tags.map((tag) => {
            const style = TAG_STYLES[tag] ?? TAG_STYLES.utility;
            return (
              <span
                key={tag}
                className="text-xs font-display px-2 py-0.5 rounded"
                style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}33` }}
              >
                {tagLabel(tag)}
              </span>
            );
          })}
        </div>
      )}
    </Link>
  );
}

// ─── SpellCardGrid ───────────────────────────────────────────────────────────
// Shared responsive grid used by both SpellsPage and SpellbookDetailPage.
// Extract here so both Always Stay In Sync — never duplicate this class string.

interface SpellCardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function SpellCardGrid({ children, className }: SpellCardGridProps) {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[1920px]:grid-cols-7 gap-3${className ? ` ${className}` : ''}`}
    >
      {children}
    </div>
  );
}

export default SpellCard;
