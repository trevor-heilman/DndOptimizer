/**
 * Spellbook Card Component
 */
import { Link } from 'react-router-dom';
import type { Spellbook } from '../types/api';

interface SpellbookCardProps {
  spellbook: Spellbook;
  onDelete?: (id: string) => void;
  onDuplicate?: (id: string) => void;
}

export function SpellbookCard({ spellbook, onDelete, onDuplicate }: SpellbookCardProps) {
  const preparedCount = spellbook.prepared_spells?.length || 0;
  const totalSpells = spellbook.spells?.length || 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <Link to={`/spellbooks/${spellbook.id}`} className="block mb-3">
        <h3 className="text-xl font-semibold text-gray-900 hover:text-primary-600 transition-colors">
          {spellbook.name}
        </h3>
      </Link>
      
      {spellbook.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{spellbook.description}</p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-4">
          <span>
            <span className="font-semibold text-gray-900">{totalSpells}</span> spells
          </span>
          {preparedCount > 0 && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
              {preparedCount} prepared
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          to={`/spellbooks/${spellbook.id}`}
          className="flex-1 text-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          View Details
        </Link>
        {onDuplicate && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onDuplicate(spellbook.id);
            }}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
            title="Duplicate Spellbook"
          >
            Copy
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              if (window.confirm(`Are you sure you want to delete "${spellbook.name}"?`)) {
                onDelete(spellbook.id);
              }
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            title="Delete Spellbook"
          >
            Delete
          </button>
        )}
      </div>

      {spellbook.updated_at && (
        <div className="mt-3 text-xs text-gray-500">
          Updated {new Date(spellbook.updated_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default SpellbookCard;
