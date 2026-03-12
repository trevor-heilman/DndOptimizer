/**
 * Spellbooks Page — Arcane Library
 */
import { useState } from 'react';
import { useSpellbooks, useCreateSpellbook, useDeleteSpellbook, useDuplicateSpellbook } from '../hooks/useSpellbooks';
import { SpellbookCard } from '../components/SpellbookCard';
import { CreateSpellbookModal } from '../components/CreateSpellbookModal';
import { LoadingSpinner, AlertMessage } from '../components/ui';
import type { SpellbookCreate } from '../types/api';

export function SpellbooksPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: spellbooks, isLoading, error } = useSpellbooks();
  const createSpellbook = useCreateSpellbook();
  const deleteSpellbook = useDeleteSpellbook();
  const duplicateSpellbook = useDuplicateSpellbook();

  const handleCreate = async (data: SpellbookCreate) => {
    await createSpellbook.mutateAsync(data);
  };

  const handleDelete = async (id: string) => {
    await deleteSpellbook.mutateAsync(id);
  };

  const handleDuplicate = async (id: string) => {
    await duplicateSpellbook.mutateAsync(id);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">

      {/* ── Library header ────────────────────────────────────────── */}
      <div className="relative text-center pt-6 pb-2">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div className="w-80 h-32 rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #b45309 0%, transparent 70%)' }} />
        </div>
        <p className="font-display uppercase tracking-[0.3em] text-xs text-gold-600 mb-3">
          ✦ &nbsp; Arcane Repository &nbsp; ✦
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-wide text-gold-300 mb-2">
          My Spellbooks
        </h1>
        <p className="font-body text-parchment-500 text-sm italic">
          Your personal collection of bound arcane tomes
        </p>
      </div>

      {/* ── Action bar ───────────────────────────────────────────── */}
      <div className="flex justify-between items-center px-1">
        <p className="font-display text-xs uppercase tracking-widest text-smoke-500">
          {!isLoading && spellbooks
            ? `${spellbooks.length} tome${spellbooks.length !== 1 ? 's' : ''} bound`
            : ''}
        </p>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-gold font-display text-sm tracking-wide px-5 py-2"
        >
          + Bind New Tome
        </button>
      </div>

      {/* ── Loading ──────────────────────────────────────────────── */}
      {isLoading && <LoadingSpinner />}

      {/* ── Error ────────────────────────────────────────────────── */}
      {error && (
        <AlertMessage
          variant="error"
          title="Error Loading Spellbooks"
          message="Failed to load your spellbooks. Please try again."
        />
      )}

      {/* ── Library shelf ────────────────────────────────────────── */}
      {!isLoading && !error && (
        <div
          className="relative rounded-xl"
          style={{
            background: 'linear-gradient(180deg, #07040e 0%, #0d0a1a 60%, #100c18 100%)',
            border: '1px solid rgba(109,40,217,0.15)',
            boxShadow: 'inset 0 0 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Ambient ceiling glow */}
          <div
            className="absolute top-0 left-0 right-0 h-28 rounded-t-xl pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(180,83,9,0.07) 0%, transparent 65%)' }}
            aria-hidden="true"
          />
          {/* Hanging lantern filament */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none" aria-hidden="true">
            <div className="w-px h-6" style={{ background: 'rgba(253,186,116,0.18)' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'radial-gradient(circle, rgba(253,230,138,0.5) 0%, transparent 70%)' }} />
          </div>

          {/* ── Empty shelf ── */}
          {(!spellbooks || spellbooks.length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <p className="font-display text-4xl mb-5 opacity-20" aria-hidden="true">📜</p>
              <p className="font-display text-xl text-parchment-600 mb-1">Your shelves await</p>
              <p className="font-body text-sm text-smoke-500 italic mb-6">
                Bind your first tome to begin your arcane library
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-gold font-display text-sm px-5 py-2"
              >
                Bind Your First Tome
              </button>
            </div>
          )}

          {/* ── Books on the shelf ── */}
          {spellbooks && spellbooks.length > 0 && (
            <div className="px-5 pt-8 pb-0">
              <div className="flex flex-wrap gap-2 items-end">
                {spellbooks.map((spellbook, idx) => (
                  <SpellbookCard
                    key={spellbook.id}
                    spellbook={spellbook}
                    colorIndex={idx}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                  />
                ))}

                {/* Add-new tome slot */}
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="flex-shrink-0 flex flex-col items-center justify-center rounded-sm transition-all duration-200 hover:-translate-y-3 hover:opacity-70 opacity-25"
                  style={{
                    width: '76px',
                    height: '228px',
                    background: 'transparent',
                    border: '1.5px dashed rgba(253,186,116,0.4)',
                  }}
                  title="Bind new tome"
                >
                  <span className="font-display text-2xl text-gold-600">+</span>
                  <span className="font-display text-[9px] uppercase tracking-widest text-gold-700 mt-2">New Tome</span>
                </button>
              </div>
            </div>
          )}

          {/* Shelf plank */}
          <div
            className="mx-0 mt-0 rounded-b-xl"
            style={{
              height: '22px',
              background: 'linear-gradient(180deg, #3d1f08 0%, #1e0e03 100%)',
              borderTop: '2px solid #7c4a28',
              boxShadow: '0 6px 18px rgba(0,0,0,0.7)',
            }}
          />
        </div>
      )}

      <CreateSpellbookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}

export default SpellbooksPage;
