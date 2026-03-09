/**
 * Spells List Page
 */
import { useState } from 'react';
import { useSpells } from '../hooks/useSpells';
import { SpellCard } from '../components/SpellCard';
import { ImportSpellsModal } from '../components/ImportSpellsModal';
import { CreateSpellModal } from '../components/CreateSpellModal';
import { ClearSpellsModal } from '../components/ClearSpellsModal';
import { LoadingSpinner, AlertMessage, EmptyState } from '../components/ui';

const SCHOOLS = [
  'abjuration',
  'conjuration',
  'divination',
  'enchantment',
  'evocation',
  'illusion',
  'necromancy',
  'transmutation',
];

export function SpellsPage() {
  const [level, setLevel] = useState<number | undefined>(undefined);
  const [school, setSchool] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showClear, setShowClear] = useState(false);

  const { data, isLoading, error } = useSpells({
    level,
    school,
    search: search || undefined,
    page,
    page_size: 20,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on new search
  };

  return (
    <div>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-gold-300 flex items-center gap-2">
          <span aria-hidden="true">📖</span> Spell Library
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="btn-secondary text-sm"
          >
            Import JSON
          </button>
          <button
            onClick={() => setShowClear(true)}
            className="text-sm px-3 py-1.5 rounded-md border border-crimson-800 text-crimson-400
                       hover:bg-crimson-950 hover:border-crimson-700 transition-colors font-display"
          >
            Delete
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm"
          >
            + Create Spell
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="dnd-card p-5 mb-6 border-l-4 border-arcane-700">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div>
            <label htmlFor="search" className="block text-sm font-display font-medium text-parchment-300 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dnd-input font-body"
              placeholder="Search by spell name…"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="level" className="block text-sm font-display font-medium text-parchment-300 mb-1">
                Level
              </label>
              <select
                id="level"
                value={level ?? ''}
                onChange={(e) => {
                  setLevel(e.target.value ? Number(e.target.value) : undefined);
                  setPage(1);
                }}
                className="dnd-input font-body"
              >
                <option value="">All Levels</option>
                <option value="0">Cantrip</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                  <option key={l} value={l}>
                    Level {l}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="school" className="block text-sm font-display font-medium text-parchment-300 mb-1">
                School
              </label>
              <select
                id="school"
                value={school ?? ''}
                onChange={(e) => {
                  setSchool(e.target.value || undefined);
                  setPage(1);
                }}
                className="dnd-input font-body"
              >
                <option value="">All Schools</option>
                {SCHOOLS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="btn-gold text-sm">
              Apply Filters
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setLevel(undefined);
                setSchool(undefined);
                setPage(1);
              }}
              className="btn-secondary text-sm"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && <LoadingSpinner />}

      {/* Error State */}
      {error && <AlertMessage variant="error" message="Error loading spells. Please try again." />}

      {/* Spells Grid */}
      {data && (
        <>
          <div className="mb-4 font-body text-sm text-smoke-400">
            Showing {data.results.length} of {data.count} spells
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {data.results.map((spell) => (
              <SpellCard key={spell.id} spell={spell} />
            ))}
          </div>

          {/* Pagination */}
          {data.count > 20 && (
            <div className="flex justify-center items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!data.previous}
                className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <span className="font-display text-sm text-parchment-300 px-3 py-1.5
                               bg-smoke-800 border border-smoke-600 rounded">
                Page {page}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.next}
                className="btn-secondary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}

          {/* Empty State */}
          {data.results.length === 0 && (
            <EmptyState
              icon="🔮"
              title="No Spells Found"
              description="No spells match your current filters."
              action={{ label: 'Clear Filters', onClick: () => { setSearch(''); setLevel(undefined); setSchool(undefined); setPage(1); } }}
            />
          )}
        </>
      )}

      {/* Modals */}
      <ImportSpellsModal isOpen={showImport} onClose={() => setShowImport(false)} />
      <CreateSpellModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <ClearSpellsModal isOpen={showClear} onClose={() => setShowClear(false)} />
    </div>
  );
}

export default SpellsPage;
