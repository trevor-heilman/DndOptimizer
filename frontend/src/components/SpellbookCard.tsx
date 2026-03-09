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
  const preparedCount = spellbook.prepared_spell_count ?? spellbook.prepared_spells?.length ?? 0;
  const totalSpells = spellbook.spell_count ?? 0;

  return (
    <div className="dnd-card border-t-2 border-gold-800 p-6 hover:shadow-xl hover:shadow-black/30
                    hover:-translate-y-0.5 transition-all duration-200">
      <Link to={`/spellbooks/${spellbook.id}`} className="block mb-3">
        <h3 className="font-display text-xl font-semibold text-gold-300 hover:text-gold-200 transition-colors flex items-center gap-2">
          <span aria-hidden="true">📚</span>
          {spellbook.name}
        </h3>
      </Link>

      {spellbook.description && (
        <p className="font-body text-parchment-400 text-sm mb-4 line-clamp-2 leading-relaxed italic">
          {spellbook.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-sm mb-4">
        <span className="font-body text-parchment-300">
          <span className="font-display font-semibold text-parchment-100">{totalSpells}</span> spells
        </span>
        {preparedCount > 0 && (
          <span className="font-display text-xs px-2 py-0.5 rounded"
                style={{ background: '#14200a', color: '#86efac', border: '1px solid #166534' }}>
            {preparedCount} prepared
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Link
          to={`/spellbooks/${spellbook.id}`}
          className="btn-gold flex-1 text-center text-sm py-1.5 px-3"
        >
          View Details
        </Link>
        {onDuplicate && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onDuplicate(spellbook.id);
            }}
            className="btn-secondary text-sm py-1.5 px-3"
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
            className="btn-primary text-sm py-1.5 px-3"
            title="Delete Spellbook"
          >
            Delete
          </button>
        )}
      </div>

      {spellbook.updated_at && (
        <div className="mt-3 font-body text-xs text-smoke-500 italic">
          Updated {new Date(spellbook.updated_at).toLocaleDateString()}
        </div>
      )}
    </div>
  );
}

export default SpellbookCard;
