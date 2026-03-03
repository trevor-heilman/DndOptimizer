/**
 * Spellbook Detail Page
 */
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSpellbook, useUpdateSpellbook, useRemoveSpellFromSpellbook, useUpdatePreparedSpell, useAddSpellToSpellbook } from '../hooks/useSpellbooks';
import { useSpells } from '../hooks/useSpells';
import { SpellCard } from '../components/SpellCard';

export function SpellbookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spellbook, isLoading, error } = useSpellbook(id!);
  const { data: allSpellsResponse } = useSpells({ page: 1, page_size: 1000 }); // Get all spells for adding
  const updateSpellbook = useUpdateSpellbook(id!);
  const removeSpell = useRemoveSpellFromSpellbook(id!);
  const updatePrepared = useUpdatePreparedSpell(id!);
  const addSpell = useAddSpellToSpellbook(id!);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');
  const [isAddSpellModalOpen, setIsAddSpellModalOpen] = useState(false);
  const [spellSearchQuery, setSpellSearchQuery] = useState('');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !spellbook) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Spellbook Not Found</h2>
        <p className="text-red-700 mb-4">The spellbook you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/spellbooks')}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Back to Spellbooks
        </button>
      </div>
    );
  }

  const handleSaveName = async () => {
    if (editedName.trim() && editedName !== spellbook.name) {
      await updateSpellbook.mutateAsync({ name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const handleSaveDescription = async () => {
    if (editedDescription !== spellbook.description) {
      await updateSpellbook.mutateAsync({ description: editedDescription.trim() || undefined });
    }
    setIsEditingDescription(false);
  };

  const handleRemoveSpell = async (spellId: string) => {
    if (window.confirm('Are you sure you want to remove this spell from the spellbook?')) {
      await removeSpell.mutateAsync(spellId);
    }
  };

  const handleTogglePrepared = async (spellId: string, isPrepared: boolean) => {
    await updatePrepared.mutateAsync({ spellId, isPrepared: !isPrepared });
  };

  const handleAddSpell = async (spellId: string) => {
    await addSpell.mutateAsync(spellId);
    setIsAddSpellModalOpen(false);
  };

  const preparedSpells = spellbook.prepared_spells || [];
  const availableSpellsToAdd = allSpellsResponse?.results?.filter(
    (spell) => !spellbook.spells?.some((s: { id: string }) => s.id === spell.id)
  ) || [];
  
  const filteredAvailableSpells = spellSearchQuery
    ? availableSpellsToAdd.filter((spell) =>
        spell.name.toLowerCase().includes(spellSearchQuery.toLowerCase())
      )
    : availableSpellsToAdd;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/spellbooks"
          className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block"
        >
          ← Back to Spellbooks
        </Link>
        
        {isEditingName ? (
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="text-4xl font-bold text-gray-900 border-b-2 border-primary-600 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveName();
                if (e.key === 'Escape') setIsEditingName(false);
              }}
            />
            <button
              onClick={handleSaveName}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditingName(false)}
              className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold text-gray-900">{spellbook.name}</h1>
            <button
              onClick={() => {
                setEditedName(spellbook.name);
                setIsEditingName(true);
              }}
              className="text-gray-500 hover:text-gray-700"
              title="Edit name"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        )}

        {isEditingDescription ? (
          <div className="mt-2">
            <textarea
              value={editedDescription}
              onChange={(e) => setEditedDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') setIsEditingDescription(false);
              }}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveDescription}
                className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingDescription(false)}
                className="px-3 py-1 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <p className="text-gray-600">{spellbook.description || 'No description'}</p>
            <button
              onClick={() => {
                setEditedDescription(spellbook.description || '');
                setIsEditingDescription(true);
              }}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              title="Edit description"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center gap-4 mt-4">
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{spellbook.spells?.length || 0}</span> spells total
          </span>
          {preparedSpells.length > 0 && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              {preparedSpells.length} prepared
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => setIsAddSpellModalOpen(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
        >
          + Add Spell
        </button>
      </div>

      {/* Spells List */}
      {!spellbook.spells || spellbook.spells.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Spells Yet</h2>
          <p className="text-gray-600 mb-4">Add spells to your spellbook to get started.</p>
          <button
            onClick={() => setIsAddSpellModalOpen(true)}
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
          >
            Add Your First Spell
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {spellbook.spells.map((spell: any) => {
            const isPrepared = preparedSpells.includes(spell.id);
            
            return (
              <div
                key={spell.id}
                className={`bg-white rounded-lg shadow-md p-4 border-2 ${
                  isPrepared ? 'border-green-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <SpellCard spell={spell} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleTogglePrepared(spell.id, isPrepared)}
                      className={`px-4 py-2 rounded-md font-medium text-sm ${
                        isPrepared
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {isPrepared ? '✓ Prepared' : 'Prepare'}
                    </button>
                    <button
                      onClick={() => handleRemoveSpell(spell.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Spell Modal */}
      {isAddSpellModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Add Spell to Spellbook</h2>
              <button
                onClick={() => setIsAddSpellModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <input
                type="text"
                value={spellSearchQuery}
                onChange={(e) => setSpellSearchQuery(e.target.value)}
                placeholder="Search spells..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {filteredAvailableSpells.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                {spellSearchQuery ? 'No matching spells found.' : 'All spells have been added to this spellbook.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAvailableSpells.slice(0, 20).map((spell) => (
                  <div key={spell.id} className="border border-gray-200 rounded-lg p-4">
                    <SpellCard spell={spell} />
                    <button
                      onClick={() => handleAddSpell(spell.id)}
                      className="mt-3 w-full px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
                    >
                      Add to Spellbook
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SpellbookDetailPage;
