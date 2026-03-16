/**
 * Modal for creating or editing a spell.
 */
import { useState, useEffect } from 'react';
import { useCreateSpell, useUpdateSpell, useSpellSources } from '../hooks/useSpells';
import { ModalShell, AlertMessage } from './ui';
import { DAMAGE_TYPES, SPELL_TAGS } from '../constants/spellColors';
import type { Spell } from '../types/api';

interface CharLevelBreakpointEntry {
  char_level: number;
  die_count: number;
  die_size: number;
  flat: number;
}

interface DamageComponentEntry {
  dice_count: number;
  die_size: number;
  flat_modifier: number;
  damage_type: string;
  timing: string;
  condition_label: string;
  on_crit_extra: boolean;
  uses_spellcasting_modifier: boolean;
  scales_with_slot: boolean;
  upcast_dice_increment: number | null;
}

const DIE_SIZES = [4, 6, 8, 10, 12, 20] as const;

const TIMING_OPTIONS: { value: string; label: string }[] = [
  { value: 'on_hit',     label: 'On Hit' },
  { value: 'on_fail',   label: 'On Failed Save' },
  { value: 'on_success',label: 'On Successful Save' },
  { value: 'end_of_turn',label: 'End of Turn' },
  { value: 'per_round', label: 'Per Round' },
  { value: 'delayed',   label: 'Delayed' },
];

interface CreateSpellModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** When provided the modal operates in edit mode, pre-filling the form. */
  spellToEdit?: Spell;
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
  is_auto_hit: boolean;
  save_type: string;
  half_damage_on_save: boolean;
  classes: string[];
  tags: string[];
  source: string;
  description: string;
  higher_level: string;
  damage_components: DamageComponentEntry[];
  upcast_dice_increment: number | null;
  upcast_die_size: number | null;
  upcast_base_level: number | null;
  upcast_attacks_increment: number | null;
  upcast_scale_step: number | null;
  char_level_breakpoints: CharLevelBreakpointEntry[];
}

const defaultForm: SpellFormState = {
  name: '',
  level: 1,
  school: 'abjuration',
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
  is_auto_hit: false,
  save_type: '',
  half_damage_on_save: false,
  classes: [],
  tags: [],
  source: '',
  description: '',
  higher_level: '',
  damage_components: [],
  upcast_dice_increment: null,
  upcast_die_size: null,
  upcast_base_level: null,
  upcast_attacks_increment: null,
  upcast_scale_step: null,
  char_level_breakpoints: [],
};

/** Map a Spell back into the editable SpellFormState. */
function spellToFormState(spell: Spell): SpellFormState {
  const castingTimeKnown = (CASTING_TIME_OPTIONS as readonly string[]).includes(spell.casting_time);
  const rangeKnown = (RANGE_OPTIONS as readonly string[]).includes(spell.range);
  return {
    name: spell.name,
    level: spell.level,
    school: spell.school,
    casting_time: castingTimeKnown ? spell.casting_time : 'Other',
    casting_time_custom: castingTimeKnown ? '' : spell.casting_time,
    range: rangeKnown ? spell.range : 'Other',
    range_custom: rangeKnown ? '' : spell.range,
    duration: spell.duration,
    concentration: spell.concentration,
    ritual: spell.ritual,
    components_v: spell.components_v ?? false,
    components_s: spell.components_s ?? false,
    components_m: spell.components_m ?? false,
    material: spell.material ?? '',
    is_attack_roll: spell.is_attack_roll,
    is_saving_throw: spell.is_saving_throw,
    is_auto_hit: spell.is_auto_hit ?? false,
    save_type: spell.save_type ?? '',
    half_damage_on_save: spell.half_damage_on_save,
    classes: spell.classes ?? [],
    tags: spell.tags ?? [],
    source: spell.source ?? '',
    description: spell.description,
    higher_level: spell.higher_level ?? '',
    damage_components: spell.damage_components?.map(dc => ({
      dice_count: dc.dice_count,
      die_size: dc.die_size,
      flat_modifier: dc.flat_modifier ?? 0,
      damage_type: dc.damage_type,
      timing: dc.timing,
      condition_label: dc.condition_label ?? '',
      uses_spellcasting_modifier: dc.uses_spellcasting_modifier ?? false,
      on_crit_extra: dc.on_crit_extra ?? true,
      scales_with_slot: dc.scales_with_slot ?? false,
      upcast_dice_increment: dc.upcast_dice_increment ?? null,
    })) ?? [],
    upcast_dice_increment: spell.upcast_dice_increment ?? null,
    upcast_die_size: spell.upcast_die_size ?? null,
    upcast_base_level: spell.upcast_base_level ?? null,
    upcast_attacks_increment: spell.upcast_attacks_increment ?? null,
    upcast_scale_step: spell.upcast_scale_step ?? null,
    char_level_breakpoints: Object.entries(spell.char_level_breakpoints ?? {})
      .map(([lvl, bp]) => ({
        char_level: Number(lvl),
        die_count: bp.die_count,
        die_size: bp.die_size,
        flat: bp.flat ?? 0,
      }))
      .sort((a, b) => a.char_level - b.char_level),
  };
}

export function CreateSpellModal({ isOpen, onClose, spellToEdit }: CreateSpellModalProps) {
  const isEditMode = !!spellToEdit;
  const [form, setForm] = useState<SpellFormState>(
    spellToEdit ? spellToFormState(spellToEdit) : defaultForm
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createSpell = useCreateSpell();
  const updateSpell = useUpdateSpell();
  const { data: sourcesData } = useSpellSources();

  // Re-initialise form whenever the modal opens or the target spell changes
  useEffect(() => {
    if (isOpen) {
      setForm(spellToEdit ? spellToFormState(spellToEdit) : defaultForm);
      setErrors({});
      createSpell.reset();
      updateSpell.reset();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, spellToEdit?.id]);

  if (!isOpen) return null;

  const handleClose = () => {
    setForm(defaultForm);
    setErrors({});
    createSpell.reset();
    updateSpell.reset();
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

  const toggleTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const addDamageComponent = () => {
    setForm((prev) => ({
      ...prev,
      damage_components: [
        ...prev.damage_components,
        { dice_count: 1, die_size: 6, flat_modifier: 0, damage_type: 'fire', timing: 'on_hit', condition_label: '', on_crit_extra: true, uses_spellcasting_modifier: false, scales_with_slot: false, upcast_dice_increment: null },
      ],
    }));
  };

  const removeDamageComponent = (index: number) => {
    setForm((prev) => ({
      ...prev,
      damage_components: prev.damage_components.filter((_, i) => i !== index),
    }));
  };

  const setDamageComponent = <K extends keyof DamageComponentEntry>(
    index: number, field: K, value: DamageComponentEntry[K]
  ) => {
    setForm((prev) => {
      const next = [...prev.damage_components];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, damage_components: next };
    });
  };

  const addBreakpoint = () => setForm(prev => ({
    ...prev,
    char_level_breakpoints: [...prev.char_level_breakpoints, { char_level: 5, die_count: 1, die_size: 8, flat: 0 }],
  }));

  const removeBreakpoint = (i: number) => setForm(prev => ({
    ...prev,
    char_level_breakpoints: prev.char_level_breakpoints.filter((_, idx) => idx !== i),
  }));

  const setBreakpoint = <K extends keyof CharLevelBreakpointEntry>(i: number, field: K, value: CharLevelBreakpointEntry[K]) =>
    setForm(prev => {
      const next = [...prev.char_level_breakpoints];
      next[i] = { ...next[i], [field]: value };
      return { ...prev, char_level_breakpoints: next };
    });

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

    const bpDict: Record<string, { die_count: number; die_size: number; flat: number }> = {};
    form.char_level_breakpoints.forEach(bp => {
      bpDict[String(bp.char_level)] = { die_count: bp.die_count, die_size: bp.die_size, flat: bp.flat };
    });
    const payload = {
      ...form,
      char_level_breakpoints: bpDict,
      casting_time: form.casting_time === 'Other' ? form.casting_time_custom.trim() : form.casting_time,
      range: form.range === 'Other' ? form.range_custom.trim() : form.range,
      save_type: form.is_saving_throw ? form.save_type : undefined,
      material: form.components_m ? form.material.trim() : '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    if (isEditMode && spellToEdit) {
      await updateSpell.mutateAsync({ id: spellToEdit.id, data: payload });
    } else {
      await createSpell.mutateAsync(payload);
    }
    handleClose();
  };

  const isPending = isEditMode ? updateSpell.isPending : createSpell.isPending;
  const isError   = isEditMode ? updateSpell.isError   : createSpell.isError;
  const isSuccess = isEditMode ? updateSpell.isSuccess  : createSpell.isSuccess;

  const labelCls = 'block font-display text-sm font-medium text-parchment-300 mb-1';
  const inputCls = 'dnd-input font-body text-sm';
  const errCls = 'font-body text-xs text-crimson-400 mt-1';

  return (
    <ModalShell accent="arcane" maxWidth="max-w-2xl" title={isEditMode ? '✦ Edit Spell' : '✦ Create Custom Spell'} onClose={handleClose} disabled={isPending}>
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
              <label className="flex items-center gap-2 cursor-pointer font-body text-sm text-parchment-300">
                <input
                  type="checkbox"
                  checked={form.is_auto_hit}
                  onChange={(e) => set('is_auto_hit', e.target.checked)}
                  className="w-4 h-4 accent-gold-500"
                />
                Auto-hit / Guaranteed
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

          {/* Damage Components */}
          {(form.is_attack_roll || form.is_saving_throw || form.is_auto_hit) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className={labelCls}>Damage Components</p>
                <button
                  type="button"
                  onClick={addDamageComponent}
                  className="font-display text-xs text-gold-400 hover:text-gold-300 transition-colors"
                >
                  + Add Component
                </button>
              </div>
              {form.damage_components.length === 0 && (
                <p className="font-body text-xs text-smoke-500 italic">
                  No damage components yet — click &ldquo;+ Add Component&rdquo; above.
                </p>
              )}
              <div className="space-y-3">
                {form.damage_components.map((dc, i) => (
                  <div key={i} className="pl-3 border-l-2 border-gold-800 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* dice_count d die_size */}
                      <input
                        type="number"
                        min={1}
                        value={dc.dice_count}
                        onChange={(e) => setDamageComponent(i, 'dice_count', Math.max(1, parseInt(e.target.value) || 1))}
                        className="dnd-input font-body text-sm w-16"
                        aria-label="Number of dice"
                      />
                      <span className="text-smoke-400 font-body text-sm">d</span>
                      <select
                        value={dc.die_size}
                        onChange={(e) => setDamageComponent(i, 'die_size', parseInt(e.target.value))}
                        className="dnd-input font-body text-sm w-20"
                        aria-label="Die size"
                      >
                        {DIE_SIZES.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                      {/* flat modifier */}
                      <span className="text-smoke-400 font-body text-sm">+</span>
                      <input
                        type="number"
                        value={dc.flat_modifier}
                        onChange={(e) => setDamageComponent(i, 'flat_modifier', parseInt(e.target.value) || 0)}
                        className="dnd-input font-body text-sm w-16"
                        aria-label="Flat modifier"
                      />
                      {/* damage_type */}
                      <select
                        value={dc.damage_type}
                        onChange={(e) => setDamageComponent(i, 'damage_type', e.target.value)}
                        className="dnd-input font-body text-sm flex-1 min-w-[100px] capitalize"
                        aria-label="Damage type"
                      >
                        {DAMAGE_TYPES.map((t) => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                      {/* remove */}
                      <button
                        type="button"
                        onClick={() => removeDamageComponent(i)}
                        className="text-crimson-500 hover:text-crimson-400 text-xl leading-none"
                        aria-label="Remove component"
                      >
                        ×
                      </button>
                    </div>
                    {/* timing + condition */}
                    <div className="flex gap-2">
                      <select
                        value={dc.timing}
                        onChange={(e) => setDamageComponent(i, 'timing', e.target.value)}
                        className="dnd-input font-body text-sm flex-shrink-0"
                        aria-label="Timing"
                      >
                        {TIMING_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={dc.condition_label}
                        onChange={(e) => setDamageComponent(i, 'condition_label', e.target.value)}
                        className="dnd-input font-body text-sm flex-1 min-w-0"
                        placeholder="Condition (optional, e.g. target grappled)"
                        aria-label="Condition label"
                      />
                    </div>
                    {/* Modifier flag + per-component upcast (task 1 + 2) */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <label className="flex items-center gap-1.5 cursor-pointer font-body text-xs text-parchment-300">
                        <input
                          type="checkbox"
                          checked={dc.uses_spellcasting_modifier}
                          onChange={(e) => setDamageComponent(i, 'uses_spellcasting_modifier', e.target.checked)}
                          className="w-3.5 h-3.5 accent-gold-500"
                        />
                        + Spellcasting mod
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-body text-xs text-parchment-300">
                        <input
                          type="checkbox"
                          checked={dc.scales_with_slot}
                          onChange={(e) => setDamageComponent(i, 'scales_with_slot', e.target.checked)}
                          className="w-3.5 h-3.5 accent-gold-500"
                        />
                        Scales with slot
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-body text-xs text-parchment-300">
                        <input
                          type="checkbox"
                          checked={dc.on_crit_extra}
                          onChange={(e) => setDamageComponent(i, 'on_crit_extra', e.target.checked)}
                          className="w-3.5 h-3.5 accent-gold-500"
                        />
                        Can crit
                      </label>
                      {dc.scales_with_slot && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-smoke-400 font-body text-xs">+</span>
                          <input
                            type="number"
                            min={0}
                            value={dc.upcast_dice_increment ?? ''}
                            onChange={(e) => setDamageComponent(i, 'upcast_dice_increment', e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0))}
                            className="dnd-input font-body text-xs w-14"
                            aria-label="Upcast dice count per slot"
                          />
                          <span className="text-smoke-400 font-body text-xs">d{dc.die_size} / slot</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcast Scaling */}
          {(form.is_attack_roll || form.is_saving_throw || form.is_auto_hit) && form.damage_components.length > 0 && (
            <div className="pl-3 border-l-2 border-arcane-700 space-y-3">
              <p className={labelCls}>Upcast Scaling <span className="text-smoke-500 font-normal text-xs ml-1">(optional — applied to all components without their own scaling)</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-display text-xs text-smoke-400 mb-1">Dice per slot level</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={form.upcast_dice_increment ?? ''}
                      onChange={(e) => set('upcast_dice_increment', e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0))}
                      className="dnd-input font-body text-sm w-16"
                      aria-label="Upcast dice count"
                    />
                    <span className="text-smoke-400 font-body text-sm">d</span>
                    <select
                      value={form.upcast_die_size ?? ''}
                      onChange={(e) => set('upcast_die_size', e.target.value === '' ? null : parseInt(e.target.value))}
                      className="dnd-input font-body text-sm w-20"
                      aria-label="Upcast die size"
                    >
                      <option value="">— none —</option>
                      {DIE_SIZES.map((d) => <option key={d} value={d}>d{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-display text-xs text-smoke-400 mb-1">Scale every N levels</label>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    placeholder="1 (every level)"
                    value={form.upcast_scale_step ?? ''}
                    onChange={(e) => set('upcast_scale_step', e.target.value === '' ? null : Math.max(1, parseInt(e.target.value) || 1))}
                    className="dnd-input font-body text-sm w-full"
                    aria-label="Upcast scale step"
                  />
                </div>
                <div>
                  <label className="block font-display text-xs text-smoke-400 mb-1">Scaling starts at slot</label>
                  <input
                    type="number"
                    min={1}
                    max={9}
                    placeholder="defaults to spell level"
                    value={form.upcast_base_level ?? ''}
                    onChange={(e) => set('upcast_base_level', e.target.value === '' ? null : Math.min(9, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="dnd-input font-body text-sm w-full"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-display text-xs text-smoke-400 mb-1">Extra attacks per slot</label>
                  <input
                    type="number"
                    min={0}
                    placeholder="e.g. 1 (Scorching Ray)"
                    value={form.upcast_attacks_increment ?? ''}
                    onChange={(e) => set('upcast_attacks_increment', e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0))}
                    className="dnd-input font-body text-sm w-full"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Character Level Scaling */}
          {form.level > 0 && (
            <div className="pl-3 border-l-2 border-arcane-700 space-y-3">
              <div className="flex items-center justify-between">
                <p className={labelCls}>
                  Character Level Scaling{' '}
                  <span className="text-smoke-500 font-normal text-xs ml-1">
                    (e.g. Green-Flame Blade adds 1d8 at level 5, 2d8 at level 11)
                  </span>
                </p>
                <button
                  type="button"
                  onClick={addBreakpoint}
                  className="text-xs font-body text-arcane-400 hover:text-arcane-300 cursor-pointer shrink-0"
                >
                  + Add Tier
                </button>
              </div>
              {form.char_level_breakpoints.length === 0 && (
                <p className="font-body text-xs text-smoke-600 italic">
                  No character level breakpoints. Click "+ Add Tier" to add one.
                </p>
              )}
              {form.char_level_breakpoints.map((bp, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  <label className="font-display text-xs text-smoke-400">Level</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={bp.char_level}
                    onChange={(e) => setBreakpoint(i, 'char_level', Math.min(20, Math.max(2, parseInt(e.target.value) || 2)))}
                    className="dnd-input font-body text-xs w-14"
                    aria-label="Character level threshold"
                  />
                  <span className="text-smoke-400 font-body text-xs">+:</span>
                  <input
                    type="number"
                    min={1}
                    value={bp.die_count}
                    onChange={(e) => setBreakpoint(i, 'die_count', Math.max(1, parseInt(e.target.value) || 1))}
                    className="dnd-input font-body text-xs w-12"
                    aria-label="Bonus die count"
                  />
                  <span className="text-smoke-400 font-body text-xs">d</span>
                  <select
                    value={bp.die_size}
                    onChange={(e) => setBreakpoint(i, 'die_size', parseInt(e.target.value))}
                    className="dnd-input font-body text-xs w-20"
                    aria-label="Bonus die size"
                  >
                    {DIE_SIZES.map((d) => <option key={d} value={d}>d{d}</option>)}
                  </select>
                  <span className="text-smoke-400 font-body text-xs">+</span>
                  <input
                    type="number"
                    value={bp.flat}
                    onChange={(e) => setBreakpoint(i, 'flat', parseInt(e.target.value) || 0)}
                    className="dnd-input font-body text-xs w-12"
                    aria-label="Bonus flat modifier"
                  />
                  <span className="text-smoke-400 font-body text-xs">flat</span>
                  <button
                    type="button"
                    onClick={() => removeBreakpoint(i)}
                    className="text-smoke-500 hover:text-crimson-400 font-body text-xs ml-auto cursor-pointer"
                    aria-label="Remove tier"
                  >
                    ✕
                  </button>
                </div>
              ))}
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

          {/* Tags */}
          <div>
            <p className={labelCls}>Tags</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {SPELL_TAGS.map((tag) => (
                <label key={tag} className="flex items-center gap-2 cursor-pointer font-body text-sm text-parchment-300">
                  <input
                    type="checkbox"
                    checked={form.tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                    className="w-4 h-4 accent-gold-500"
                  />
                  {tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </label>
              ))}
            </div>
          </div>

          {/* Source */}
          <div>
            <label className={labelCls}>Source</label>
            <input
              list="spell-sources"
              value={form.source}
              onChange={(e) => set('source', e.target.value)}
              className={inputCls}
              placeholder="e.g. Player's Handbook, My Campaign"
            />
            <datalist id="spell-sources">
              {(sourcesData ?? []).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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
          {isError && (
            <AlertMessage variant="error" message="Failed to save spell. Please check your inputs and try again." />
          )}

          {/* Success */}
          {isSuccess && (
            <AlertMessage variant="success" message={isEditMode ? '✓ Spell updated!' : '✓ Spell inscribed in the archives!'} />
          )}

          {/* Footer buttons inside form so Enter submits */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              {isSuccess ? 'Close' : 'Cancel'}
            </button>
            {!isSuccess && (
              <button
                type="submit"
                disabled={isPending}
                className="btn-gold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending
                  ? (isEditMode ? 'Saving…' : 'Inscribing…')
                  : (isEditMode ? 'Save Changes' : 'Create Spell')}
              </button>
            )}
          </div>
        </form>
      </ModalShell>
  );
}

export default CreateSpellModal;
