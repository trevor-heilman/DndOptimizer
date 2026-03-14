/**
 * Spells List Page
 */
import { useSearchParams } from 'react-router-dom';
import { useSpells, useSpellSources } from '../hooks/useSpells';
import { SpellCard, SpellCardGrid } from '../components/SpellCard';
import { ImportSpellsModal } from '../components/ImportSpellsModal';
import { CreateSpellModal } from '../components/CreateSpellModal';
import { ClearSpellsModal } from '../components/ClearSpellsModal';
import { LoadingSpinner, AlertMessage, EmptyState } from '../components/ui';
import { MultiSelect } from '../components/MultiSelect';
import { SPELL_SCHOOLS, DND_CLASSES, DAMAGE_TYPES, SPELL_TAGS } from '../constants/spellColors';
import { useState } from 'react';

const PAGE_SIZE = 56;

export function SpellsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showClear, setShowClear] = useState(false);

  // Read filter state from URL so it persists across navigation
  // Multi-value filters use getAll() → string[]
  const levels = searchParams.getAll('level').map(Number).filter((n) => !isNaN(n));
  const schools = searchParams.getAll('school');
  const sources = searchParams.getAll('source');
  const class_names = searchParams.getAll('class_name');
  const damage_types = searchParams.getAll('damage_type');
  const tags = searchParams.getAll('tag');
  const search = searchParams.get('search') || '';
  const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
  const concentration = searchParams.get('concentration') === 'true' ? true : undefined;
  const is_attack_roll = searchParams.get('is_attack_roll') === 'true' ? true : undefined;
  const is_saving_throw = searchParams.get('is_saving_throw') === 'true' ? true : undefined;
  const has_v = searchParams.get('has_v') === 'true' ? true : undefined;
  const has_s = searchParams.get('has_s') === 'true' ? true : undefined;
  const has_m = searchParams.get('has_m') === 'true' ? true : undefined;

  function updateParams(updates: Record<string, string | string[] | undefined>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [key, value] of Object.entries(updates)) {
        next.delete(key);
        if (Array.isArray(value)) {
          value.forEach((v) => next.append(key, v));
        } else if (value !== undefined && value !== '') {
          next.set(key, value);
        }
      }
      return next;
    });
  }

  function setPage(n: number) {
    updateParams({ page: n === 1 ? undefined : String(n) });
  }

  function clearFilters() {
    setSearchParams({});
  }

  const { data: sourcesData } = useSpellSources();

  const { data, isLoading, error } = useSpells({
    level: levels.length > 0 ? levels : undefined,
    school: schools.length > 0 ? schools : undefined,
    source: sources.length > 0 ? sources : undefined,
    class_name: class_names.length > 0 ? class_names : undefined,
    damage_type: damage_types.length > 0 ? damage_types : undefined,
    tag: tags.length > 0 ? tags : undefined,
    search: search || undefined,
    page,
    page_size: PAGE_SIZE,
    concentration,
    is_attack_roll,
    is_saving_throw,
    has_v,
    has_s,
    has_m,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on new search
  };

  return (
    <div>
      {/* Page Header */}
      <div className="relative mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="font-display uppercase tracking-[0.3em] text-[10px] text-arcane-700 mb-1.5">
              ✦ &nbsp; Arcane Compendium &nbsp; ✦
            </p>
            <h1 className="font-display text-3xl font-extrabold tracking-wide text-gold-300">
              Spell Library
            </h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setShowImport(true)} className="btn-secondary text-sm">
              Import JSON
            </button>
            <button
              onClick={() => setShowClear(true)}
              className="text-sm px-3 py-1.5 rounded-md border border-crimson-800 text-crimson-400
                         hover:bg-crimson-950 hover:border-crimson-700 transition-colors font-display"
            >
              Delete
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
              + Create Spell
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-3 select-none" aria-hidden="true">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(109,40,217,0.4))' }} />
          <span className="text-arcane-800 text-xs">✦</span>
          <div className="h-px w-12" style={{ background: 'rgba(109,40,217,0.2)' }} />
        </div>
      </div>

      {/* Sidebar + Grid layout */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">

        {/* Filter Sidebar */}
        <aside className="lg:w-64 xl:w-72 shrink-0">
          <div className="rounded-xl p-4 lg:sticky lg:top-6"
            style={{ background: 'linear-gradient(160deg, #0d0720 0%, #0f0a1e 100%)', border: '1px solid rgba(109,40,217,0.2)', borderLeft: '3px solid rgba(109,40,217,0.55)' }}>
            <p className="font-display uppercase tracking-[0.25em] text-[10px] text-arcane-800 mb-3">✦ Filter Grimoire</p>
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div>
                <label htmlFor="search" className="block text-xs font-display font-medium text-parchment-300 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  id="search"
                  value={search}
                  onChange={(e) => {
                    updateParams({ search: e.target.value || undefined, page: undefined });
                  }}
                  className="dnd-input font-body text-sm py-1.5"
                  placeholder="Spell name…"
                />
              </div>

              <div>
                <label className="block text-xs font-display font-medium text-parchment-300 mb-1">
                  Level
                </label>
                <MultiSelect
                  id="level"
                  placeholder="All Levels"
                  options={[
                    { value: '0', label: 'Cantrip' },
                    ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => ({ value: String(l), label: `Level ${l}` })),
                  ]}
                  value={levels.map(String)}
                  onChange={(vals) => updateParams({ level: vals.length > 0 ? vals : undefined, page: undefined })}
                />
              </div>

              <div>
                <label className="block text-xs font-display font-medium text-parchment-300 mb-1">
                  School
                </label>
                <MultiSelect
                  id="school"
                  placeholder="All Schools"
                  options={SPELL_SCHOOLS.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
                  value={schools}
                  onChange={(vals) => updateParams({ school: vals.length > 0 ? vals : undefined, page: undefined })}
                />
              </div>

              <div>
                <label className="block text-xs font-display font-medium text-parchment-300 mb-1">
                  Class
                </label>
                <MultiSelect
                  id="class_name"
                  placeholder="All Classes"
                  options={DND_CLASSES.map((c) => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
                  value={class_names}
                  onChange={(vals) => updateParams({ class_name: vals.length > 0 ? vals : undefined, page: undefined })}
                />
              </div>

              <div>
                <label className="block text-xs font-display font-medium text-parchment-300 mb-1">
                  Damage Type
                </label>
                <MultiSelect
                  id="damage_type"
                  placeholder="All Types"
                  options={DAMAGE_TYPES.map((d) => ({ value: d, label: d.charAt(0).toUpperCase() + d.slice(1) }))}
                  value={damage_types}
                  onChange={(vals) => updateParams({ damage_type: vals.length > 0 ? vals : undefined, page: undefined })}
                />
              </div>

              <div>
                <label className="block text-xs font-display font-medium text-parchment-300 mb-1">
                  Tag
                </label>
                <MultiSelect
                  id="tag"
                  placeholder="All Tags"
                  options={SPELL_TAGS.map((t) => ({ value: t, label: t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }))}
                  value={tags}
                  onChange={(vals) => updateParams({ tag: vals.length > 0 ? vals : undefined, page: undefined })}
                />
              </div>

              <div>
                <label className="block text-xs font-display font-medium text-parchment-300 mb-1">
                  Source
                </label>
                <MultiSelect
                  id="source"
                  placeholder="All Sources"
                  options={(sourcesData ?? []).map((s) => ({ value: s, label: s }))}
                  value={sources}
                  onChange={(vals) => updateParams({ source: vals.length > 0 ? vals : undefined, page: undefined })}
                />
              </div>

              {/* Boolean filters */}
              <div>
                <p className="text-xs font-display font-medium text-parchment-300 mb-1.5">Properties</p>
                <div className="space-y-1.5">
                  {([
                    { key: 'concentration', label: 'Concentration', value: concentration },
                    { key: 'is_attack_roll', label: 'Attack Roll', value: is_attack_roll },
                    { key: 'is_saving_throw', label: 'Saving Throw', value: is_saving_throw },
                  ] as const).map(({ key, label, value }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(e) => {
                          updateParams({ [key]: e.target.checked ? 'true' : undefined, page: undefined });
                        }}
                        className="w-3.5 h-3.5 rounded border-smoke-600 bg-stone-950 accent-gold-500 cursor-pointer"
                      />
                      <span className="font-body text-sm text-parchment-300 group-hover:text-parchment-100 transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Component filters */}
              <div>
                <p className="text-xs font-display font-medium text-parchment-300 mb-1.5">Components</p>
                <div className="flex gap-4">
                  {([
                    { key: 'has_v', label: 'V', value: has_v },
                    { key: 'has_s', label: 'S', value: has_s },
                    { key: 'has_m', label: 'M', value: has_m },
                  ] as const).map(({ key, label, value }) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={value === true}
                        onChange={(e) => {
                          updateParams({ [key]: e.target.checked ? 'true' : undefined, page: undefined });
                        }}
                        className="w-3.5 h-3.5 rounded border-smoke-600 bg-stone-950 accent-gold-500 cursor-pointer"
                      />
                      <span className="font-body text-sm text-parchment-300 group-hover:text-parchment-100 transition-colors">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-gold text-xs flex-1 py-1.5">
                  Apply
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="btn-secondary text-xs flex-1 py-1.5"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">

          {/* Loading State */}
          {isLoading && <LoadingSpinner />}

          {/* Error State */}
          {error && <AlertMessage variant="error" message="Error loading spells. Please try again." />}

          {/* Spells Grid */}
          {data && (
            <>
              <div className="mb-3 font-body text-sm text-smoke-400">
                Showing {data.results.length} of {data.count} spells
              </div>

              <SpellCardGrid className="mb-6">
                {data.results.map((spell) => (
                  <SpellCard key={spell.id} spell={spell} />
                ))}
              </SpellCardGrid>

              {/* Pagination */}
              {data.count > PAGE_SIZE && (() => {
                const totalPages = Math.ceil(data.count / PAGE_SIZE);
            const pageButtons = Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1);
            const showLastPage = totalPages > 10;
            return (
              <div className="flex justify-center items-center gap-1.5 flex-wrap mt-4">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ←
                </button>

                {pageButtons.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className="font-display text-sm w-9 h-9 rounded transition-colors"
                    style={
                      page === n
                        ? { background: '#451a03', color: '#fbbf24', border: '1px solid #b45309', fontWeight: 700 }
                        : undefined
                    }
                  >
                    <span className={page === n ? '' : 'btn-secondary block w-full h-full rounded leading-9'}>
                      {n}
                    </span>
                  </button>
                ))}

                {showLastPage && (
                  <>
                    <span className="font-display text-smoke-500 px-1 select-none">…</span>
                    <button
                      onClick={() => setPage(totalPages)}
                      className="font-display text-sm w-9 h-9 rounded transition-colors"
                      style={
                        page === totalPages
                          ? { background: '#451a03', color: '#fbbf24', border: '1px solid #b45309', fontWeight: 700 }
                          : undefined
                      }
                    >
                      <span className={page === totalPages ? '' : 'btn-secondary block w-full h-full rounded leading-9'}>
                        {totalPages}
                      </span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="btn-secondary text-sm px-3 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            );
          })()}

          {/* Empty State */}
          {data.results.length === 0 && (
            <EmptyState
              icon="🔮"
              title="No Spells Found"
              description="No spells match your current filters."
              action={{ label: 'Clear Filters', onClick: clearFilters }}
            />
          )}
        </>
      )}

        </div>{/* end main content */}
      </div>{/* end sidebar+grid flex row */}

      {/* Modals */}
      <ImportSpellsModal isOpen={showImport} onClose={() => setShowImport(false)} />
      <CreateSpellModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <ClearSpellsModal isOpen={showClear} onClose={() => setShowClear(false)} />
    </div>
  );
}

export default SpellsPage;
