/**
 * Home/Dashboard Page
 */
import { type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ── Inline SVG arcane sigils ─────────────────────────────────────────────────

function RuneCircle({ stroke, glow }: { stroke: string; glow: string }) {
  const ticks = Array.from({ length: 32 }, (_, i) => {
    const angle = ((i * 360) / 32 - 90) * (Math.PI / 180);
    const r1 = 88;
    const r2 = i % 8 === 0 ? 74 : i % 4 === 0 ? 80 : 84;
    return (
      <line
        key={i}
        x1={100 + r1 * Math.cos(angle)} y1={100 + r1 * Math.sin(angle)}
        x2={100 + r2 * Math.cos(angle)} y2={100 + r2 * Math.sin(angle)}
        stroke={stroke} strokeWidth={i % 8 === 0 ? 1.5 : 0.8} strokeOpacity={i % 8 === 0 ? 0.9 : 0.45}
      />
    );
  });

  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id={`glow-${glow}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={glow} stopOpacity="0.35" />
          <stop offset="100%" stopColor={glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="94" fill={`url(#glow-${glow})`} />
      <circle cx="100" cy="100" r="88" stroke={stroke} strokeWidth="1" strokeOpacity="0.55" />
      <circle cx="100" cy="100" r="82" stroke={stroke} strokeWidth="0.5" strokeDasharray="3 9" strokeOpacity="0.35" />
      {ticks}
      <circle cx="100" cy="100" r="58" stroke={stroke} strokeWidth="1" strokeOpacity="0.6" />
      <circle cx="100" cy="100" r="48" stroke={stroke} strokeWidth="0.5" strokeOpacity="0.3" />
    </svg>
  );
}

/** Overlaid central symbol — differs per card */
function LibrarySigil() {
  // Seven-pointed star (heptagram) — knowledge
  const pts = Array.from({ length: 7 }, (_, i) => {
    const outer = ((i * 360) / 7 - 90) * (Math.PI / 180);
    const inner = (((i + 0.5) * 360) / 7 - 90) * (Math.PI / 180);
    return `${100 + 40 * Math.cos(outer)},${100 + 40 * Math.sin(outer)} ${100 + 18 * Math.cos(inner)},${100 + 18 * Math.sin(inner)}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" fill="none" aria-hidden="true">
      <polygon points={pts} stroke="#a78bfa" strokeWidth="1.2" fill="rgba(124,58,237,0.08)" strokeOpacity="0.8" />
      <circle cx="100" cy="100" r="7" fill="#a78bfa" fillOpacity="0.7" />
      <text x="100" y="176" textAnchor="middle" fill="#7c3aed" fontSize="8" fontFamily="serif" letterSpacing="6" opacity="0.55">ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ</text>
    </svg>
  );
}

function SpellbookSigil() {
  // Triquetra / three interlocking circles — wisdom & union
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" fill="none" aria-hidden="true">
      <circle cx="100" cy="82" r="26" stroke="#fbbf24" strokeWidth="1.2" fill="rgba(251,191,36,0.06)" strokeOpacity="0.75" />
      <circle cx="85" cy="108" r="26" stroke="#fbbf24" strokeWidth="1.2" fill="rgba(251,191,36,0.06)" strokeOpacity="0.75" />
      <circle cx="115" cy="108" r="26" stroke="#fbbf24" strokeWidth="1.2" fill="rgba(251,191,36,0.06)" strokeOpacity="0.75" />
      <circle cx="100" cy="100" r="7" fill="#fbbf24" fillOpacity="0.65" />
      <text x="100" y="176" textAnchor="middle" fill="#b45309" fontSize="8" fontFamily="serif" letterSpacing="6" opacity="0.55">ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ</text>
    </svg>
  );
}

function CompareSigil() {
  // Scales of balance — two circles on a fulcrum
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" fill="none" aria-hidden="true">
      {/* beam */}
      <line x1="48" y1="100" x2="152" y2="100" stroke="#f87171" strokeWidth="1.5" strokeOpacity="0.7" />
      {/* fulcrum */}
      <line x1="100" y1="100" x2="100" y2="128" stroke="#f87171" strokeWidth="1.5" strokeOpacity="0.7" />
      <polygon points="86,128 100,148 114,128" stroke="#f87171" strokeWidth="1" fill="rgba(248,113,113,0.1)" strokeOpacity="0.7" />
      {/* pans */}
      <circle cx="60" cy="116" r="20" stroke="#f87171" strokeWidth="1.2" fill="rgba(248,113,113,0.07)" strokeOpacity="0.75" />
      <circle cx="140" cy="116" r="20" stroke="#f87171" strokeWidth="1.2" fill="rgba(248,113,113,0.07)" strokeOpacity="0.75" />
      <line x1="48" y1="100" x2="60" y2="116" stroke="#f87171" strokeWidth="0.8" strokeOpacity="0.5" />
      <line x1="152" y1="100" x2="140" y2="116" stroke="#f87171" strokeWidth="0.8" strokeOpacity="0.5" />
      {/* central gem */}
      <circle cx="100" cy="100" r="5" fill="#f87171" fillOpacity="0.7" />
      <text x="100" y="176" textAnchor="middle" fill="#be123c" fontSize="8" fontFamily="serif" letterSpacing="6" opacity="0.55">ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ</text>
    </svg>
  );
}

// ── Card data ─────────────────────────────────────────────────────────────────

type CardDef = {
  to: string;
  title: string;
  subtitle: string;
  description: string;
  lore: string;
  stroke: string;
  glow: string;
  tagColor: string;
  cardBg: string;
  borderCss: string;
  Sigil: () => ReactElement;
};

const CARDS: CardDef[] = [
  {
    to: '/spells',
    title: 'Spell Library',
    subtitle: 'Explore & Filter',
    description: 'Browse every spell in your collection. Filter by class, school, damage type, concentration, and components to find the perfect incantation.',
    lore: 'The Repository of Arcane Knowledge',
    stroke: '#7c3aed',
    glow: '#7c3aed',
    tagColor: '#a78bfa',
    cardBg: 'linear-gradient(175deg, #0d0720 0%, #160b30 40%, #1a0d38 100%)',
    borderCss: '1px solid rgba(109,40,217,0.45)',
    Sigil: LibrarySigil,
  },
  {
    to: '/spellbooks',
    title: 'Spellbooks',
    subtitle: 'Prepare & Organize',
    description: "Craft your character's prepared spell list. Build spellbooks for each character, track readied spells, and optimize your arcane loadout.",
    lore: 'The Tome of Prepared Arts',
    stroke: '#d97706',
    glow: '#b45309',
    tagColor: '#fbbf24',
    cardBg: 'linear-gradient(175deg, #150d02 0%, #271400 40%, #2e1800 100%)',
    borderCss: '1px solid rgba(180,83,9,0.45)',
    Sigil: SpellbookSigil,
  },
  {
    to: '/compare',
    title: 'Compare Spells',
    subtitle: 'Optimize & Decide',
    description: 'Pit spells against each other with mathematical precision. Tune AC, save DC, and slot level to find the optimal spell for every encounter.',
    lore: 'The Scales of Arcane Judgment',
    stroke: '#e11d48',
    glow: '#be123c',
    tagColor: '#f87171',
    cardBg: 'linear-gradient(175deg, #180409 0%, #2a0612 40%, #300a18 100%)',
    borderCss: '1px solid rgba(190,18,60,0.45)',
    Sigil: CompareSigil,
  },
];

// ── Corner ornament ───────────────────────────────────────────────────────────

function CornerOrnament({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 opacity-50" fill="none" aria-hidden="true">
      <path d="M2 2 L10 2 L2 10 Z" stroke={color} strokeWidth="0.8" fill={color} fillOpacity="0.15" />
      <circle cx="2" cy="2" r="1.5" fill={color} fillOpacity="0.7" />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-16">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="relative text-center py-16">
        {/* ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none" aria-hidden="true">
          <div className="w-96 h-96 rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
        </div>

        <div className="relative z-10">
          <p className="font-display uppercase tracking-[0.35em] text-xs text-arcane-400 mb-5">
            ✦ &nbsp; D&amp;D 5e Spell Analysis &nbsp; ✦
          </p>
          <h1
            className="font-display text-5xl md:text-7xl font-extrabold tracking-wide mb-5"
            style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 40%, #d97706 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
          >
            Spellwright
          </h1>
          <div className="flex items-center justify-center gap-3 mb-6 text-arcane-500 select-none" aria-hidden="true">
            <div className="h-px w-24 bg-gradient-to-r from-transparent to-arcane-700" />
            <span className="text-lg">✦</span>
            <div className="h-px w-24 bg-gradient-to-l from-transparent to-arcane-700" />
          </div>
          <p className="font-body text-lg md:text-xl text-parchment-200 max-w-2xl mx-auto leading-relaxed">
            Wield the power of mathematics to master the arcane arts.<br />
            Optimize your spell selections and dominate every encounter.
          </p>
        </div>
      </div>

      {/* ── Tarot-style feature cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {CARDS.map(({ to, title, subtitle, description, lore, stroke, glow, tagColor, cardBg, borderCss, Sigil }) => (
          <Link
            key={to}
            to={to}
            className="group block relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ background: cardBg, border: borderCss, minHeight: '560px',
              boxShadow: `0 4px 24px rgba(0,0,0,0.5), inset 0 0 40px rgba(0,0,0,0.3)` }}
          >
            {/* Hover glow overlay */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
              style={{ background: `radial-gradient(ellipse at 50% 30%, ${glow}22 0%, transparent 65%)` }} />

            {/* Corner ornaments */}
            <div className="absolute top-3 left-3"><CornerOrnament color={stroke} /></div>
            <div className="absolute top-3 right-3 rotate-90"><CornerOrnament color={stroke} /></div>
            <div className="absolute bottom-3 left-3 -rotate-90"><CornerOrnament color={stroke} /></div>
            <div className="absolute bottom-3 right-3 rotate-180"><CornerOrnament color={stroke} /></div>

            {/* ─ Sigil area ─ */}
            <div className="relative mx-auto mt-8 mb-2" style={{ width: '168px', height: '168px' }}>
              {/* Ring layer */}
              <RuneCircle stroke={stroke} glow={glow} />
              {/* Symbol layer */}
              <Sigil />
            </div>

            {/* ─ Lore subtitle ─ */}
            <p className="font-display text-[10px] uppercase tracking-[0.3em] text-center mb-4 opacity-50"
              style={{ color: stroke }}>
              {lore}
            </p>

            {/* ─ Ornate separator ─ */}
            <div className="flex items-center px-8 mb-5" aria-hidden="true">
              <div className="flex-1 h-px opacity-30" style={{ background: stroke }} />
              <span className="mx-3 text-xs opacity-60" style={{ color: stroke }}>⬡</span>
              <div className="flex-1 h-px opacity-30" style={{ background: stroke }} />
            </div>

            {/* ─ Text body ─ */}
            <div className="px-7 pb-10 flex flex-col gap-3">
              <p className="font-display text-xs uppercase tracking-widest" style={{ color: tagColor }}>
                {subtitle}
              </p>
              <h3 className="font-display text-2xl font-bold text-parchment-100 group-hover:text-white transition-colors">
                {title}
              </h3>
              <p className="font-body text-[15px] text-parchment-300 leading-relaxed">
                {description}
              </p>

              {/* Bottom enter link */}
              <div className="mt-4 flex items-center gap-2 font-display text-xs uppercase tracking-widest transition-colors"
                style={{ color: tagColor }}>
                <span>Enter</span>
                <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Sign-up prompt (logged-out only) ──────────────────────────── */}
      {!user && (
        <p className="text-center font-body text-sm text-smoke-400">
          <Link to="/register" className="text-gold-400 hover:text-gold-300 underline underline-offset-2 transition-colors">
            Create an account
          </Link>{' '}
          to import spells, build spellbooks, and save your progress.
        </p>
      )}

    </div>
  );
}

export default HomePage;

