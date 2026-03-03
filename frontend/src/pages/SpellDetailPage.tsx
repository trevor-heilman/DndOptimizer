/**
 * Spell Detail Page
 */
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSpell } from '../hooks/useSpells';
import { DamageChart } from '../components/DamageChart';

export function SpellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spell, isLoading, error } = useSpell(id!);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !spell) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-red-800 mb-2">Spell Not Found</h2>
        <p className="text-red-700 mb-4">The spell you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/spells')}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Back to Spells
        </button>
      </div>
    );
  }

  const levelText = spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`;
  const schoolText = spell.school.charAt(0).toUpperCase() + spell.school.slice(1);
  
  // Calculate average damage
  const totalAverageDamage = spell.damage_components?.reduce((sum, dc) => {
    const dicAvg = dc.dice_count * ((dc.die_size + 1) / 2);
    return sum + dicAvg + (dc.flat_modifier || 0);
  }, 0) || 0;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/spells"
          className="text-primary-600 hover:text-primary-700 text-sm mb-2 inline-block"
        >
          ← Back to Spells
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{spell.name}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full font-medium">
                {levelText}
              </span>
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                {schoolText}
              </span>
              {spell.concentration && (
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                  Concentration
                </span>
              )}
              {spell.ritual && (
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                  Ritual
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Casting Time</div>
          <div className="text-lg font-semibold text-gray-900">{spell.casting_time}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Range</div>
          <div className="text-lg font-semibold text-gray-900">{spell.range}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Duration</div>
          <div className="text-lg font-semibold text-gray-900">{spell.duration}</div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Description</h2>
        <p className="text-gray-700 whitespace-pre-line">{spell.description}</p>
        
        {spell.higher_level && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">At Higher Levels</h3>
            <p className="text-gray-700 whitespace-pre-line">{spell.higher_level}</p>
          </div>
        )}
      </div>

      {/* Spell Type */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-3">Spell Mechanics</h2>
        <div className="space-y-3">
          {spell.is_attack_roll && (
            <div className="flex items-center gap-2">
              <span className="w-32 text-sm font-medium text-gray-600">Type:</span>
              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm">
                Attack Roll
              </span>
            </div>
          )}
          
          {spell.is_saving_throw && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-32 text-sm font-medium text-gray-600">Type:</span>
                <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                  Saving Throw
                </span>
              </div>
              {spell.save_type && (
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-medium text-gray-600">Save Type:</span>
                  <span className="text-gray-900 font-semibold">{spell.save_type}</span>
                </div>
              )}
              {spell.half_damage_on_save && (
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-medium text-gray-600">On Success:</span>
                  <span className="text-gray-700">Half damage</span>
                </div>
              )}
            </>
          )}
          
          {spell.upcast_dice_increment && spell.upcast_die_size && (
            <div className="flex items-center gap-2">
              <span className="w-32 text-sm font-medium text-gray-600">Upcast Bonus:</span>
              <span className="text-gray-900">
                +{spell.upcast_dice_increment}d{spell.upcast_die_size} per level
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Damage Components */}
      {spell.damage_components && spell.damage_components.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Damage Components
              <span className="ml-2 text-sm font-normal text-gray-600">
                (Average: {totalAverageDamage.toFixed(1)} damage)
              </span>
            </h2>
            <div className="space-y-3">
              {spell.damage_components.map((dc, index) => {
                const avgDamage = dc.dice_count * ((dc.die_size + 1) / 2) + (dc.flat_modifier || 0);
                const maxDamage = dc.dice_count * dc.die_size + (dc.flat_modifier || 0);
                const minDamage = dc.dice_count + (dc.flat_modifier || 0);
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {dc.dice_count}d{dc.die_size}
                        {dc.flat_modifier ? ` + ${dc.flat_modifier}` : ''}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900 capitalize">
                          {dc.damage_type}
                        </div>
                        <div className="text-xs text-gray-600 capitalize">
                          {dc.timing.replace(/_/g, ' ')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-900">
                        Avg: <span className="font-semibold">{avgDamage.toFixed(1)}</span>
                      </div>
                      <div className="text-gray-600">
                        {minDamage}-{maxDamage}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Damage Chart */}
          <DamageChart damageComponents={spell.damage_components} title="Damage Distribution" />
        </>
      )}

      {/* Parsing Metadata */}
      {spell.parsing_metadata && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Parsing Information</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-32 text-sm font-medium text-gray-600">Confidence:</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        spell.parsing_metadata.parsing_confidence >= 0.7
                          ? 'bg-green-500'
                          : spell.parsing_metadata.parsing_confidence >= 0.5
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${spell.parsing_metadata.parsing_confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 w-12">
                    {(spell.parsing_metadata.parsing_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            
            {spell.parsing_metadata.requires_review && (
              <div className="flex items-center gap-2 mt-2">
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                  Requires Review
                </span>
                {!spell.parsing_metadata.is_reviewed && (
                  <span className="text-sm text-gray-600">Not yet reviewed</span>
                )}
              </div>
            )}
            
            {spell.parsing_metadata.is_reviewed && spell.parsing_metadata.reviewed_at && (
              <div className="flex items-center gap-2">
                <span className="w-32 text-sm font-medium text-gray-600">Reviewed:</span>
                <span className="text-sm text-gray-700">
                  {new Date(spell.parsing_metadata.reviewed_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <Link
          to={`/compare?spell1=${spell.id}`}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
        >
          Compare This Spell
        </Link>
        <button
          onClick={() => navigate('/spells')}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
        >
          Back to List
        </button>
      </div>
    </div>
  );
}

export default SpellDetailPage;
