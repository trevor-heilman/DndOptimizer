/**
 * Spellbooks Page
 */
import { useState } from 'react';
import { useSpellbooks, useCreateSpellbook, useDeleteSpellbook, useDuplicateSpellbook } from '../hooks/useSpellbooks';
import { SpellbookCard } from '../components/SpellbookCard';
import { CreateSpellbookModal } from '../components/CreateSpellbookModal';

export function SpellbooksPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { data: spellbooks, isLoading, error } = useSpellbooks();
  const createSpellbook = useCreateSpellbook();
  const deleteSpellbook = useDeleteSpellbook();
  const duplicateSpellbook = useDuplicateSpellbook();

  const handleCreate = async (data: { name: string; description?: string }) => {
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
        <h1 className="text-3xl font-bold text-gray-900">My Spellbooks</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
        >
          + Create Spellbook
        </button>
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Spellbooks</h2>
          <p className="text-red-700">Failed to load your spellbooks. Please try again.</p>
        </div>
      )}

      {!isLoading && !error && spellbooks && spellbooks.length === 0 && (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Spellbooks Yet</h2>
          <p className="text-gray-600 mb-4">
            Create your first spellbook to start organizing your spells.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
          >
            Create Your First Spellbook
          </button>
        </div>
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
