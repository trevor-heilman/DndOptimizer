/**
 * Create Spellbook Modal Component
 */
import { useState } from 'react';
import type { SpellbookCreate } from '../types/api';
import { ModalShell, AlertMessage } from './ui';

const CLASS_CHOICES = [
  { value: 'artificer', label: 'Artificer' },
  { value: 'bard',      label: 'Bard' },
  { value: 'cleric',    label: 'Cleric' },
  { value: 'druid',     label: 'Druid' },
  { value: 'paladin',   label: 'Paladin' },
  { value: 'ranger',    label: 'Ranger' },
  { value: 'sorcerer',  label: 'Sorcerer' },
  { value: 'warlock',   label: 'Warlock' },
  { value: 'wizard',    label: 'Wizard' },
];

interface CreateSpellbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: SpellbookCreate) => Promise<void>;
}

export function CreateSpellbookModal({ isOpen, onClose, onCreate }: CreateSpellbookModalProps) {
  const [name,            setName]            = useState('');
  const [description,     setDescription]     = useState('');
  const [characterClass,  setCharacterClass]  = useState('');
  const [characterLevel,  setCharacterLevel]  = useState('');
  const [isSubmitting,    setIsSubmitting]     = useState(false);
  const [error,           setError]           = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }

    const lvl = parseInt(characterLevel, 10);
    if (characterLevel && (isNaN(lvl) || lvl < 1 || lvl > 20)) {
      setError('Character level must be between 1 and 20');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        character_class: characterClass || undefined,
        character_level: characterLevel ? lvl : undefined,
      });
      setName(''); setDescription(''); setCharacterClass(''); setCharacterLevel('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create spellbook');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setName(''); setDescription(''); setCharacterClass(''); setCharacterLevel('');
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

        {/* Class + Level on one row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sb-class" className="block text-sm font-display font-medium text-parchment-300 mb-2">
              Class
            </label>
            <select
              id="sb-class"
              value={characterClass}
              onChange={(e) => setCharacterClass(e.target.value)}
              className="dnd-input font-body"
              disabled={isSubmitting}
            >
              <option value="">— None —</option>
              {CLASS_CHOICES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sb-level" className="block text-sm font-display font-medium text-parchment-300 mb-2">
              Level <span className="text-smoke-500 font-body font-normal">(1–20)</span>
            </label>
            <input
              type="number"
              id="sb-level"
              value={characterLevel}
              onChange={(e) => setCharacterLevel(e.target.value)}
              className="dnd-input font-body"
              placeholder="—"
              min={1}
              max={20}
              disabled={isSubmitting}
            />
          </div>
        </div>

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
