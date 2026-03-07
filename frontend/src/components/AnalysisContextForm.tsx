/**
 * Analysis Context Form Component
 */
import type { AnalysisContext } from '../types/api';

interface AnalysisContextFormProps {
  context: AnalysisContext;
  onChange: (context: AnalysisContext) => void;
}

export function AnalysisContextForm({ context, onChange }: AnalysisContextFormProps) {
  const handleChange = (field: keyof AnalysisContext, value: any) => {
    onChange({ ...context, [field]: value });
  };

  return (
    <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
      <h3 className="font-semibold text-gray-900 mb-3">Combat Parameters</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="target_ac" className="block text-sm font-medium text-gray-700 mb-1">
            Target AC
          </label>
          <input
            type="number"
            id="target_ac"
            value={context.target_ac ?? ''}
            onChange={(e) => handleChange('target_ac', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="15"
            min="1"
            max="30"
          />
        </div>

        <div>
          <label htmlFor="caster_attack_bonus" className="block text-sm font-medium text-gray-700 mb-1">
            Spell Attack Bonus
          </label>
          <input
            type="number"
            id="caster_attack_bonus"
            value={context.caster_attack_bonus ?? ''}
            onChange={(e) => handleChange('caster_attack_bonus', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="+5"
          />
        </div>

        <div>
          <label htmlFor="spell_save_dc" className="block text-sm font-medium text-gray-700 mb-1">
            Spell Save DC
          </label>
          <input
            type="number"
            id="spell_save_dc"
            value={context.spell_save_dc ?? ''}
            onChange={(e) => handleChange('spell_save_dc', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="15"
            min="1"
            max="30"
          />
        </div>

        <div>
          <label htmlFor="target_save_bonus" className="block text-sm font-medium text-gray-700 mb-1">
            Target Save Bonus
          </label>
          <input
            type="number"
            id="target_save_bonus"
            value={context.target_save_bonus ?? ''}
            onChange={(e) => handleChange('target_save_bonus', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="0"
            min="-5"
            max="15"
          />
        </div>

        <div>
          <label htmlFor="number_of_targets" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Targets
          </label>
          <input
            type="number"
            id="number_of_targets"
            value={context.number_of_targets ?? 1}
            onChange={(e) => handleChange('number_of_targets', e.target.value ? parseInt(e.target.value) : 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="1"
            min="1"
            max="20"
          />
        </div>

        <div>
          <label htmlFor="spell_slot_level" className="block text-sm font-medium text-gray-700 mb-1">
            Spell Slot Level
          </label>
          <select
            id="spell_slot_level"
            value={context.spell_slot_level ?? 1}
            onChange={(e) => handleChange('spell_slot_level', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
              <option key={l} value={l}>Level {l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="adv_disadv" className="block text-sm font-medium text-gray-700 mb-1">
          Advantage / Disadvantage
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="normal">Normal</option>
          <option value="advantage">Advantage</option>
          <option value="disadvantage">Disadvantage</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={context.crit_enabled ?? true}
            onChange={(e) => handleChange('crit_enabled', e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Crits enabled</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={context.half_damage_on_save ?? true}
            onChange={(e) => handleChange('half_damage_on_save', e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Half damage on successful save</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={context.evasion_enabled ?? false}
            onChange={(e) => handleChange('evasion_enabled', e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <span className="text-sm font-medium text-gray-700">Target has Evasion</span>
        </label>
      </div>
    </div>
  );
}

export default AnalysisContextForm;
