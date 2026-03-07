/**
 * Modal for creating a custom spell.
 */
import { useState } from 'react';
import { useCreateSpell } from '../hooks/useSpells';

interface CreateSpellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCHOOLS = [
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation',
] as const;

const SAVE_TYPES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

interface SpellFormState {
  name: string;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  is_attack_roll: boolean;
  is_saving_throw: boolean;
  save_type: string;
  half_damage_on_save: boolean;
  description: string;
  higher_level: string;
}

const defaultForm: SpellFormState = {
  name: '',
  level: 1,
  school: 'evocation',
  casting_time: '1 action',
  range: '30 feet',
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  is_attack_roll: false,
  is_saving_throw: false,
  save_type: '',
  half_damage_on_save: false,
  description: '',
  higher_level: '',
};

export function CreateSpellModal({ isOpen, onClose }: CreateSpellModalProps) {
  const [form, setForm] = useState<SpellFormState>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createSpell = useCreateSpell();

  if (!isOpen) return null;

  const handleClose = () => {
    setForm(defaultForm);
    setErrors({});
    createSpell.reset();
    onClose();
  };

  const set = <K extends keyof SpellFormState>(field: K, value: SpellFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required.';
    if (form.level < 0 || form.level > 9) newErrors.level = 'Level must be 0–9.';
    if (!form.school) newErrors.school = 'School is required.';
    if (!form.description.trim()) newErrors.description = 'Description is required.';
    if (form.is_saving_throw && !form.save_type) newErrors.save_type = 'Save type is required for saving throw spells.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await createSpell.mutateAsync({
      ...form,
      save_type: form.is_saving_throw ? form.save_type : undefined,
    } as any);
  };

  const labelCls = 'block text-sm font-medium text-gray-700 mb-1';
  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm';
  const errCls = 'text-xs text-red-600 mt-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Custom Spell</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Name */}
          <div>
            <label className={labelCls}>Name *</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className={inputCls}
              placeholder="e.g. Thunderwave"
            />
            {errors.name && <p className={errCls}>{errors.name}</p>}
          </div>

          {/* Level + School */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Level *</label>
              <select
                value={form.level}
                onChange={(e) => set('level', Number(e.target.value))}
                className={inputCls}
              >
                <option value={0}>Cantrip</option>
                {[1,2,3,4,5,6,7,8,9].map((l) => (
                  <option key={l} value={l}>Level {l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>School *</label>
              <select
                value={form.school}
                onChange={(e) => set('school', e.target.value)}
                className={inputCls}
              >
                {SCHOOLS.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              {errors.school && <p className={errCls}>{errors.school}</p>}
            </div>
          </div>

          {/* Casting Time + Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Casting Time</label>
              <input value={form.casting_time} onChange={(e) => set('casting_time', e.target.value)} className={inputCls} placeholder="1 action" />
            </div>
            <div>
              <label className={labelCls}>Range</label>
              <input value={form.range} onChange={(e) => set('range', e.target.value)} className={inputCls} placeholder="30 feet" />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className={labelCls}>Duration</label>
            <input value={form.duration} onChange={(e) => set('duration', e.target.value)} className={inputCls} placeholder="Instantaneous" />
          </div>

          {/* Flags Row 1 */}
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.concentration} onChange={(e) => set('concentration', e.target.checked)} className="w-4 h-4" />
              Concentration
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.ritual} onChange={(e) => set('ritual', e.target.checked)} className="w-4 h-4" />
              Ritual
            </label>
          </div>

          {/* Combat Type */}
          <div>
            <p className={labelCls}>Spell Type</p>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.is_attack_roll}
                  onChange={(e) => set('is_attack_roll', e.target.checked)}
                  className="w-4 h-4"
                />
                Attack Roll
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.is_saving_throw}
                  onChange={(e) => set('is_saving_throw', e.target.checked)}
                  className="w-4 h-4"
                />
                Saving Throw
              </label>
            </div>
          </div>

          {/* Saving Throw Options */}
          {form.is_saving_throw && (
            <div className="pl-4 border-l-2 border-orange-300 space-y-3">
              <div>
                <label className={labelCls}>Save Ability *</label>
                <select
                  value={form.save_type}
                  onChange={(e) => set('save_type', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {SAVE_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {errors.save_type && <p className={errCls}>{errors.save_type}</p>}
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={form.half_damage_on_save}
                  onChange={(e) => set('half_damage_on_save', e.target.checked)}
                  className="w-4 h-4"
                />
                Half damage on successful save
              </label>
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={5}
              className={inputCls}
              placeholder="Enter the spell description…"
            />
            {errors.description && <p className={errCls}>{errors.description}</p>}
          </div>

          {/* Higher Levels */}
          <div>
            <label className={labelCls}>At Higher Levels</label>
            <textarea
              value={form.higher_level}
              onChange={(e) => set('higher_level', e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="When you cast this spell using a spell slot of 2nd level or higher…"
            />
          </div>

          {/* API Error */}
          {createSpell.isError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
              Failed to create spell. Please check your inputs and try again.
            </div>
          )}

          {/* Success */}
          {createSpell.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800 font-medium">
              ✓ Spell created successfully!
            </div>
          )}

          {/* Footer buttons inside form so Enter submits */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              {createSpell.isSuccess ? 'Close' : 'Cancel'}
            </button>
            {!createSpell.isSuccess && (
              <button
                type="submit"
                disabled={createSpell.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {createSpell.isPending ? 'Creating…' : 'Create Spell'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateSpellModal;
