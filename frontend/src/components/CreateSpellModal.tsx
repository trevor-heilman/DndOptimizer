/**
 * Modal for creating a custom spell.
 */
import { useState } from 'react';
import { useCreateSpell } from '../hooks/useSpells';
import { ModalShell, AlertMessage } from './ui';

interface CreateSpellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SCHOOLS = [
  'abjuration', 'conjuration', 'divination', 'enchantment',
  'evocation', 'illusion', 'necromancy', 'transmutation',
] as const;

const SAVE_TYPES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

const CLASS_CHOICES = [
  'artificer', 'bard', 'cleric', 'druid', 'paladin',
  'ranger', 'sorcerer', 'warlock', 'wizard',
] as const;

const CASTING_TIME_OPTIONS = [
  '1 action',
  '1 bonus action',
  '1 reaction',
  '1 minute',
  '10 minutes',
  '1 hour',
  '8 hours',
  '12 hours',
  '24 hours',
  'Other',
] as const;

const RANGE_OPTIONS = [
  'Self',
  'Touch',
  '5 feet',
  '10 feet',
  '30 feet',
  '60 feet',
  '90 feet',
  '120 feet',
  '150 feet',
  '300 feet',
  '500 feet',
  '1 mile',
  'Sight',
  'Unlimited',
  'Special',
  'Other',
] as const;

interface SpellFormState {
  name: string;
  level: number;
  school: string;
  casting_time: string;
  casting_time_custom: string;
  range: string;
  range_custom: string;
  duration: string;
  concentration: boolean;
  ritual: boolean;
  components_v: boolean;
  components_s: boolean;
  components_m: boolean;
  material: string;
  is_attack_roll: boolean;
  is_saving_throw: boolean;
  save_type: string;
  half_damage_on_save: boolean;
  classes: string[];
  description: string;
  higher_level: string;
}

const defaultForm: SpellFormState = {
  name: '',
  level: 1,
  school: 'evocation',
  casting_time: '1 action',
  casting_time_custom: '',
  range: '30 feet',
  range_custom: '',
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  components_v: false,
  components_s: false,
  components_m: false,
  material: '',
  is_attack_roll: false,
  is_saving_throw: false,
  save_type: '',
  half_damage_on_save: false,
  classes: [],
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

  const toggleClass = (cls: string) => {
    setForm((prev) => ({
      ...prev,
      classes: prev.classes.includes(cls)
        ? prev.classes.filter((c) => c !== cls)
        : [...prev.classes, cls],
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Name is required.';
    if (form.level < 0 || form.level > 9) newErrors.level = 'Level must be 0–9.';
    if (!form.school) newErrors.school = 'School is required.';
    if (!form.description.trim()) newErrors.description = 'Description is required.';
    if (form.is_saving_throw && !form.save_type) newErrors.save_type = 'Save type is required for saving throw spells.';
    if (form.casting_time === 'Other' && !form.casting_time_custom.trim()) newErrors.casting_time = 'Casting time is required.';
    if (form.range === 'Other' && !form.range_custom.trim()) newErrors.range = 'Range is required.';
    if (form.components_m && !form.material.trim()) newErrors.material = 'Material component description is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await createSpell.mutateAsync({
      ...form,
      casting_time: form.casting_time === 'Other' ? form.casting_time_custom.trim() : form.casting_time,
      range: form.range === 'Other' ? form.range_custom.trim() : form.range,
      save_type: form.is_saving_throw ? form.save_type : undefined,
      material: form.components_m ? form.material.trim() : '',
    } as any);
  };

  const labelCls = 'block font-display text-sm font-medium text-parchment-300 mb-1';
  const inputCls = 'dnd-input font-body text-sm';
  const errCls = 'font-body text-xs text-crimson-400 mt-1';

  return (
    <ModalShell accent="arcane" maxWidth="max-w-2xl" title="✦ Create Custom Spell" onClose={handleClose} disabled={createSpell.isPending}>
      <form onSubmit={handleSubmit} className="space-y-5">
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
              <select
                value={form.casting_time}
                onChange={(e) => set('casting_time', e.target.value)}
                className={inputCls}
              >
                {CASTING_TIME_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {form.casting_time === 'Other' && (
                <input
                  value={form.casting_time_custom}
                  onChange={(e) => set('casting_time_custom', e.target.value)}
                  className={`${inputCls} mt-2`}
                  placeholder="e.g. 1 reaction, which you take when…"
                />
              )}
              {errors.casting_time && <p className={errCls}>{errors.casting_time}</p>}
            </div>
            <div>
              <label className={labelCls}>Range</label>
              <select
                value={form.range}
                onChange={(e) => set('range', e.target.value)}
                className={inputCls}
              >
                {RANGE_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              {form.range === 'Other' && (
                <input
                  value={form.range_custom}
                  onChange={(e) => set('range_custom', e.target.value)}
                  className={`${inputCls} mt-2`}
                  placeholder="e.g. 60-foot cone"
                />
              )}
              {errors.range && <p className={errCls}>{errors.range}</p>}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className={labelCls}>Duration</label>
            <input value={form.duration} onChange={(e) => set('duration', e.target.value)} className={inputCls} placeholder="Instantaneous" />
          </div>

          {/* Components */}
          <div>
            <p className={labelCls}>Components</p>
            <div className="flex flex-wrap gap-5 mb-2">
              {(['V', 'S', 'M'] as const).map((comp) => {
                const field = `components_${comp.toLowerCase()}` as 'components_v' | 'components_s' | 'components_m';
                return (
                  <label key={comp} className="flex items-center gap-2 cursor-pointer font-body text-sm text-parchment-300">
                    <input
                      type="checkbox"
                      checked={form[field]}
                      onChange={(e) => set(field, e.target.checked)}
                      className="w-4 h-4 accent-gold-500"
                    />
                    {comp} ({comp === 'V' ? 'Verbal' : comp === 'S' ? 'Somatic' : 'Material'})
                  </label>
                );
              })}
            </div>
            {form.components_m && (
              <div className="pl-4 border-l-2 border-gold-800">
                <label className={labelCls}>Material Description *</label>
                <input
                  value={form.material}
                  onChange={(e) => set('material', e.target.value)}
                  className={inputCls}
                  placeholder="e.g. a pinch of sulfur and bat guano"
                />
                {errors.material && <p className={errCls}>{errors.material}</p>}
              </div>
            )}
          </div>

          {/* Flags Row 1 */}
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 cursor-pointer font-body text-sm text-parchment-300">
              <input type="checkbox" checked={form.concentration} onChange={(e) => set('concentration', e.target.checked)} className="w-4 h-4 accent-gold-500" />
              Concentration
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-body text-sm text-parchment-300">
              <input type="checkbox" checked={form.ritual} onChange={(e) => set('ritual', e.target.checked)} className="w-4 h-4 accent-gold-500" />
              Ritual
            </label>
          </div>

          {/* Combat Type */}
          <div>
            <p className={labelCls}>Spell Type</p>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 cursor-pointer font-body text-sm text-parchment-300">
                <input
                  type="checkbox"
                  checked={form.is_attack_roll}
                  onChange={(e) => set('is_attack_roll', e.target.checked)}
                  className="w-4 h-4 accent-gold-500"
                />
                Attack Roll
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-body text-sm text-parchment-300">
                <input
                  type="checkbox"
                  checked={form.is_saving_throw}
                  onChange={(e) => set('is_saving_throw', e.target.checked)}
                  className="w-4 h-4 accent-gold-500"
                />
                Saving Throw
              </label>
            </div>
          </div>

          {/* Saving Throw Options */}
          {form.is_saving_throw && (
            <div className="pl-4 border-l-2 border-arcane-600 space-y-3">
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
              <label className="flex items-center gap-2 cursor-pointer font-body text-sm text-parchment-300">
                <input
                  type="checkbox"
                  checked={form.half_damage_on_save}
                  onChange={(e) => set('half_damage_on_save', e.target.checked)}
                  className="w-4 h-4 accent-gold-500"
                />
                Half damage on successful save
              </label>
            </div>
          )}

          {/* Classes */}
          <div>
            <p className={labelCls}>Classes</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {CLASS_CHOICES.map((cls) => (
                <label key={cls} className="flex items-center gap-2 cursor-pointer font-body text-sm text-parchment-300">
                  <input
                    type="checkbox"
                    checked={form.classes.includes(cls)}
                    onChange={() => toggleClass(cls)}
                    className="w-4 h-4 accent-gold-500"
                  />
                  {cls.charAt(0).toUpperCase() + cls.slice(1)}
                </label>
              ))}
            </div>
          </div>

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
            <AlertMessage variant="error" message="Failed to create spell. Please check your inputs and try again." />
          )}

          {/* Success */}
          {createSpell.isSuccess && (
            <AlertMessage variant="success" message="✓ Spell inscribed in the archives!" />
          )}

          {/* Footer buttons inside form so Enter submits */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              {createSpell.isSuccess ? 'Close' : 'Cancel'}
            </button>
            {!createSpell.isSuccess && (
              <button
                type="submit"
                disabled={createSpell.isPending}
                className="btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createSpell.isPending ? 'Inscribing…' : 'Create Spell'}
              </button>
            )}
          </div>
        </form>
      </ModalShell>
  );
}

export default CreateSpellModal;
