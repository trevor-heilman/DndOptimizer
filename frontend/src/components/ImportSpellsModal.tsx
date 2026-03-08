/**
 * Modal for importing spells from a JSON file or pasted JSON text.
 */
import { useState, useRef } from 'react';
import { useImportSpells } from '../hooks/useSpells';
import { useAuth } from '../contexts/AuthContext';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Import Spells</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Mode Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => { setMode('file'); setParseError(null); setParsedSpells([]); setParsedCount(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                mode === 'file'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Upload File
            </button>
            <button
              onClick={() => { setMode('paste'); setParseError(null); setParsedSpells([]); setParsedCount(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                mode === 'paste'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Paste JSON
            </button>
          </div>

          {/* File Mode */}
          {mode === 'file' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a JSON file
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
              <p className="mt-2 text-xs text-gray-500">
                Accepts one or more files: JSON array, <code>{`{ "spells": [...] }`}</code>, keyed dict, or single spell.
              </p>
            </div>
          )}

          {/* Paste Mode */}
          {mode === 'paste' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paste JSON here
              </label>
              <textarea
                value={pasteText}
                onChange={(e) => { setPasteText(e.target.value); setParseError(null); setParsedCount(null); setParsedSpells([]); }}
                rows={10}
                className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={'[\n  { "name": "Fireball", "level": 3, ... }\n]'}
              />
              <button
                onClick={handleParsePaste}
                disabled={!pasteText.trim()}
                className="mt-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 text-sm"
              >
                Parse JSON
              </button>
            </div>
          )}

          {/* Parse Error */}
          {parseError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              {parseError}
            </div>
          )}

          {/* Parsed Preview */}
          {parsedCount !== null && parsedCount > 0 && !importSpells.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
              <strong>{parsedCount} spell{parsedCount !== 1 ? 's' : ''}</strong> found and ready to import.
              Preview: {parsedSpells.slice(0, 5).map((s) => s.name ?? s.Name ?? '(unnamed)').join(', ')}
              {parsedCount > 5 ? ` …and ${parsedCount - 5} more.` : ''}
            </div>
          )}

          {/* Admin: System Spells toggle */}
          {isStaff && !importSpells.isSuccess && (
            <label className={[
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer select-none transition-colors',
              isSystem ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:border-gray-300 bg-white',
            ].join(' ')}>
              <input
                type="checkbox"
                checked={isSystem}
                onChange={(e) => setIsSystem(e.target.checked)}
                className="mt-0.5 h-4 w-4 text-amber-600 rounded border-gray-300"
              />
              <div>
                <span className="block text-sm font-medium text-gray-900">
                  Mark as System Spells
                  <span className="ml-2 text-xs font-normal text-amber-600">Admin only</span>
                </span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Spells will be visible to all users and deletable only by admins.
                </span>
              </div>
            </label>
          )}

          {/* Import Error */}
          {importSpells.isError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              Import failed. Please check that your spells have at least a <code>name</code>, <code>level</code>, and <code>school</code> field.
            </div>
          )}

          {/* Import Success */}
          {importSpells.isSuccess && importResult && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 space-y-1">
              <p className="font-semibold text-green-800">
                ✓ Successfully imported{' '}
                <span className="font-bold">{(importResult as any).imported_count ?? (importResult as any).imported ?? '?'}</span> spell(s).
              </p>
              {((importResult as any).errors ?? []).length > 0 && (
                <div className="mt-2 text-sm text-yellow-800">
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
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            {importSpells.isSuccess ? 'Close' : 'Cancel'}
          </button>
          {importSpells.isSuccess && (
            <button
              onClick={handleImportAnother}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              Import Another
            </button>
          )}
          {!importSpells.isSuccess && (
            <button
              onClick={handleImport}
              disabled={parsedSpells.length === 0 || importSpells.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
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
