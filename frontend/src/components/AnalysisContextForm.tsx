/**
 * Analysis Context Form Component
 */
import { useState } from 'react';
import type { AnalysisContext, Spell } from '../types/api';

const DAMAGE_TYPES = [
  'acid', 'cold', 'fire', 'force', 'lightning',
  'necrotic', 'poison', 'psychic', 'radiant', 'thunder',
] as const;

interface AnalysisContextFormProps {
  context: AnalysisContext;
  onChange: (context: AnalysisContext) => void;
  /** If provided, only show inputs relevant to these spells (attack or save). */
  spells?: Spell[];
}

export function AnalysisContextForm({ context, onChange, spells }: AnalysisContextFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (field: keyof AnalysisContext, value: any) => {
    onChange({ ...context, [field]: value });
  };

  // Determine which combat input groups to show.
  // If no spells provided, show everything (backward compat).
  const hasSpells = spells && spells.length > 0;
  const showAttack = !hasSpells || spells!.some((s) => s.is_attack_roll);
  const showSave   = !hasSpells || spells!.some((s) => s.is_saving_throw);
  // Always show Number of Enemies — relevant whenever you're hitting multiple foes.
  // If every selected spell is a cantrip show Character Level (1–20) instead of Spell Slot Level.
  const isCantrip = hasSpells && spells!.every(s => s.level === 0);
  // If the selection mixes cantrips and leveled spells, show both level selectors.
  const hasMixedLevels = hasSpells && spells!.some(s => s.level === 0) && spells!.some(s => s.level > 0);
  const showCharLevel = isCantrip || hasMixedLevels;
  const showSlotLevel = !isCantrip;
  // Minimum slot level = lowest spell level among non-cantrip spells (so the dropdown
  // never shows options below the spell's base level).
  const minSlotLevel = (hasSpells && !isCantrip)
    ? Math.max(1, Math.min(...spells!.filter(s => s.level > 0).map(s => s.level)))
    : 1;
  // Always show at least one group so the form is never empty for non-damage spells.
  const showBoth = showAttack && showSave;

  return (
    <div className="space-y-4">

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showAttack && (
          <div>
            <label htmlFor="target_ac" className="block text-sm font-display font-medium text-parchment-300 mb-1">
              Target AC
            </label>
            <input
              type="number"
              id="target_ac"
              value={context.target_ac ?? ''}
              onChange={(e) => handleChange('target_ac', e.target.value ? parseInt(e.target.value) : undefined)}
              className="dnd-input font-body"
              placeholder="15"
              min="1"
              max="30"
            />
          </div>
        )}

        {showAttack && (
          <div>
            <label htmlFor="caster_attack_bonus" className="block text-sm font-display font-medium text-parchment-300 mb-1">
              Spell Attack Bonus
            </label>
            <input
              type="number"
              id="caster_attack_bonus"
              value={context.caster_attack_bonus ?? ''}
              onChange={(e) => handleChange('caster_attack_bonus', e.target.value ? parseInt(e.target.value) : undefined)}
              className="dnd-input font-body"
              placeholder="+5"
            />
          </div>
        )}

        <div>
          <label htmlFor="spellcasting_ability_modifier" className="block text-sm font-display font-medium text-parchment-300 mb-1">
            Spellcasting Mod
          </label>
          <input
            type="number"
            id="spellcasting_ability_modifier"
            value={context.spellcasting_ability_modifier ?? ''}
            onChange={(e) => handleChange('spellcasting_ability_modifier', e.target.value ? parseInt(e.target.value) : undefined)}
            className="dnd-input font-body"
            placeholder="+3"
            min="-5"
            max="10"
          />
        </div>

        {showSave && (
          <div>
            <label htmlFor="spell_save_dc" className="block text-sm font-display font-medium text-parchment-300 mb-1">
              Spell Save DC
            </label>
            <input
              type="number"
              id="spell_save_dc"
              value={context.spell_save_dc ?? ''}
              onChange={(e) => handleChange('spell_save_dc', e.target.value ? parseInt(e.target.value) : undefined)}
              className="dnd-input font-body"
              placeholder="15"
              min="1"
              max="30"
            />
          </div>
        )}

        {showSave && (
          <div>
            <label htmlFor="target_save_bonus" className="block text-sm font-display font-medium text-parchment-300 mb-1">
              Target Save Bonus
            </label>
            <input
              type="number"
              id="target_save_bonus"
              value={context.target_save_bonus ?? ''}
              onChange={(e) => handleChange('target_save_bonus', e.target.value ? parseInt(e.target.value) : undefined)}
              className="dnd-input font-body"
              placeholder="0"
              min="-5"
              max="15"
            />
          </div>
        )}

        {/* If showing both groups, hint the user about the dual-component spell */}
        {showBoth && hasSpells && (
          <div className="md:col-span-2">
            <p className="font-body text-xs text-smoke-400 italic">
              One or more selected spells use both an attack roll and a saving throw (e.g. Ice Knife).
              Both sets of parameters are shown.
            </p>
          </div>
        )}

        <div>
          <label htmlFor="number_of_targets" className="block text-sm font-display font-medium text-parchment-300 mb-1">
            Number of Enemies
          </label>
          <input
            type="number"
            id="number_of_targets"
            value={context.number_of_targets ?? 1}
            onChange={(e) => handleChange('number_of_targets', e.target.value ? parseInt(e.target.value) : 1)}
            className="dnd-input font-body"
            placeholder="1"
            min="1"
            max="20"
          />
        </div>

        {/* Spell Slot Level (leveled spells) or Character Level (cantrips) */}
        {showCharLevel && (
          <div>
            <label htmlFor="character_level" className="block text-sm font-display font-medium text-parchment-300 mb-1">
              Character Level
            </label>
            <select
              id="character_level"
              value={context.character_level ?? 1}
              onChange={(e) => handleChange('character_level', parseInt(e.target.value))}
              className="dnd-input font-body"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((l) => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>
        )}
        {showSlotLevel && (
          <div>
            <label htmlFor="spell_slot_level" className="block text-sm font-display font-medium text-parchment-300 mb-1">
              Spell Slot Level
            </label>
            <select
              id="spell_slot_level"
              value={context.spell_slot_level ?? 1}
              onChange={(e) => handleChange('spell_slot_level', parseInt(e.target.value))}
              className="dnd-input font-body"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => l >= minSlotLevel).map((l) => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
          </div>
        )}

        {/* Advantage / Disadvantage — inline with the level selector */}
        <div>
          <label htmlFor="adv_disadv" className="block text-sm font-display font-medium text-parchment-300 mb-1">
            Adv / Disadv
          </label>
          <select
            id="adv_disadv"
            value={context.advantage ? 'advantage' : context.disadvantage ? 'disadvantage' : 'normal'}
            onChange={(e) => {
              const val = e.target.value;
              onChange({
                ...context,
                advantage: val === 'advantage',
                disadvantage: val === 'disadvantage',
              });
            }}
            className="dnd-input font-body text-sm"
          >
            <option value="normal">Normal</option>
            <option value="advantage">Advantage</option>
            <option value="disadvantage">Disadvantage</option>
          </select>
        </div>
      </div>

      {/* ── Spell Conditions ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-display uppercase tracking-widest text-smoke-400 mb-2">Spell Conditions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {showAttack && (
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={context.crit_enabled ?? true}
                onChange={(e) => handleChange('crit_enabled', e.target.checked)}
                className="w-4 h-4 rounded accent-gold-500"
              />
              <span className="font-body text-sm text-parchment-300 group-hover:text-parchment-200 transition-colors">
                Crits enabled
              </span>
            </label>
          )}
          {showSave && (
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={context.half_damage_on_save ?? true}
                onChange={(e) => handleChange('half_damage_on_save', e.target.checked)}
                className="w-4 h-4 rounded accent-gold-500"
              />
              <span className="font-body text-sm text-parchment-300 group-hover:text-parchment-200 transition-colors">
                Half damage on save
              </span>
            </label>
          )}
          {showSave && (
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={context.evasion_enabled ?? false}
                onChange={(e) => handleChange('evasion_enabled', e.target.checked)}
                className="w-4 h-4 rounded accent-gold-500"
              />
              <span className="font-body text-sm text-parchment-300 group-hover:text-parchment-200 transition-colors">
                Target has Evasion
              </span>
            </label>
          )}
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={context.resistance ?? false}
              onChange={(e) => handleChange('resistance', e.target.checked)}
              className="w-4 h-4 rounded accent-gold-500"
            />
            <span className="font-body text-sm text-parchment-300 group-hover:text-parchment-200 transition-colors">
              Target has Resistance
            </span>
          </label>
        </div>
      </div>

      {/* ── Advanced Section ───────────────────────────────────────────────── */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 font-display text-xs uppercase tracking-widest text-smoke-400 hover:text-parchment-300 transition-colors"
        >
          <span
            className="inline-block transition-transform duration-150"
            style={{ transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            ▶
          </span>
          Advanced (Feats &amp; Traits)
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 pl-1 pt-1 border-l-2 border-smoke-700">
            {/* Crit type — only relevant for attack-roll spells */}
            {showAttack && (
              <div>
                <label htmlFor="crit_type" className="block text-sm font-display font-medium text-parchment-300 mb-1">
                  Critical Hit Rule
                </label>
                <select
                  id="crit_type"
                  value={context.crit_type ?? 'double_dice'}
                  onChange={(e) => handleChange('crit_type', e.target.value)}
                  className="dnd-input font-body text-sm"
                >
                  <option value="double_dice">Double Dice (standard 5e)</option>
                  <option value="double_damage">Double Total Damage</option>
                  <option value="max_plus_roll">Max Dice + Roll Again</option>
                </select>
              </div>
            )}

            {/* Lucky / re-roll mechanic */}
            <div>
              <label htmlFor="lucky" className="block text-sm font-display font-medium text-parchment-300 mb-1">
                Re-roll Mechanic
              </label>
              <select
                id="lucky"
                value={context.lucky ?? 'none'}
                onChange={(e) => handleChange('lucky', e.target.value)}
                className="dnd-input font-body text-sm"
              >
                <option value="none">None</option>
                <option value="halfling">Halfling Lucky (reroll 1s)</option>
                <option value="lucky_feat">Lucky Feat (reroll misses)</option>
              </select>
            </div>

            {/* Elemental Adept — allows resistance bypass for one damage type */}
            <div className="md:col-span-2">
              <label htmlFor="elemental_adept_type" className="block text-sm font-display font-medium text-parchment-300 mb-1">
                Elemental Adept — Damage Type
                <span className="ml-2 font-body font-normal text-xs text-smoke-400">(bypasses resistance)</span>
              </label>
              <select
                id="elemental_adept_type"
                value={context.elemental_adept_type ?? ''}
                onChange={(e) => handleChange('elemental_adept_type', e.target.value || null)}
                className="dnd-input font-body text-sm"
              >
                <option value="">— None —</option>
                {DAMAGE_TYPES.map((dt) => (
                  <option key={dt} value={dt}>
                    {dt.charAt(0).toUpperCase() + dt.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            {/* Save Penalty Die — Mind Sliver / Bane / Synaptic Static */}
            {showSave && (
              <div className="md:col-span-2">
                <label htmlFor="save_penalty_die" className="block text-sm font-display font-medium text-parchment-300 mb-1">
                  Saving Throw Penalty Die
                  <span className="ml-2 font-body font-normal text-xs text-smoke-400">(Mind Sliver / Bane / Synaptic Static)</span>
                </label>
                <select
                  id="save_penalty_die"
                  value={context.save_penalty_die ?? 'none'}
                  onChange={(e) => handleChange('save_penalty_die', e.target.value)}
                  className="dnd-input font-body text-sm"
                >
                  <option value="none">None</option>
                  <option value="d4">−1d4 (avg −2.5) — Mind Sliver / Bane</option>
                  <option value="d6">−1d6 (avg −3.5) — Synaptic Static</option>
                  <option value="d8">−1d8 (avg −4.5)</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalysisContextForm;

