/**
 * Spell Detail Page
 */
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSpell } from '../hooks/useSpells';
import { useAnalyzeSpell, useGetSpellEfficiency } from '../hooks/useAnalysis';
import { DamageChart } from '../components/DamageChart';
import { AnalysisContextForm } from '../components/AnalysisContextForm';
import { EfficiencyChart } from '../components/EfficiencyChart';
import { LoadingSpinner, AlertMessage } from '../components/ui';
import type { AnalysisContext } from '../types/api';

export function SpellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spell, isLoading, error } = useSpell(id!);
  const analyzeSpell = useAnalyzeSpell();
  const getEfficiency = useGetSpellEfficiency();
  const [analysisContext, setAnalysisContext] = useState<AnalysisContext>({
    target_ac: 15,
    caster_attack_bonus: 5,
    spell_save_dc: 15,
    target_save_bonus: 0,
    number_of_targets: 1,
    advantage: false,
    disadvantage: false,
    spell_slot_level: 1,
    crit_enabled: true,
    half_damage_on_save: true,
    evasion_enabled: false,
  });

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error || !spell) {
    return (
      <div>
        <AlertMessage variant="error" title="Spell Not Found" message="The spell you're looking for doesn't exist." />
        <div className="mt-4">
          <button onClick={() => navigate('/spells')} className="btn-secondary">Back to Spells</button>
        </div>
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
        <Link to="/spells" className="font-body text-gold-500 hover:text-gold-400 text-sm mb-3 inline-flex items-center gap-1 transition-colors">
          ← Back to Spells
        </Link>
        <h1 className="font-display text-4xl font-bold text-gold-300 mb-3">{spell.name}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm px-3 py-1 rounded"
                style={{ background: '#2a2a35', color: '#fbbf24', border: '1px solid #4b4b58' }}>
            {levelText}
          </span>
          <span className="font-display text-sm px-3 py-1 rounded"
                style={{ background: '#2e1a5f44', color: '#c4b5fd', border: '1px solid #4c1d9544' }}>
            {schoolText}
          </span>
          {spell.concentration && (
            <span className="font-display text-sm px-3 py-1 rounded"
                  style={{ background: '#3d2a0a55', color: '#fcd34d', border: '1px solid #78350f' }}>
              ◎ Concentration
            </span>
          )}
          {spell.ritual && (
            <span className="font-display text-sm px-3 py-1 rounded"
                  style={{ background: '#2e1a5f44', color: '#c4b5fd', border: '1px solid #4c1d9544' }}>
              Ritual
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: '⏱ Casting Time', value: spell.casting_time },
          { label: '⊕ Range', value: spell.range },
          { label: '⧗ Duration', value: spell.duration },
        ].map(({ label, value }) => (
          <div key={label} className="dnd-card p-4 border-t-2 border-gold-800/60">
            <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">{label}</div>
            <div className="font-body text-lg font-semibold text-parchment-100">{value}</div>
          </div>
        ))}
      </div>

      {/* Description */}
      <div className="dnd-card p-6 mb-6">
        <h2 className="dnd-section-title text-xl mb-3">Description</h2>
        <p className="font-body text-parchment-200 whitespace-pre-line leading-relaxed">{spell.description}</p>
        {spell.higher_level && (
          <div className="mt-5 pt-4 border-t border-smoke-700">
            <h3 className="font-display text-sm font-semibold text-gold-500 mb-2">At Higher Levels</h3>
            <p className="font-body text-parchment-300 whitespace-pre-line leading-relaxed">{spell.higher_level}</p>
          </div>
        )}
      </div>

      {/* Spell Mechanics */}
      <div className="dnd-card p-6 mb-6">
        <h2 className="dnd-section-title text-xl mb-3">Spell Mechanics</h2>
        <div className="space-y-3 font-body">
          {spell.is_attack_roll && (
            <div className="flex items-center gap-2">
              <span className="w-32 text-sm font-display font-medium text-smoke-400">Type:</span>
              <span className="text-sm px-3 py-1 rounded"
                    style={{ background: '#450a0a', color: '#fca5a5', border: '1px solid #7f1d1d44' }}>
                ⚔ Attack Roll
              </span>
            </div>
          )}
          {spell.is_saving_throw && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-32 text-sm font-display font-medium text-smoke-400">Type:</span>
                <span className="text-sm px-3 py-1 rounded"
                      style={{ background: '#422006', color: '#fdba74', border: '1px solid #9a3412' }}>🛡 Saving Throw</span>
              </div>
              {spell.save_type && (
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-display font-medium text-smoke-400">Save Type:</span>
                  <span className="text-parchment-100 font-semibold">{spell.save_type}</span>
                </div>
              )}
              {spell.half_damage_on_save && (
                <div className="flex items-center gap-2">
                  <span className="w-32 text-sm font-display font-medium text-smoke-400">On Success:</span>
                  <span className="text-parchment-300">Half damage</span>
                </div>
              )}
            </>
          )}
          {spell.upcast_dice_increment && spell.upcast_die_size && (
            <div className="flex items-center gap-2">
              <span className="w-32 text-sm font-display font-medium text-smoke-400">Upcast Bonus:</span>
              <span className="text-parchment-100">
                +{spell.upcast_dice_increment}d{spell.upcast_die_size} per level
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Damage Components */}
      {spell.damage_components && spell.damage_components.length > 0 && (
        <>
          <div className="dnd-card p-6 mb-6">
            <h2 className="dnd-section-title text-xl mb-1">Damage Components</h2>
            <p className="font-body text-sm text-smoke-400 mb-4">
              Average: <span className="text-gold-400 font-semibold">{totalAverageDamage.toFixed(1)}</span> damage
            </p>
            <div className="space-y-3">
              {spell.damage_components.map((dc, index) => {
                const avgDamage = dc.dice_count * ((dc.die_size + 1) / 2) + (dc.flat_modifier || 0);
                const maxDamage = dc.dice_count * dc.die_size + (dc.flat_modifier || 0);
                const minDamage = dc.dice_count + (dc.flat_modifier || 0);
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-smoke-800 rounded-lg border border-smoke-700">
                    <div className="flex items-center gap-4">
                      <div className="font-display text-2xl font-bold text-parchment-100">
                        {dc.dice_count}d{dc.die_size}
                        {dc.flat_modifier ? ` + ${dc.flat_modifier}` : ''}
                      </div>
                      <div>
                        <div className="font-display text-sm font-semibold text-parchment-200 capitalize">{dc.damage_type}</div>
                        <div className="font-body text-xs text-smoke-400 capitalize">{dc.timing.replace(/_/g, ' ')}</div>
                      </div>
                    </div>
                    <div className="text-right font-body text-sm">
                      <div className="text-parchment-200">Avg: <span className="font-semibold text-gold-400">{avgDamage.toFixed(1)}</span></div>
                      <div className="text-smoke-400">{minDamage}–{maxDamage}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DamageChart damageComponents={spell.damage_components} title="Damage Distribution" />
        </>
      )}

      {/* Live Analysis */}
      {(spell.is_attack_roll || spell.is_saving_throw) &&
        spell.damage_components &&
        spell.damage_components.length > 0 && (
          <div className="dnd-card p-6 mb-6">
            <h2 className="dnd-section-title text-xl mb-4">Expected Damage Analysis</h2>
            <AnalysisContextForm context={analysisContext} onChange={setAnalysisContext} />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() =>
                  analyzeSpell.mutate({ spellId: spell.id, context: { ...analysisContext, spell_slot_level: analysisContext.spell_slot_level ?? (spell.level > 0 ? spell.level : 1) } })
                }
                disabled={analyzeSpell.isPending}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {analyzeSpell.isPending ? 'Analyzing…' : '⚡ Analyze'}
              </button>
              {spell.level > 0 && (
                <button
                  onClick={() =>
                    getEfficiency.mutate({
                      spellId: spell.id,
                      context: analysisContext,
                      minLevel: spell.level,
                      maxLevel: 9,
                    })
                  }
                  disabled={getEfficiency.isPending}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {getEfficiency.isPending ? 'Loading…' : '📈 Upcast Efficiency'}
                </button>
              )}
            </div>

            {analyzeSpell.isError && (
              <div className="mt-4">
                <AlertMessage variant="error" message="Analysis failed. This spell may have no parsed damage components yet." />
              </div>
            )}

            {analyzeSpell.data && (
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="dnd-card p-4 text-center">
                  <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">Type</div>
                  <div className="font-body font-semibold text-parchment-200 capitalize">
                    {analyzeSpell.data.results.type.replace(/_/g, ' ')}
                  </div>
                </div>
                <div className="dnd-card p-4 text-center border-t-2 border-gold-700">
                  <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">Expected Damage</div>
                  <div className="font-display text-2xl font-bold text-gold-400">
                    {analyzeSpell.data.results.expected_damage.toFixed(2)}
                  </div>
                </div>
                <div className="dnd-card p-4 text-center">
                  <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">Efficiency</div>
                  <div className="font-display text-xl font-bold text-parchment-100">
                    {analyzeSpell.data.results.efficiency.toFixed(2)}
                  </div>
                  <div className="font-body text-xs text-smoke-400">dmg / slot level</div>
                </div>
              </div>
            )}

            {getEfficiency.isError && (
              <div className="mt-4">
                <AlertMessage variant="error" message="Could not load efficiency data for this spell." />
              </div>
            )}

            {getEfficiency.data && (
              <div className="mt-6">
                <EfficiencyChart
                  data={getEfficiency.data.efficiency_by_slot}
                  spellName={spell.name}
                />
              </div>
            )}
          </div>
        )}

      {/* Parsing Metadata */}
      {spell.parsing_metadata && (
        <div className="dnd-card p-6">
          <h2 className="dnd-section-title text-xl mb-3">Parsing Information</h2>
          <div className="space-y-2 font-body">
            <div className="flex items-center gap-2">
              <span className="w-32 font-display text-sm font-medium text-smoke-400">Confidence:</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-smoke-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        spell.parsing_metadata.parsing_confidence >= 0.7
                          ? 'bg-green-500'
                          : spell.parsing_metadata.parsing_confidence >= 0.5
                          ? 'bg-gold-500'
                          : 'bg-crimson-500'
                      }`}
                      style={{ width: `${spell.parsing_metadata.parsing_confidence * 100}%` }}
                    />
                  </div>
                  <span className="font-display text-sm font-semibold text-parchment-100 w-12">
                    {(spell.parsing_metadata.parsing_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            {spell.parsing_metadata.requires_review && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm px-3 py-1 rounded"
                      style={{ background: '#3d2a0a55', color: '#fcd34d', border: '1px solid #78350f' }}>
                  Requires Review
                </span>
                {!spell.parsing_metadata.is_reviewed && (
                  <span className="text-sm text-smoke-400 italic">Not yet reviewed</span>
                )}
              </div>
            )}
            
            {spell.parsing_metadata.is_reviewed && spell.parsing_metadata.reviewed_at && (
              <div className="flex items-center gap-2">
                <span className="w-32 font-display text-sm font-medium text-smoke-400">Reviewed:</span>
                <span className="text-sm text-parchment-300">
                  {new Date(spell.parsing_metadata.reviewed_at).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <Link to={`/compare?spell1=${spell.id}`} className="btn-gold px-6 py-2.5">
          ⚖️ Compare This Spell
        </Link>
        <button onClick={() => navigate('/spells')} className="btn-secondary px-6 py-2.5">
          ← Back to List
        </button>
      </div>
    </div>
  );
}

export default SpellDetailPage;
