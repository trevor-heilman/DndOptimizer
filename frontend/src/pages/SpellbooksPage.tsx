/**
 * Spellbooks Page
 */
import { useState } from 'react';
import { useSpellbooks, useCreateSpellbook, useDeleteSpellbook, useDuplicateSpellbook } from '../hooks/useSpellbooks';
import { SpellbookCard } from '../components/SpellbookCard';
import { CreateSpellbookModal } from '../components/CreateSpellbookModal';
import { LoadingSpinner, AlertMessage, EmptyState } from '../components/ui';
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-3xl font-bold text-gold-300 flex items-center gap-2">
          <span aria-hidden="true">📚</span> My Spellbooks
        </h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-primary"
        >
          + New Spellbook
        </button>
      </div>

      {isLoading && <LoadingSpinner />}

      {error && (
        <AlertMessage
          variant="error"
          title="Error Loading Spellbooks"
          message="Failed to load your spellbooks. Please try again."
        />
      )}

      {!isLoading && !error && spellbooks && spellbooks.length === 0 && (
        <EmptyState
          icon="📭"
          title="No Spellbooks Yet"
          description="Create your first spellbook to start organizing your spells."
          action={{ label: 'Create Your First Spellbook', onClick: () => setIsCreateModalOpen(true) }}
        />
      )}

      {!isLoading && !error && spellbooks && spellbooks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {spellbooks.map((spellbook) => (
            <SpellbookCard
              key={spellbook.id}
              spellbook={spellbook}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
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
