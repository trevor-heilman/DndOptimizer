/**
 * Modal for importing spells from a JSON file or pasted JSON text.
 */
import { useState, useRef } from 'react';
import { useImportSpells } from '../hooks/useSpells';
import { useAuth } from '../contexts/AuthContext';
import { AlertMessage } from './ui';

interface ImportSpellsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ImportMode = 'file' | 'paste';

function parseSpellsFromJson(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    // Keyed-dict export: { "Spells.xxx": {...}, "Creatures.xxx": {...} }
    const spellEntries = Object.entries(obj).filter(([k]) => k.startsWith('Spells.'));
    if (spellEntries.length > 0) return spellEntries.map(([, v]) => v);
    // Standard wrappers
    if (Array.isArray(obj['spells'])) return obj['spells'] as any[];
    if (Array.isArray(obj['spell'])) return obj['spell'] as any[];
    // Single spell object — only treat as a spell if it looks like one
    if ('name' in obj || 'Name' in obj) return [raw];
  }
  return [];
}

export function ImportSpellsModal({ isOpen, onClose }: ImportSpellsModalProps) {
  const { user } = useAuth();
  const isStaff = user?.is_staff ?? false;
  const [mode, setMode] = useState<ImportMode>('file');
  const [pasteText, setPasteText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedCount, setParsedCount] = useState<number | null>(null);
  const [parsedSpells, setParsedSpells] = useState<any[]>([]);
  const [isSystem, setIsSystem] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importSpells = useImportSpells();

  if (!isOpen) return null;

  const handleClose = () => {
    setPasteText('');
    setParseError(null);
    setParsedCount(null);
    setParsedSpells([]);
    setIsSystem(false);
    importSpells.reset();
    onClose();
  };

  const handleImportAnother = () => {
    importSpells.reset();
    setParsedSpells([]);
    setParsedCount(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setParseError(null);
    setParsedCount(null);
    setParsedSpells([]);
    importSpells.reset();

    const readFile = (file: File): Promise<{ spells: any[]; error?: string }> =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target?.result as string);
            resolve({ spells: parseSpellsFromJson(parsed) });
          } catch {
            resolve({ spells: [], error: file.name });
          }
        };
        reader.readAsText(file);
      });

    Promise.all(files.map(readFile)).then((results) => {
      const badFiles = results.filter((r) => r.error).map((r) => r.error!);
      const allSpells = results.flatMap((r) => r.spells);
      if (allSpells.length === 0) {
        setParseError(
          badFiles.length > 0
            ? `Invalid JSON in: ${badFiles.join(', ')}`
            : 'No spells found. Expected a JSON array, an object with a "spells" key, or a single spell object.'
        );
        return;
      }
      if (badFiles.length > 0) {
        setParseError(`Could not parse: ${badFiles.join(', ')}. Loaded ${allSpells.length} spell(s) from the other file(s).`);
      }
      setParsedSpells(allSpells);
      setParsedCount(allSpells.length);
    });
  };

  const handleParsePaste = () => {
    setParseError(null);
    setParsedCount(null);
    setParsedSpells([]);
    try {
      const parsed = JSON.parse(pasteText);
      const spells = parseSpellsFromJson(parsed);
      if (spells.length === 0) {
        setParseError('No spells found. Expected a JSON array, an object with a "spells" key, or a single spell object.');
        return;
      }
      setParsedSpells(spells);
      setParsedCount(spells.length);
    } catch {
      setParseError('Invalid JSON. Please check the text and try again.');
    }
  };

  const handleImport = async () => {
    if (parsedSpells.length === 0) return;
    await importSpells.mutateAsync({ spells: parsedSpells, isSystem });
  };

  const importResult = importSpells.data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="dnd-card border-t-2 border-gold-800 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-smoke-700">
          <h2 className="font-display text-xl font-bold text-gold-300">📜 Import Spells</h2>
          <button
            onClick={handleClose}
            className="text-parchment-500 hover:text-parchment-200 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Mode Tabs */}
          <div className="flex border-b border-smoke-700">
            <button
              onClick={() => { setMode('file'); setParseError(null); setParsedSpells([]); setParsedCount(null); }}
              className={`px-4 py-2 font-display text-sm font-medium border-b-2 -mb-px transition-colors ${
                mode === 'file'
                  ? 'border-gold-500 text-gold-400'
                  : 'border-transparent text-parchment-500 hover:text-parchment-200'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => { setMode('paste'); setParseError(null); setParsedSpells([]); setParsedCount(null); }}
              className={`px-4 py-2 font-display text-sm font-medium border-b-2 -mb-px transition-colors ${
                mode === 'paste'
                  ? 'border-gold-500 text-gold-400'
                  : 'border-transparent text-parchment-500 hover:text-parchment-200'
              }`}
            >
              Paste JSON
            </button>
          </div>

          {/* File Mode */}
          {mode === 'file' && (
            <div>
              <label className="block font-display text-sm font-medium text-parchment-300 mb-2">
                Select a JSON file
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                multiple
                onChange={handleFileChange}
                className="block w-full font-body text-sm text-parchment-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-smoke-700 file:text-gold-400 hover:file:bg-smoke-600 file:cursor-pointer"
              />
              <p className="mt-2 font-body text-xs text-parchment-500">
                Accepts one or more files: JSON array, <code className="text-gold-400">{`{ "spells": [...] }`}</code>, keyed dict, or single spell.
              </p>
            </div>
          )}

          {/* Paste Mode */}
          {mode === 'paste' && (
            <div>
              <label className="block font-display text-sm font-medium text-parchment-300 mb-2">
                Paste JSON here
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setParseError(null); setParsedCount(null); setParsedSpells([]); }}
                rows={10}
                className="dnd-input font-mono text-sm resize-none"
                placeholder={'[\n  { "name": "Fireball", "level": 3, ... }\n]'}
              />
              <button
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
                className="mt-2 btn-secondary text-sm disabled:opacity-50"
              >
                Parse JSON
              </button>
            </div>
          )}

          {/* Parse Error */}
          {parseError && <AlertMessage variant="error" message={parseError} />}

          {/* Parsed Preview */}
          {parsedCount !== null && parsedCount > 0 && !importSpells.isSuccess && (
            <div className="bg-smoke-800 border border-gold-700/50 rounded-md p-3 font-body text-sm text-gold-300">
              <strong>{parsedCount} spell{parsedCount !== 1 ? 's' : ''}</strong> found and ready to import.{' '}
              Preview: {parsedSpells.slice(0, 5).map((s) => s.name ?? s.Name ?? '(unnamed)').join(', ')}
              {parsedCount > 5 ? ` …and ${parsedCount - 5} more.` : ''}
            </div>
          )}

          {/* Admin: System Spells toggle */}
          {isStaff && !importSpells.isSuccess && (
            <label className={[
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors',
              isSystem
                ? 'border-gold-600 bg-gold-950/20'
                : 'border-smoke-600 hover:border-smoke-400 bg-smoke-800',
            ].join(' ')}>
              <input
                type="checkbox"
                checked={isSystem}
                onChange={(e) => setIsSystem(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-gold-500 rounded"
              />
              <div>
                <span className="block font-display text-sm font-medium text-parchment-200">
                  Mark as System Spells
                  <span className="ml-2 text-xs font-normal text-gold-500">Admin only</span>
                </span>
                <span className="block font-body text-xs text-parchment-500 mt-0.5">
                  Spells will be visible to all users and deletable only by admins.
                </span>
              </div>
            </label>
          )}

          {/* Import Error */}
          {importSpells.isError && (
            <AlertMessage variant="error" message="Import failed. Please check that your spells have at least a name, level, and school field." />
          )}

          {/* Import Success */}
          {importSpells.isSuccess && importResult && (
            <div className="bg-smoke-800 border border-gold-700/60 rounded-md p-4 space-y-1">
              <p className="font-display font-semibold text-gold-300">
                ✓ Successfully imported{' '}
                <span className="font-bold">{(importResult as any).imported_count ?? (importResult as any).imported ?? '?'}</span> spell(s).
              </p>
              {((importResult as any).errors ?? []).length > 0 && (
                <div className="mt-2 font-body text-sm text-gold-500">
                  <p className="font-medium mb-1">{(importResult as any).errors.length} spell(s) had errors:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {(importResult as any).errors.slice(0, 10).map((e: any, i: number) => (
                      <li key={i}>{e.name ?? `Spell ${i + 1}`}: {e.error ?? JSON.stringify(e)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-smoke-700">
          <button onClick={handleClose} className="btn-secondary">
            {importSpells.isSuccess ? 'Close' : 'Cancel'}
          </button>
          {importSpells.isSuccess && (
            <button onClick={handleImportAnother} className="btn-gold">
              Import Another
            </button>
          )}
          {!importSpells.isSuccess && (
            <button
              onClick={handleImport}
              disabled={parsedSpells.length === 0 || importSpells.isPending}
              className="btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importSpells.isPending
                ? 'Importing…'
                : parsedSpells.length > 0
                ? `Import ${parsedSpells.length} Spell${parsedSpells.length !== 1 ? 's' : ''}`
                : 'Import'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImportSpellsModal;
