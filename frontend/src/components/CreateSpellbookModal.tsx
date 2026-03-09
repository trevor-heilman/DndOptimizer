/**
 * Create Spellbook Modal Component
 */
import { useState } from 'react';
import type { SpellbookCreate } from '../types/api';
import { ModalShell, AlertMessage } from './ui';

interface CreateSpellbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: SpellbookCreate) => Promise<void>;
}

export function CreateSpellbookModal({ isOpen, onClose, onCreate }: CreateSpellbookModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onCreate({ name: name.trim(), description: description.trim() || undefined });
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create spellbook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName('');
      setDescription('');
      setError('');
      onClose();
    }
  };

  return (
    <ModalShell title="New Spellbook" onClose={handleClose} disabled={isSubmitting}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-display font-medium text-parchment-300 mb-2">
            Name *
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="dnd-input font-body"
            placeholder="My Wizard's Spellbook"
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-display font-medium text-parchment-300 mb-2">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="dnd-input font-body resize-none"
            placeholder="A collection of powerful spells for my character"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        {error && <AlertMessage variant="error" message={error} />}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-gold flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Inscribing...' : 'Create'}
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
