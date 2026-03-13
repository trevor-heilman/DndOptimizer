/**
 * Spellbooks Page â€” Arcane Library
 *
 * Displays characters as shelves. Each shelf shows:
 *  - Character header row: name, class, level, computed stats, spell slot tracker
 *  - Book spines for that character's spellbooks
 *
 * An "Unassigned" shelf collects spellbooks not linked to any character.
 */
import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  useSpellbooks, useCreateSpellbook, useDeleteSpellbook, useDuplicateSpellbook,
  useReorderSpellbooks,
} from '../hooks/useSpellbooks';
import {
  useCharacters, useCreateCharacter, useUpdateCharacter, useDeleteCharacter,
  useUpdateSpellSlots, useResetSpellSlots,
} from '../hooks/useCharacters';
import { SpellbookCard } from '../components/SpellbookCard';
import { CreateSpellbookModal } from '../components/CreateSpellbookModal';
import { CreateCharacterModal } from '../components/CreateCharacterModal';
import { LoadingSpinner, AlertMessage } from '../components/ui';
import type {
  Character, Spellbook, SpellbookCreate, CharacterCreate, CharacterUpdate,
} from '../types/api';
import { getBookPalette } from '../constants/bookColors';
import { getSpellSlots } from '../constants/spellSlots';

// â”€â”€â”€ SpellSlotTracker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface SpellSlotTrackerProps {
  character: Character;
}

function SpellSlotTracker({ character }: SpellSlotTrackerProps) {
  const updateSlots = useUpdateSpellSlots(character.id);
  const resetSlots  = useResetSpellSlots(character.id);

  const maxSlots = getSpellSlots(character.character_class, character.character_level);
  if (!maxSlots) return null;

  const used: number[] =
    Array.isArray(character.spell_slots_used) && character.spell_slots_used.length === 9
      ? character.spell_slots_used
      : Array(9).fill(0);

  const activeLevels = maxSlots
    .map((max, i) => ({ level: i + 1, max, used: Math.min(used[i] ?? 0, max) }))
    .filter(r => r.max > 0);

  if (!activeLevels.length) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {activeLevels.map(({ level, max, used: usedCount }) => (
        <div key={level} className="flex items-center gap-1">
          <span className="font-display text-[9px] uppercase tracking-widest text-smoke-500 w-4 text-right shrink-0">
            {level}
          </span>
          <div className="flex gap-0.5">
            {Array.from({ length: max }).map((_, pip) => {
              const spent = pip < usedCount;
              return (
                <button
                  key={pip}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newUsed = [...used];
                    newUsed[level - 1] = usedCount > pip ? pip : pip + 1;
                    updateSlots.mutate(newUsed);
                  }}
                  title={spent ? `Restore slot ${level}` : `Use slot ${level}`}
                  disabled={updateSlots.isPending}
                  className="transition-all duration-100 rounded-full focus:outline-none hover:scale-110"
                  style={{
                    width: '9px', height: '9px',
                    background: spent ? '#374151' : '#fde68a',
                    border: `1px solid ${spent ? '#4b5563' : '#fbbf24'}`,
                    boxShadow: spent ? 'none' : '0 0 4px #fbbf2455',
                    cursor: 'pointer',
                  }}
                />
              );
            })}
          </div>
        </div>
      ))}
      <button
        onClick={(e) => { e.stopPropagation(); resetSlots.mutate(); }}
        title="Long rest â€” restore all slots"
        className="font-display text-[9px] uppercase tracking-widest text-smoke-500 hover:text-gold-500 transition-colors ml-1"
      >
        â†º Rest
      </button>
    </div>
  );
}

// â”€â”€â”€ CharacterShelf â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface CharacterShelfProps {
  character: Character;
  books: Spellbook[];
  onDeleteBook: (id: string) => void;
  onDuplicateBook: (id: string) => void;
  onAddBook: (characterId: string) => void;
  onEdit: (character: Character) => void;
  onDelete: (id: string) => void;
  onReorder: (items: { id: string; sort_order: number }[]) => void;
}

function StatChip({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="font-display text-[9px] uppercase tracking-widest text-smoke-500">{label}</span>
      <span className="font-display text-xs font-bold" style={{ color: accent }}>{value}</span>
    </div>
  );
}

function CharacterShelf({
  character, books, onDeleteBook, onDuplicateBook, onAddBook, onEdit, onDelete, onReorder,
}: CharacterShelfProps) {
  const [collapsed, setCollapsed] = useState(false);
  // Drag-and-drop state
  const [orderedBooks, setOrderedBooks] = useState<Spellbook[]>(() =>
    [...books].sort((a, b) => a.sort_order - b.sort_order)
  );
  // Keep orderedBooks in sync if books prop changes (e.g. after server re-fetch)
  const prevBooksRef = useRef(books);
  if (prevBooksRef.current !== books) {
    prevBooksRef.current = books;
    setOrderedBooks([...books].sort((a, b) => a.sort_order - b.sort_order));
  }
  const dragIdRef = useRef<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const handleDragStart = (id: string) => {
    dragIdRef.current = id;
  };
  const handleDragEnter = (index: number) => {
    setDragOverIndex(index);
  };
  const handleDrop = (targetIndex: number) => {
    const fromId = dragIdRef.current;
    if (!fromId) return;
    const fromIndex = orderedBooks.findIndex(b => b.id === fromId);
    if (fromIndex === -1 || fromIndex === targetIndex) {
      dragIdRef.current = null;
      setDragOverIndex(null);
      return;
    }
    const next = [...orderedBooks];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(targetIndex, 0, moved);
    setOrderedBooks(next);
    dragIdRef.current = null;
    setDragOverIndex(null);
    onReorder(next.map((b, i) => ({ id: b.id, sort_order: i })));
  };
  const handleDragEnd = () => {
    dragIdRef.current = null;
    setDragOverIndex(null);
  };

  const palette = getBookPalette(character.portrait_color);
  const saveDC = character.spell_save_dc;
  const atkBonus = character.spell_attack_bonus;
  const profBonus = character.proficiency_bonus;
  const maxPrepared = character.max_prepared_spells;
  const preparedCount = books.reduce((n, b) => n + (b.prepared_spell_count ?? 0), 0);
  const classBadge = character.character_class
    ? `${character.character_class.charAt(0).toUpperCase() + character.character_class.slice(1)} ${character.character_level}`
    : `Level ${character.character_level}`;

  return (
    <div className="rounded-xl" style={{ border: `1px solid ${palette.border}` }}>
      {/* Header row */}
      <div
        className="flex items-start gap-4 px-5 py-4 cursor-pointer select-none rounded-t-xl"
        style={{ background: `linear-gradient(90deg, ${palette.accent}12 0%, transparent 60%)` }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span
          className="shrink-0 font-display text-sm mt-0.5 transition-transform duration-200"
          style={{ color: palette.accent, transform: collapsed ? 'rotate(-90deg)' : 'none' }}
        >
          â–¾
        </span>

        {/* Portrait swatch */}
        <div
          className="shrink-0 w-8 h-10 rounded-sm mt-0.5"
          style={{ background: palette.grad, border: `1px solid ${palette.border}` }}
        />

        {/* Name + stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-base font-bold" style={{ color: palette.label }}>
              {character.name}
            </h2>
            <span
              className="font-display text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded"
              style={{ color: palette.accent, background: palette.accent + '18', border: `1px solid ${palette.border}` }}
            >
              {classBadge}
            </span>
            <Link
              to={`/characters/${character.id}/spells`}
              className="font-display text-[10px] uppercase tracking-widest px-2 py-0.5 rounded transition-opacity hover:opacity-70"
              style={{ color: palette.label, background: palette.accent + '22', border: `1px solid ${palette.border}` }}
              onClick={(e) => e.stopPropagation()}
            >
              All Spells â†’
            </Link>
          </div>

          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <StatChip label="Save DC" value={saveDC} accent={palette.accent} />
            <StatChip label="Atk Bonus" value={`+${atkBonus}`} accent={palette.accent} />
            <StatChip label="Prof" value={`+${profBonus}`} accent={palette.accent} />
            {maxPrepared !== null && (
              <StatChip
                label="Prepared"
                value={`${preparedCount} / ${maxPrepared}`}
                accent={preparedCount > maxPrepared ? '#f87171' : palette.accent}
              />
            )}
            <span className="font-display text-[9px] uppercase tracking-widest text-smoke-500">
              {character.spellbook_count} tome{character.spellbook_count !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Slot tracker */}
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <SpellSlotTracker character={character} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAddBook(character.id)}
            title="Add spellbook"
            className="font-display text-[11px] px-2 py-1 rounded transition-opacity hover:opacity-70"
            style={{ background: palette.accent + '22', color: palette.label, border: `1px solid ${palette.border}` }}
          >
            + Tome
          </button>
          <button
            onClick={() => onEdit(character)}
            title="Edit character"
            className="font-display text-[11px] px-2 py-1 rounded text-smoke-400 hover:text-parchment-200 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            âœŽ
          </button>
          <button
            onClick={() => {
              if (window.confirm(`Delete ${character.name}? Their spellbooks will become unassigned.`))
                onDelete(character.id);
            }}
            title="Delete character"
            className="font-display text-[11px] px-2 py-1 rounded transition-colors"
            style={{ background: 'rgba(220,38,38,0.06)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)' }}
          >
            âœ•
          </button>
        </div>
      </div>

      {/* Books on shelf */}
      {!collapsed && (
        <>
          {books.length === 0 ? (
            <div className="px-5 py-6 flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
              <span className="font-body text-sm text-smoke-500 italic">No tomes yet â€”</span>
              <button
                onClick={() => onAddBook(character.id)}
                className="font-display text-xs text-gold-500 hover:text-gold-300 transition-colors"
              >
                Bind a tome
              </button>
            </div>
          ) : (
            <div className="px-5 pt-6 pb-0" style={{ background: 'rgba(0,0,0,0.25)' }}>
              <div className="flex flex-wrap gap-2 items-end">
                {orderedBooks.map((sb, idx) => (
                  <div
                    key={sb.id}
                    draggable
                    onDragStart={() => handleDragStart(sb.id)}
                    onDragEnter={() => handleDragEnter(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      opacity: dragIdRef.current === sb.id ? 0.45 : 1,
                      outline: dragOverIndex === idx && dragIdRef.current !== sb.id
                        ? `2px solid ${palette.accent}88`
                        : 'none',
                      borderRadius: '4px',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <SpellbookCard
                      spellbook={sb}
                      colorIndex={idx}
                      onDelete={onDeleteBook}
                      onDuplicate={onDuplicateBook}
                    />
                  </div>
                ))}
                <button
                  onClick={() => onAddBook(character.id)}
                  className="flex-shrink-0 flex flex-col items-center justify-center rounded-sm transition-all duration-200 hover:-translate-y-3 hover:opacity-60 opacity-20"
                  style={{
                    width: '76px', height: '228px',
                    background: 'transparent',
                    border: `1.5px dashed ${palette.accent}55`,
                  }}
                  title="Bind new tome"
                >
                  <span className="font-display text-2xl" style={{ color: palette.accent }}>+</span>
                  <span className="font-display text-[9px] uppercase tracking-widest mt-2" style={{ color: palette.accent }}>New Tome</span>
                </button>
              </div>
            </div>
          )}
          <div
            className="mx-0 mt-0"
            style={{
              height: '18px',
              background: 'linear-gradient(180deg, #3d1f08 0%, #1e0e03 100%)',
              borderTop: `2px solid ${palette.accent}33`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            }}
          />
        </>
      )}
    </div>
  );
}

// â”€â”€â”€ UnassignedShelf â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function UnassignedShelf({
  books,
  onDeleteBook,
  onDuplicateBook,
  onAddBook,
}: {
  books: Spellbook[];
  onDeleteBook: (id: string) => void;
  onDuplicateBook: (id: string) => void;
  onAddBook: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  if (!books.length) return null;
  return (
    <div className="rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div
        className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none rounded-t-xl"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <span
          className="font-display text-sm transition-transform duration-200 text-smoke-500"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'none' }}
        >
          â–¾
        </span>
        <h2 className="font-display text-sm text-smoke-400 uppercase tracking-widest flex-1">
          Unassigned Tomes
        </h2>
        <span className="font-display text-xs text-smoke-600">
          {books.length} tome{books.length !== 1 ? 's' : ''}
        </span>
      </div>
      {!collapsed && (
        <>
          <div className="px-5 pt-6 pb-0" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="flex flex-wrap gap-2 items-end">
              {books.map((sb, idx) => (
                <SpellbookCard
                  key={sb.id}
                  spellbook={sb}
                  colorIndex={idx}
                  onDelete={onDeleteBook}
                  onDuplicate={onDuplicateBook}
                />
              ))}
              <button
                onClick={onAddBook}
                className="flex-shrink-0 flex flex-col items-center justify-center rounded-sm transition-all duration-200 hover:-translate-y-3 hover:opacity-60 opacity-20"
                style={{
                  width: '76px', height: '228px',
                  background: 'transparent',
                  border: '1.5px dashed rgba(253,186,116,0.3)',
                }}
                title="Bind new tome"
              >
                <span className="font-display text-2xl text-gold-700">+</span>
                <span className="font-display text-[9px] uppercase tracking-widest text-gold-800 mt-2">New Tome</span>
              </button>
            </div>
          </div>
          <div
            className="mx-0 mt-0 rounded-b-xl"
            style={{
              height: '18px',
              background: 'linear-gradient(180deg, #3d1f08 0%, #1e0e03 100%)',
              borderTop: '2px solid rgba(124,74,40,0.5)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            }}
          />
        </>
      )}
    </div>
  );
}

// â”€â”€â”€ SpellbooksPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function SpellbooksPage() {
  const [isCreateBookOpen,  setCreateBookOpen]  = useState(false);
  const [isCreateCharOpen,  setCreateCharOpen]  = useState(false);
  const [editingCharacter,  setEditingCharacter] = useState<Character | undefined>();
  const [addBookForChar,    setAddBookForChar]   = useState<string | undefined>();

  const { data: spellbooks, isLoading: sbLoading, error: sbError } = useSpellbooks();
  const { data: characters, isLoading: charLoading }               = useCharacters();

  const createSpellbook    = useCreateSpellbook();
  const deleteSpellbook    = useDeleteSpellbook();
  const duplicateSpellbook = useDuplicateSpellbook();
  const reorderSpellbooks  = useReorderSpellbooks();
  const createCharacter    = useCreateCharacter();
  const deleteCharacter    = useDeleteCharacter();

  // When editing an existing character, we need to call updateCharacter.
  // Because hooks can't be called conditionally, we hold a stable mutation
  // and invoke it based on whether editingCharacter is set.
  const updateCharacter = useUpdateCharacter(editingCharacter?.id ?? '');

  const openAddBookForChar = (characterId: string) => {
    setAddBookForChar(characterId);
    setCreateBookOpen(true);
  };

  const handleCreateBook = async (data: SpellbookCreate) => {
    await createSpellbook.mutateAsync({ ...data, character: addBookForChar ?? data.character ?? null });
  };

  const handleSaveCharacter = async (data: CharacterCreate) => {
    if (editingCharacter) {
      await updateCharacter.mutateAsync(data as CharacterUpdate);
    } else {
      await createCharacter.mutateAsync(data);
    }
  };

  const isLoading = sbLoading || charLoading;

  // Group spellbooks by character id
  const booksByCharacter = new Map<string, Spellbook[]>();
  const unassignedBooks: Spellbook[] = [];
  if (spellbooks) {
    for (const sb of spellbooks) {
      if (sb.character) {
        const list = booksByCharacter.get(sb.character) ?? [];
        list.push(sb);
        booksByCharacter.set(sb.character, list);
      } else {
        unassignedBooks.push(sb);
      }
    }
  }

  const totalTomes = spellbooks?.length ?? 0;
  const totalChars = characters?.length ?? 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Library header */}
      <div className="relative text-center pt-6 pb-2">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="w-80 h-32 rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #b45309 0%, transparent 70%)' }} />
        </div>
        <p className="font-display uppercase tracking-[0.3em] text-xs text-gold-600 mb-3">
          âœ¦ &nbsp; Arcane Repository &nbsp; âœ¦
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-wide text-gold-300 mb-2">
          My Library
        </h1>
        <p className="font-body text-parchment-500 text-sm italic">
          Characters, spellbooks, and arcane tomes
        </p>
      </div>

      {/* Action bar */}
      <div className="flex justify-between items-center px-1">
        <p className="font-display text-xs uppercase tracking-widest text-smoke-500">
          {!isLoading
            ? `${totalChars} character${totalChars !== 1 ? 's' : ''} Â· ${totalTomes} tome${totalTomes !== 1 ? 's' : ''}`
            : ''}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => { setEditingCharacter(undefined); setCreateCharOpen(true); }}
            className="btn-secondary font-display text-sm tracking-wide px-4 py-2"
          >
            + New Character
          </button>
          <button
            onClick={() => { setAddBookForChar(undefined); setCreateBookOpen(true); }}
            className="btn-gold font-display text-sm tracking-wide px-4 py-2"
          >
            + Bind New Tome
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {sbError && (
        <AlertMessage variant="error" title="Error Loading Library" message="Failed to load your data. Please try again." />
      )}

      {/* Shelves */}
      {!isLoading && !sbError && (
        <div
          className="space-y-4 rounded-xl p-4"
          style={{
            background: 'linear-gradient(180deg, #07040e 0%, #0d0a1a 60%, #100c18 100%)',
            border: '1px solid rgba(109,40,217,0.12)',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Empty state */}
          {totalChars === 0 && unassignedBooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-display text-4xl mb-5 opacity-20" aria-hidden="true">ðŸ“œ</p>
              <p className="font-display text-xl text-parchment-600 mb-1">Your library awaits</p>
              <p className="font-body text-sm text-smoke-500 italic mb-6">
                Create a character to start your arcane collection
              </p>
              <button
                onClick={() => { setEditingCharacter(undefined); setCreateCharOpen(true); }}
                className="btn-gold font-display text-sm px-5 py-2"
              >
                Create Your First Character
              </button>
            </div>
          )}

          {characters?.map(character => (
            <CharacterShelf
              key={character.id}
              character={character}
              books={booksByCharacter.get(character.id) ?? []}
              onDeleteBook={(id) => deleteSpellbook.mutate(id)}
              onDuplicateBook={(id) => duplicateSpellbook.mutate(id)}
              onAddBook={openAddBookForChar}
              onEdit={(c) => { setEditingCharacter(c); setCreateCharOpen(true); }}
              onDelete={(id) => deleteCharacter.mutate(id)}
              onReorder={(items) => reorderSpellbooks.mutate(items)}
            />
          ))}

          <UnassignedShelf
            books={unassignedBooks}
            onDeleteBook={(id) => deleteSpellbook.mutate(id)}
            onDuplicateBook={(id) => duplicateSpellbook.mutate(id)}
            onAddBook={() => { setAddBookForChar(undefined); setCreateBookOpen(true); }}
          />
        </div>
      )}

      {/* Modals */}
      <CreateSpellbookModal
        isOpen={isCreateBookOpen}
        onClose={() => { setCreateBookOpen(false); setAddBookForChar(undefined); }}
        onCreate={handleCreateBook}
        characters={characters ?? []}
        defaultCharacterId={addBookForChar}
      />

      <CreateCharacterModal
        isOpen={isCreateCharOpen}
        onClose={() => { setCreateCharOpen(false); setEditingCharacter(undefined); }}
        onSave={handleSaveCharacter}
        existing={editingCharacter}
      />
    </div>
  );
}

export default SpellbooksPage;
