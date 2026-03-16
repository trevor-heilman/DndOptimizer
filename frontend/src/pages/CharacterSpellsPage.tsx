/**
 * Character Spells Page
 *
 * Displays all spells across all of a character's spellbooks,
 * grouped by spell level with a character stats header.
 */
import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCharacter, useCharacterSpells, useUpdateCharacter } from '../hooks/useCharacters';
import { LoadingSpinner, AlertMessage } from '../components/ui';
import { CreateCharacterModal } from '../components/CreateCharacterModal';
import { getBookPalette } from '../constants/bookColors';
import type { CharacterSpell } from '../services/characters';
import type { CharacterCreate } from '../types/api';
import { exportCharacter } from '../services/characters';
import { downloadJson } from '../utils/download';

const SCHOOL_ABBR: Record<string, string> = {
  abjuration: 'Abj', conjuration: 'Con', divination: 'Div',
  enchantment: 'Enc', evocation: 'Evo', illusion: 'Ill',
  necromancy: 'Nec', transmutation: 'Trs',
};

function SpellRow({ entry }: { entry: CharacterSpell }) {
  const { spell } = entry;
  const levelLabel = spell.level === 0 ? 'Cantrip' : `Lvl ${spell.level}`;
  const school = SCHOOL_ABBR[spell.school?.toLowerCase()] ?? spell.school?.slice(0, 3) ?? '—';

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors hover:bg-white/5 ${
        entry.prepared ? '' : 'opacity-50'
      }`}
    >
      {/* Prepared indicator */}
      <div
        className="shrink-0 w-2 h-2 rounded-full"
        title={entry.prepared ? 'Prepared' : 'Not prepared'}
        style={{
          background: entry.prepared ? '#fde68a' : 'transparent',
          border: entry.prepared ? '1px solid #fbbf24' : '1px solid rgba(156,163,175,0.4)',
          boxShadow: entry.prepared ? '0 0 6px #fbbf2455' : 'none',
        }}
      />

      {/* Spell name */}
      <Link
        to={`/spells/${spell.id}`}
        className="flex-1 font-display text-sm text-parchment-200 hover:text-gold-300 transition-colors truncate"
      >
        {spell.name}
      </Link>

      {/* School badge */}
      <span className="shrink-0 font-display text-[10px] uppercase tracking-widest text-smoke-500 w-8 text-center">
        {school}
      </span>

      {/* Ritual / Concentration */}
      <div className="shrink-0 flex gap-1">
        {spell.ritual && (
          <span className="font-display text-[9px] uppercase tracking-widest px-1 rounded"
            style={{ background: 'rgba(109,40,217,0.3)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.3)' }}>
            R
          </span>
        )}
        {spell.concentration && (
          <span className="font-display text-[9px] uppercase tracking-widest px-1 rounded"
            style={{ background: 'rgba(6,78,59,0.4)', color: '#6ee7b7', border: '1px solid rgba(52,211,153,0.3)' }}>
            C
          </span>
        )}
      </div>

      {/* Level tag (for cantrips / context in mixed views) */}
      <span className="shrink-0 font-display text-[10px] uppercase tracking-widest text-smoke-600 w-12 text-right">
        {levelLabel}
      </span>

      {/* Source tome */}
      <Link
        to={`/spellbooks/${entry.spellbook_id}`}
        className="shrink-0 font-display text-[10px] text-smoke-600 hover:text-smoke-400 transition-colors truncate max-w-[120px]"
        title={entry.spellbook_name}
      >
        {entry.spellbook_name}
      </Link>
    </div>
  );
}

export function CharacterSpellsPage() {
  const { id } = useParams<{ id: string }>();
  const {
    data: character, isLoading: charLoading, error: charError,
  } = useCharacter(id ?? '', !!id);

  const {
    data: spells, isLoading: spellsLoading, error: spellsError,
  } = useCharacterSpells(id ?? '', !!id);

  const updateCharacter = useUpdateCharacter(id ?? '');
  const [editOpen, setEditOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!id || !character) return;
    setIsExporting(true);
    try {
      const data = await exportCharacter(id);
      downloadJson(data, `${character.name.replace(/[^a-zA-Z0-9]/g, '_')}_character.json`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveEdit = async (data: CharacterCreate) => {
    await updateCharacter.mutateAsync(data);
    setEditOpen(false);
  };

  const isLoading = charLoading || spellsLoading;
  const palette   = character ? getBookPalette(character.portrait_color) : getBookPalette('gold');

  // Group spells by level (0–9)
  const byLevel = new Map<number, CharacterSpell[]>();
  if (spells) {
    for (const entry of spells) {
      const lvl = entry.spell.level ?? 0;
      const list = byLevel.get(lvl) ?? [];
      list.push(entry);
      byLevel.set(lvl, list);
    }
    // Sort within each level by name
    for (const list of byLevel.values()) {
      list.sort((a, b) => a.spell.name.localeCompare(b.spell.name));
    }
  }

  const levels = Array.from(byLevel.keys()).sort((a, b) => a - b);
  const preparedCount = spells?.filter(e => e.prepared).length ?? 0;
  const totalCount    = spells?.length ?? 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">

      {/* Back link */}
      <div className="pt-4">
        <Link
          to="/spellbooks"
          className="font-display text-xs uppercase tracking-widest text-smoke-500 hover:text-smoke-300 transition-colors"
        >
          ← Back to Library
        </Link>
      </div>

      {/* Character header */}
      {character && (
        <div
          className="rounded-xl px-6 py-5"
          style={{
            background: `linear-gradient(90deg, ${palette.accent}12 0%, transparent 60%)`,
            border: `1px solid ${palette.border}`,
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-12 rounded-sm shrink-0"
              style={{ background: palette.grad, border: `1px solid ${palette.border}` }}
            />
            <div>
              <h1 className="font-display text-2xl font-bold" style={{ color: palette.label }}>
                {character.name}
              </h1>
              <p className="font-display text-sm text-smoke-400 mt-0.5">
                {character.character_class
                  ? `${character.character_class.charAt(0).toUpperCase() + character.character_class.slice(1)} · Level ${character.character_level}`
                  : `Level ${character.character_level}`}
              </p>
            </div>
            {/* Stats */}
            <div className="ml-auto flex items-center gap-5">
              <div className="text-center">
                <div className="font-display text-xl font-bold" style={{ color: palette.accent }}>
                  {character.spell_save_dc}
                </div>
                <div className="font-display text-[9px] uppercase tracking-widest text-smoke-500">Save DC</div>
              </div>
              <div className="text-center">
                <div className="font-display text-xl font-bold" style={{ color: palette.accent }}>
                  +{character.spell_attack_bonus}
                </div>
                <div className="font-display text-[9px] uppercase tracking-widest text-smoke-500">Atk Bonus</div>
              </div>
              {character.max_prepared_spells !== null && (
                <div className="text-center">
                  <div
                    className="font-display text-xl font-bold"
                    style={{ color: preparedCount > character.max_prepared_spells ? '#f87171' : palette.accent }}
                  >
                    {preparedCount}/{character.max_prepared_spells}
                  </div>
                  <div className="font-display text-[9px] uppercase tracking-widest text-smoke-500">Prepared</div>
                </div>
              )}
              <div className="text-center">
                <div className="font-display text-xl font-bold text-smoke-400">
                  {totalCount}
                </div>
                <div className="font-display text-[9px] uppercase tracking-widest text-smoke-500">Total</div>
              </div>
              <button
                onClick={() => setEditOpen(true)}
                className="font-display text-xs px-3 py-1.5 rounded transition-colors text-smoke-300 hover:text-parchment-100"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                ✎ Edit
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="font-display text-xs px-3 py-1.5 rounded transition-colors text-smoke-300 hover:text-parchment-100 disabled:opacity-50"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                title="Export character + spellbooks as JSON"
              >
                {isExporting ? '…' : '↓ Export'}
              </button>
            </div>
          </div>
        </div>
      )}

      {charError && (
        <AlertMessage variant="error" title="Could not load character" message="Check the URL and try again." />
      )}

      {isLoading && <LoadingSpinner />}

      {/* Spell list by level */}
      {!isLoading && !spellsError && (
        <>
          {totalCount === 0 ? (
            <div className="text-center py-16">
              <p className="font-display text-sm text-smoke-500 italic">No spells found across any tomes.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {levels.map(level => {
                const entries = byLevel.get(level) ?? [];
                const levelHeading = level === 0 ? 'Cantrips' : `Level ${level}`;
                const prepInLevel  = entries.filter(e => e.prepared).length;
                return (
                  <div
                    key={level}
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {/* Level header */}
                    <div
                      className="flex items-center gap-3 px-4 py-2"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    >
                      <span
                        className="font-display text-xs uppercase tracking-widest"
                        style={{ color: palette.accent }}
                      >
                        {levelHeading}
                      </span>
                      <span className="font-display text-[10px] text-smoke-600">
                        {prepInLevel}/{entries.length} prepared
                      </span>
                    </div>

                    {/* Spell rows */}
                    <div className="divide-y divide-white/5">
                      {entries.map(entry => (
                        <SpellRow key={entry.id} entry={entry} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {spellsError && (
        <AlertMessage variant="error" title="Could not load spells" message="Failed to fetch spells. Please try again." />
      )}

      {character && (
        <CreateCharacterModal
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={handleSaveEdit}
          existing={character}
        />
      )}
    </div>
  );
}

export default CharacterSpellsPage;
