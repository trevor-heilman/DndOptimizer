/**
 * Analysis Context Form Component
 */
import type { AnalysisContext, Spell } from '../types/api';

interface AnalysisContextFormProps {
  context: AnalysisContext;
  onChange: (context: AnalysisContext) => void;
  /** If provided, only show inputs relevant to these spells (attack or save). */
  spells?: Spell[];
}

export function AnalysisContextForm({ context, onChange, spells }: AnalysisContextFormProps) {
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
  // Always show at least one group so the form is never empty for non-damage spells.
  const showBoth = showAttack && showSave;

  return (
    <div className="space-y-4">
      <h3 className="dnd-section-title text-lg flex items-center gap-2">
        <span aria-hidden="true">⚔️</span> Combat Parameters
      </h3>

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
        {isCantrip ? (
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
        ) : (
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
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
        {[
          { id: 'crit_enabled', label: 'Crits enabled', key: 'crit_enabled', default: true },
          { id: 'half_dmg', label: 'Half damage on save', key: 'half_damage_on_save', default: true },
          { id: 'evasion', label: 'Target has Evasion', key: 'evasion_enabled', default: false },
        ].map(({ id, label, key, default: def }) => (
          <label key={id} className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              id={id}
              checked={(context as any)[key] ?? def}
              onChange={(e) => handleChange(key as keyof AnalysisContext, e.target.checked)}
              className="w-4 h-4 rounded accent-gold-500"
            />
            <span className="font-body text-sm text-parchment-300 group-hover:text-parchment-200 transition-colors">
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default AnalysisContextForm;
