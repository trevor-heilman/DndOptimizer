/**
 * Clear Spells Modal - bulk delete spells by category.
 */
import { useState } from 'react';
import { useBulkDeleteSpells, useSpellCounts } from '../hooks/useSpells';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Delete Spells</h2>
          <button
            onClick={handleClose}
            disabled={isPending}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Select categories to permanently delete. This cannot be undone.
        </p>

        {result ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">✓</div>
            <p className="text-lg font-semibold text-gray-900">
              {result.deleted} spell{result.deleted !== 1 ? 's' : ''} deleted
            </p>
            <button
              onClick={handleClose}
              className="mt-5 px-5 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
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
                        ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200'
                        : checked
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white',
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => !disabled && toggle(cat.id)}
                      disabled={disabled}
                      className="mt-0.5 h-4 w-4 text-red-600 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {cat.label}
                        </span>
                        {cat.adminOnly && (
                          <span className="text-xs font-normal text-amber-600">
                            Admin only
                          </span>
                        )}
                        {counts && (
                          <span className={`ml-auto text-xs font-semibold px-1.5 py-0.5 rounded ${
                            checked ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {counts[cat.id].toLocaleString()} spell{counts[cat.id] !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <span className="block text-xs text-gray-500 mt-0.5">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
                </label>
                <input
                  type="text"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3">
                {(error as any)?.response?.data?.error ?? 'Failed to delete spells. Please try again.'}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Deleting…' : 'Delete Selected'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
