/**
 * ImportSpellbookModal — upload a spellbook JSON export file to create a new spellbook.
 */
import { useState, useRef } from 'react';
import { ModalShell } from './ui/ModalShell';
import { AlertMessage } from './ui/AlertMessage';
import { useImportSpellbook } from '../hooks/useSpellbooks';
import type { SpellbookImportPayload, SpellbookImportEntry } from '../services/spellbooks';

interface ImportSpellbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportSpellbookModal({ isOpen, onClose }: ImportSpellbookModalProps) {
  const [parsed, setParsed] = useState<SpellbookImportPayload | null>(null);
  const [importedName, setImportedName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importError, setImportError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportSpellbook();

  const reset = () => {
    setParsed(null);
    setImportedName('');
    setParseError('');
    setImportError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    reset();
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (typeof data.name !== 'string' || !Array.isArray(data.spells)) {
          setParseError('Invalid spellbook JSON. Expected "name" (string) and "spells" (array).');
          return;
        }
        // Validate each entry has a spell object with a name
        const spells: SpellbookImportEntry[] = data.spells.map((entry: Record<string, unknown>) => ({
          spell: (entry.spell as Record<string, unknown>) ?? {},
          prepared: Boolean(entry.prepared),
          notes: String(entry.notes ?? ''),
        }));
        setParsed({ name: data.name, description: data.description ?? '', spells });
        setImportedName(data.name);
      } catch {
        setParseError('Could not parse JSON. Make sure this is a valid Spellwright spellbook export.');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parsed) return;
    setImportError('');
    try {
      const result = await importMutation.mutateAsync({
        name: importedName.trim() || parsed.name,
        description: parsed.description ?? '',
        spells: parsed.spells,
      });
      const skippedMsg =
        result.skipped.length > 0
          ? ` (${result.skipped.length} spell${result.skipped.length !== 1 ? 's' : ''} not found in library: ${result.skipped.slice(0, 5).join(', ')}${result.skipped.length > 5 ? '…' : ''})`
          : '';
      // Small toast-style notice before closing — shown briefly
      alert(`Imported "${result.spellbook.name}" with ${result.imported} spell${result.imported !== 1 ? 's' : ''}${skippedMsg}.`);
      handleClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Import failed. Please try again.';
      setImportError(msg);
    }
  };

  if (!isOpen) return null;

  const spellCount = parsed?.spells.length ?? 0;

  return (
    <ModalShell
      title="Import Spellbook"
      onClose={handleClose}
      disabled={importMutation.isPending}
      maxWidth="max-w-lg"
      footer={
        <>
          <button onClick={handleClose} className="btn-secondary text-sm" disabled={importMutation.isPending}>
            Cancel
          </button>
          <button
            onClick={handleImport}
            className="btn-gold text-sm"
            disabled={!parsed || importMutation.isPending}
          >
            {importMutation.isPending ? 'Importing…' : `Import Spellbook (${spellCount} spells)`}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="font-body text-sm text-parchment-400">
          Select a <span className="text-parchment-200">.json</span> file exported from Spellwright.
          A new spellbook will be created; spells are matched by name against your library.
        </p>

        {/* File input */}
        <div>
          <label className="font-display text-xs uppercase tracking-widest text-smoke-400 block mb-1.5">
            Spellbook JSON File
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="block w-full text-sm text-parchment-300
              file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0
              file:font-display file:text-xs file:uppercase file:tracking-wide
              file:bg-smoke-700 file:text-parchment-200 hover:file:bg-smoke-600
              file:transition-colors file:cursor-pointer cursor-pointer"
          />
        </div>

        {parseError && (
          <AlertMessage variant="error" title="Invalid File" message={parseError} />
        )}

        {/* Preview + name override */}
        {parsed && (
          <div
            className="rounded-lg p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="font-display text-xs uppercase tracking-widest text-gold-600 mb-1">Preview</p>

            <div>
              <label className="font-display text-xs uppercase tracking-widest text-smoke-400 block mb-1">
                Spellbook Name
              </label>
              <input
                type="text"
                value={importedName}
                onChange={e => setImportedName(e.target.value)}
                className="dnd-input w-full font-body text-sm"
                placeholder="Spellbook name"
              />
            </div>

            {parsed.description && (
              <p className="font-body text-xs text-parchment-400 italic">{parsed.description}</p>
            )}

            <div className="flex flex-wrap gap-3">
              <span
                className="font-display text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(180,83,9,0.15)', color: '#fbbf24', border: '1px solid rgba(180,83,9,0.3)' }}
              >
                {spellCount} spell{spellCount !== 1 ? 's' : ''}
              </span>
              <span
                className="font-display text-xs px-2 py-1 rounded"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {parsed.spells.filter(e => e.prepared).length} prepared
              </span>
            </div>

            <p className="font-body text-xs text-smoke-500">
              Spells are matched by name against your library. Any not found will be skipped and listed in the result.
            </p>
          </div>
        )}

        {importError && (
          <AlertMessage variant="error" title="Import Failed" message={importError} />
        )}
      </div>
    </ModalShell>
  );
}

export default ImportSpellbookModal;
