/**
 * Clear Spells Modal - bulk delete spells by category.
 */
import { useState } from 'react';
import { useBulkDeleteSpells, useSpellCounts } from '../hooks/useSpells';
import { useAuth } from '../contexts/AuthContext';
import { AlertMessage } from './ui';

interface ClearSpellsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: { id: 'system' | 'imported' | 'custom'; label: string; description: string; adminOnly: boolean }[] = [
  {
    id: 'system',
    label: 'System Spells',
    description: 'All spells imported via the seed command (affects all users)',
    adminOnly: true,
  },
  {
    id: 'imported',
    label: 'My Imported Spells',
    description: 'Spells you imported via JSON upload',
    adminOnly: false,
  },
  {
    id: 'custom',
    label: 'My Custom Spells',
    description: 'Spells you created manually',
    adminOnly: false,
  },
];

export function ClearSpellsModal({ isOpen, onClose }: ClearSpellsModalProps) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirm, setConfirm] = useState('');
  const [result, setResult] = useState<{ deleted: number } | null>(null);
  const { mutateAsync, isPending, error } = useBulkDeleteSpells();
  const { data: counts } = useSpellCounts();

  if (!isOpen) return null;

  const isStaff = user?.is_staff ?? false;
  const confirmReady = confirm === 'DELETE';
  const canSubmit = selected.size > 0 && confirmReady && !isPending;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setConfirm('');
    setResult(null);
  };

  const handleSubmit = async () => {
    try {
      const res = await mutateAsync(Array.from(selected));
      setResult(res);
      setSelected(new Set());
      setConfirm('');
    } catch {
      // error displayed via `error` from useMutation
    }
  };

  const handleClose = () => {
    if (isPending) return;
    setSelected(new Set());
    setConfirm('');
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="dnd-card border-t-2 border-crimson-800 max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display text-2xl font-bold text-crimson-300">⚠ Purge Spells</h2>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="text-parchment-500 hover:text-parchment-200 disabled:opacity-50 text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="font-body text-sm text-parchment-400 mb-5">
          Select categories to permanently delete. This cannot be undone.
        </p>

        {result ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">⚔</div>
            <p className="font-display text-lg font-semibold text-gold-300">
              {result.deleted} spell{result.deleted !== 1 ? 's' : ''} purged from the archives
            </p>
            <button onClick={handleClose} className="mt-5 btn-secondary">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Category checkboxes */}
            <div className="space-y-3 mb-5">
              {CATEGORIES.map((cat) => {
                const disabled = cat.adminOnly && !isStaff;
                const checked = selected.has(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={[
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors select-none',
                      disabled
                        ? 'opacity-40 cursor-not-allowed bg-smoke-900 border-smoke-700'
                        : checked
                        ? 'border-crimson-600 bg-crimson-950/30'
                        : 'border-smoke-600 hover:border-smoke-400 bg-smoke-800',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => !disabled && toggle(cat.id)}
                      disabled={disabled}
                      className="mt-0.5 h-4 w-4 accent-crimson-500 rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm font-medium text-parchment-200">
                          {cat.label}
                        </span>
                        {cat.adminOnly && (
                          <span className="text-xs font-normal text-gold-500">
                            Admin only
                          </span>
                        )}
                        {counts && (
                          <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded ${
                            checked
                              ? 'bg-crimson-950 text-crimson-300'
                              : 'bg-smoke-700 text-parchment-400'
                          }`}>
                            {counts[cat.id].toLocaleString()} spell{counts[cat.id] !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <span className="block font-body text-xs text-parchment-500 mt-0.5">
                        {cat.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Confirmation input */}
            {selected.size > 0 && (
              <div className="mb-4">
                <label className="block font-display text-sm font-medium text-parchment-300 mb-1">
                  Type <span className="font-mono font-bold text-crimson-400">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="dnd-input font-mono"
                  placeholder="DELETE"
                  autoComplete="off"
                  style={{ borderColor: '#b91c1c' }}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <AlertMessage variant="error" message={(error as any)?.response?.data?.error ?? 'Failed to purge spells. Please try again.'} />
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="btn-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Purging…' : 'Delete Selected'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
