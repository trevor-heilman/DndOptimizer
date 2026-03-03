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
            value={context.target_ac || ''}
            onChange={(e) => handleChange('target_ac', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="15"
            min="1"
            max="30"
          />
        </div>

        <div>
          <label htmlFor="spell_attack_bonus" className="block text-sm font-medium text-gray-700 mb-1">
            Spell Attack Bonus
          </label>
          <input
            type="number"
            id="spell_attack_bonus"
            value={context.caster_spell_attack_bonus || ''}
            onChange={(e) => handleChange('caster_spell_attack_bonus', e.target.value ? parseInt(e.target.value) : undefined)}
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
            value={context.caster_spell_save_dc || ''}
            onChange={(e) => handleChange('caster_spell_save_dc', e.target.value ? parseInt(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="15"
            min="1"
            max="30"
          />
        </div>

        <div>
          <label htmlFor="num_targets" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Targets
          </label>
          <input
            type="number"
            id="num_targets"
            value={context.num_targets || 1}
            onChange={(e) => handleChange('num_targets', e.target.value ? parseInt(e.target.value) : 1)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="1"
            min="1"
            max="20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="advantage_disadvantage" className="block text-sm font-medium text-gray-700 mb-1">
          Advantage/Disadvantage
        </label>
        <select
          id="advantage_disadvantage"
          value={context.advantage_disadvantage || 'normal'}
          onChange={(e) => handleChange('advantage_disadvantage', e.target.value as 'normal' | 'advantage' | 'disadvantage')}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="normal">Normal</option>
          <option value="advantage">Advantage</option>
          <option value="disadvantage">Disadvantage</option>
        </select>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
        <strong>Note:</strong> For saving throw spells, enter the target's save bonus (e.g., STR +2, DEX +5). 
        Format: <code className="bg-blue-100 px-1 rounded">{`{"str": 2, "dex": 5, "con": 3}`}</code>
      </div>
    </div>
  );
}

export default AnalysisContextForm;
