/**
 * Admin Confidence Review Page
 *
 * Lists spells whose parsing confidence is low or flagged for review.
 * Shows original raw JSON, explains why confidence is low, and lets
 * an admin mark each spell as reviewed.
 */
import { useState } from 'react';
import { useNeedsReview, useMarkReviewed } from '../hooks/useSpells';
import type { Spell, SpellParsingMetadata } from '../types/api';

// ── Confidence explanation helper ─────────────────────────────────────────────
function buildExplanation(meta: SpellParsingMetadata): string[] {
  const notes = meta.parsing_notes ?? {};
  const reasons: string[] = [];

  if (!Array.isArray(notes.dice_expressions) || notes.dice_expressions.length === 0) {
    reasons.push('No damage dice expressions were found in the spell description.');
  }
  if (!Array.isArray(notes.damage_types) || notes.damage_types.length === 0) {
    reasons.push('No damage type (e.g. fire, cold) could be identified.');
  }
  if (notes.is_attack_roll === false && notes.is_saving_throw === false) {
    reasons.push(
      'Could not determine whether this spell uses an attack roll or a saving throw.',
    );
  }
  if (notes.is_saving_throw && !notes.save_type) {
    reasons.push('A saving throw was detected but the ability score (STR/DEX/etc.) is unknown.');
  }
  if (notes.half_damage_on_save === undefined || notes.half_damage_on_save === null) {
    reasons.push('Could not determine whether a failed save deals half or no damage.');
  }
  if (notes.upcast_scaling === false) {
    reasons.push('No upcasting scaling rule was found despite the spell having higher-level text.');
  }

  if (reasons.length === 0) {
    reasons.push('Confidence was low for unspecified reasons — manual review recommended.');
  }
  return reasons;
}

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  let colorClass = 'text-emerald-400 border-emerald-700 bg-emerald-950';
  if (value < 0.75) colorClass = 'text-yellow-400 border-yellow-700 bg-yellow-950';
  if (value < 0.5) colorClass = 'text-crimson-400 border-crimson-700 bg-crimson-950';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-display font-semibold border ${colorClass}`}
    >
      {pct}% confidence
    </span>
  );
}

// ── Single spell review card ──────────────────────────────────────────────────
function SpellReviewCard({ spell, onMarked }: { spell: Spell; onMarked: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const markReviewed = useMarkReviewed();
  const meta = spell.parsing_metadata;
  if (!meta) return null;

  const reasons = buildExplanation(meta);

  return (
    <div className="dnd-card p-5 mb-4 border border-smoke-700">
      {/* Header row */}
      <div className="flex flex-wrap items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold text-parchment-100 truncate">
            {spell.name}
          </h3>
          <p className="font-body text-sm text-smoke-400 mt-0.5">
            {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} ·{' '}
            {spell.school.charAt(0).toUpperCase() + spell.school.slice(1)}
            {spell.source && <span> · {spell.source}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ConfidenceBadge value={meta.parsing_confidence} />
          {meta.reviewed_by && (
            <span className="font-body text-xs text-smoke-500 italic">
              Reviewed by {meta.reviewed_by}
            </span>
          )}
        </div>
      </div>

      {/* Why confidence is low */}
      <div className="mb-3 p-3 rounded bg-smoke-900 border border-smoke-700">
        <p className="font-display text-xs font-semibold text-smoke-300 uppercase tracking-wider mb-2">
          Why review is needed
        </p>
        <ul className="font-body text-sm text-parchment-400 space-y-1 list-disc list-inside">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {/* Raw JSON toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="font-body text-xs text-arcane-300 hover:text-arcane-200 transition-colors mb-3"
      >
        {expanded ? '▲ Hide raw JSON' : '▼ Show original JSON data'}
      </button>

      {expanded && spell.raw_data && (
        <pre className="mt-1 mb-3 p-3 rounded bg-smoke-950 border border-smoke-700 font-mono text-xs text-parchment-400 overflow-auto max-h-72 whitespace-pre-wrap break-all">
          {JSON.stringify(spell.raw_data, null, 2)}
        </pre>
      )}
      {expanded && !spell.raw_data && (
        <p className="font-body text-xs text-smoke-500 italic mb-3">
          No raw JSON data available for this spell.
        </p>
      )}

      {/* Mark as reviewed */}
      <div className="flex justify-end">
        <button
          onClick={async () => {
            await markReviewed.mutateAsync(spell.id);
            onMarked();
          }}
          disabled={markReviewed.isPending}
          className="btn-primary text-sm disabled:opacity-50"
        >
          {markReviewed.isPending ? 'Saving…' : '✔ Mark as Reviewed'}
        </button>
      </div>

      {markReviewed.isError && (
        <p className="font-body text-xs text-crimson-400 mt-2 text-right">
          Failed to mark as reviewed. Please try again.
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function AdminReviewPage() {
  const { data: spells, isLoading, isError, refetch } = useNeedsReview();

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-gold-300 mb-2 flex items-center gap-2">
        <span aria-hidden="true">🛡️</span> Parsing Confidence Review
      </h1>
      <p className="font-body text-parchment-400 mb-6">
        Spells listed here have low parsing confidence or were flagged during import. Review the
        original JSON and the explanation, then mark each spell as reviewed once you're satisfied
        the data is correct.
      </p>

      {isLoading && (
        <div className="dnd-card p-8 text-center">
          <p className="font-body text-parchment-400 animate-pulse">Loading spells for review…</p>
        </div>
      )}

      {isError && (
        <div className="dnd-card border-l-4 border-crimson-700 p-6">
          <h2 className="font-display text-xl font-semibold text-crimson-400 mb-2">Error</h2>
          <p className="font-body text-parchment-400">
            Could not load spells for review. Make sure you are logged in as an admin.
          </p>
          <button onClick={() => refetch()} className="btn-secondary mt-4 text-sm">
            Retry
          </button>
        </div>
      )}

      {spells && spells.length === 0 && (
        <div className="dnd-card p-8 text-center">
          <p className="font-display text-xl text-emerald-400 mb-1">✅ All clear!</p>
          <p className="font-body text-parchment-400">
            No spells are currently flagged for confidence review.
          </p>
        </div>
      )}

      {spells && spells.length > 0 && (
        <>
          <p className="font-body text-sm text-smoke-400 mb-4">
            {spells.length} spell{spells.length !== 1 ? 's' : ''} awaiting review
          </p>
          {spells.map((spell) => (
            <SpellReviewCard key={spell.id} spell={spell} onMarked={() => refetch()} />
          ))}
        </>
      )}
    </div>
  );
}

export default AdminReviewPage;
