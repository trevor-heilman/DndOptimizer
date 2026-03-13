/**
 * Create Spellbook Modal Component
 */
import { useState } from 'react';
import type { SpellbookCreate, Character, BookColor } from '../types/api';
import { ModalShell, AlertMessage } from './ui';
import { BookColorPicker } from './BookColorPicker';

interface CreateSpellbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: SpellbookCreate) => Promise<void>;
  /** Available characters to assign the new spellbook to. */
  characters?: Character[];
  /** Pre-select a character when opening from a character shelf. */
  defaultCharacterId?: string;
}

export function CreateSpellbookModal({
  isOpen, onClose, onCreate, characters = [], defaultCharacterId,
}: CreateSpellbookModalProps) {
  const [name,           setName]           = useState('');
  const [description,    setDescription]    = useState('');
  const [characterId,    setCharacterId]    = useState(defaultCharacterId ?? '');
  const [bookColor,      setBookColor]      = useState<BookColor>('violet');
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [error,          setError]          = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }

    setIsSubmitting(true);
    setError('');
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        character: characterId || undefined,
        book_color: bookColor,
      });
      setName(''); setDescription(''); setCharacterId(defaultCharacterId ?? ''); setBookColor('violet');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create spellbook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName(''); setDescription(''); setCharacterId(defaultCharacterId ?? ''); setBookColor('violet');
      setError('');
      onClose();
    }
  };

  return (
    <ModalShell title="New Spellbook" onClose={handleClose} disabled={isSubmitting}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sb-name" className="block text-sm font-display font-medium text-parchment-300 mb-2">
            Name *
          </label>
          <input
            type="text"
            id="sb-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="dnd-input font-body"
            placeholder="My Wizard's Spellbook"
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Assign to character */}
        {characters.length > 0 && (
          <div>
            <label htmlFor="sb-character" className="block text-sm font-display font-medium text-parchment-300 mb-2">
              Character
            </label>
            <select
              id="sb-character"
              value={characterId}
              onChange={(e) => setCharacterId(e.target.value)}
              className="dnd-input font-body"
              disabled={isSubmitting}
            >
              <option value="">â€” Unassigned â€”</option>
              {characters.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.character_class ? ` (${c.character_class})` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="sb-description" className="block text-sm font-display font-medium text-parchment-300 mb-2">
            Description
          </label>
          <textarea
            id="sb-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="dnd-input font-body resize-none"
            placeholder="A collection of powerful spells for my character"
            rows={2}
            disabled={isSubmitting}
          />
        </div>

        {/* Book color */}
        <div>
          <label className="block text-sm font-display font-medium text-parchment-300 mb-2">
            Book Color
          </label>
          <BookColorPicker value={bookColor} onChange={setBookColor} disabled={isSubmitting} />
        </div>

        {error && <AlertMessage variant="error" message={error} />}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Inscribingâ€¦' : 'Create'}
          </button>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export default CreateSpellbookModal;
