/**
 * Spell Detail Page
 */
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSpell, useDuplicateSpell, useDeleteSpell } from '../hooks/useSpells';
import { useAnalyzeSpell, useGetSpellEfficiency } from '../hooks/useAnalysis';
import { DamageChart } from '../components/DamageChart';
import { AnalysisContextForm } from '../components/AnalysisContextForm';
import { EfficiencyChart } from '../components/EfficiencyChart';
import { LoadingSpinner, AlertMessage } from '../components/ui';
import { CreateSpellModal } from '../components/CreateSpellModal';
import { useAuth } from '../contexts/AuthContext';
import type { AnalysisContext } from '../types/api';

export function SpellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: spell, isLoading, error } = useSpell(id!);
  const { user } = useAuth();
  const duplicateSpell = useDuplicateSpell();
  const deleteSpell = useDeleteSpell();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canEdit = !!user && (user.is_staff || (spell?.created_by != null && spell.created_by === user.id));

  const handleDuplicate = async () => {
    if (!spell) return;
    const copy = await duplicateSpell.mutateAsync(spell.id);
    navigate(`/spells/${copy.id}`);
  };

  const handleDelete = async () => {
    if (!spell) return;
    await deleteSpell.mutateAsync(spell.id);
    navigate('/spells');
  };

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
          <button onClick={() => navigate(-1)} className="btn-secondary">Back to Spells</button>
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
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/spells" className="font-display text-gold-700 hover:text-gold-500 text-xs uppercase tracking-widest mb-4 inline-flex items-center gap-1 transition-colors" onClick={(e) => { e.preventDefault(); navigate(-1); }}>
          ← Back to Spells
        </Link>
        <div className="flex items-start justify-between gap-4 mt-3 mb-3">
          <h1 className="font-display text-4xl font-extrabold tracking-wide text-gold-300">{spell.name}</h1>
          {user && (
            <div className="flex shrink-0 gap-2 mt-1">
              {canEdit && (
                <button onClick={() => setShowEdit(true)} className="btn-secondary text-sm">✎ Edit</button>
              )}
              {canEdit && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteSpell.isPending}
                  className="text-sm px-3 py-1.5 rounded-md border border-crimson-800 text-crimson-400 hover:bg-crimson-950 hover:border-crimson-700 transition-colors font-display disabled:opacity-50"
                >
                  {deleteSpell.isPending ? 'Deleting…' : '🗑 Delete'}
                </button>
              )}
              <button onClick={handleDuplicate} disabled={duplicateSpell.isPending} className="btn-secondary text-sm disabled:opacity-50">
                {duplicateSpell.isPending ? 'Duplicating…' : '⎘ Duplicate'}
              </button>
            </div>
          )}
        </div>
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
          {spell.tags && spell.tags.map((tag) => {
            const TAG_STYLES: Record<string, { bg: string; color: string }> = {
              damage:        { bg: '#450a0a55', color: '#fca5a5' },
              healing:       { bg: '#052e1655', color: '#86efac' },
              aoe:           { bg: '#3c200555', color: '#fdba74' },
              crowd_control: { bg: '#2e1a5f55', color: '#c4b5fd' },
              summoning:     { bg: '#0c1a3355', color: '#93c5fd' },
              buff:          { bg: '#3d2a0a55', color: '#fde68a' },
              debuff:        { bg: '#1a0a2e55', color: '#d8b4fe' },
              utility:       { bg: '#1e1e2e55', color: '#94a3b8' },
            };
            const style = TAG_STYLES[tag] ?? TAG_STYLES.utility;
            const label = tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <span key={tag} className="font-display text-sm px-3 py-1 rounded"
                    style={{ background: style.bg, color: style.color, border: `1px solid ${style.color}33` }}>
                {label}
              </span>
            );
          })}
        </div>
        {/* Arcane divider */}
        <div className="flex items-center gap-3 mt-4 mb-5 select-none" aria-hidden="true">
          <div className="h-px flex-1" style={{ background: 'linear-gradient(to right, transparent, rgba(180,83,9,0.45))' }} />
          <span className="text-gold-800 text-xs">✦</span>
          <div className="h-px w-16" style={{ background: 'rgba(180,83,9,0.2)' }} />
        </div>
      </div>

      {/* Two-column body: left = spell info, right = stats + charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 xl:gap-6 xl:items-start">

      {/* Left column: description, mechanics, damage info */}
      <div className="min-w-0">

      {/* Description */}
      <div className="rounded-xl p-6 mb-5"
        style={{ background: 'linear-gradient(155deg, #0e0b18 0%, #12101e 100%)', border: '1px solid rgba(109,40,217,0.15)', borderLeft: '3px solid rgba(109,40,217,0.5)' }}>
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
      <div className="rounded-xl p-6 mb-5"
        style={{ background: 'linear-gradient(155deg, #0e0b18 0%, #12101e 100%)', border: '1px solid rgba(109,40,217,0.15)', borderLeft: '3px solid rgba(109,40,217,0.5)' }}>
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
            spell.level === 0 ? (
              <div className="flex items-center gap-2">
                <span className="shrink-0 w-32 text-sm font-display font-medium text-smoke-400">Cantrip Scaling</span>
                <span className="text-sm text-parchment-300">Scales at character levels 5, 11, and 17</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-32 text-sm font-display font-medium text-smoke-400">Upcast Bonus:</span>
                <span className="text-parchment-100">
                  +{spell.upcast_dice_increment}d{spell.upcast_die_size}{' '}
                  per slot level above {spell.upcast_base_level ?? spell.level}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Damage Components */}
      {spell.damage_components && spell.damage_components.length > 0 && (
          <div className="rounded-xl p-6 mb-5"
            style={{ background: 'linear-gradient(155deg, #0e0b18 0%, #12101e 100%)', border: '1px solid rgba(109,40,217,0.15)', borderLeft: '3px solid rgba(109,40,217,0.5)' }}>
            <h2 className="dnd-section-title text-xl mb-1">Damage Components</h2>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-4">
              <span className="font-body text-sm text-smoke-400">
                Average: <span className="text-gold-400 font-semibold">{totalAverageDamage.toFixed(1)}</span> damage
              </span>
              {spell.damage_components.map((dc, index) => (
                <span key={index} className="font-body text-xs px-2 py-0.5 rounded bg-smoke-700 text-parchment-300 capitalize">
                  {dc.dice_count}d{dc.die_size}{dc.flat_modifier ? ` + ${dc.flat_modifier}` : ''} {dc.damage_type}
                  <span className="text-smoke-500 ml-1">· {dc.timing.replace(/_/g, ' ')}</span>
                </span>
              ))}
              {spell.level === 0 && (
                <span className="text-xs bg-smoke-700 text-parchment-400 px-2 py-0.5 rounded">
                  ⚠ Cantrip — scales at levels 5, 11, 17
                </span>
              )}
            </div>

            {/* Per-level damage breakdown */}
            {spell.upcast_dice_increment && spell.upcast_die_size && (
              <div className="mt-4 border-t border-smoke-700 pt-4">
                <h3 className="font-display text-sm font-semibold text-smoke-300 uppercase tracking-wide mb-3">
                  {spell.level === 0 ? 'Damage by Character Level' : 'Damage by Spell Slot'}
                </h3>
                {spell.level === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'Levels 1–4',   tier: 1 },
                      { label: 'Levels 5–10',  tier: 2 },
                      { label: 'Levels 11–16', tier: 3 },
                      { label: 'Level 17+',    tier: 4 },
                    ].map(({ label, tier }) => {
                      const dice = tier * spell.upcast_dice_increment!;
                      const avg  = dice * (spell.upcast_die_size! + 1) / 2;
                      const max  = dice * spell.upcast_die_size!;
                      return (
                        <div key={tier} className="bg-smoke-800 rounded-lg p-3 border border-smoke-700 text-center">
                          <div className="font-body text-xs text-smoke-400 mb-1">{label}</div>
                          <div className="font-display text-lg font-bold text-parchment-100">{dice}d{spell.upcast_die_size}</div>
                          <div className="font-body text-xs mt-0.5">
                            avg <span className="text-gold-400 font-semibold">{avg.toFixed(1)}</span>
                            <span className="text-smoke-500 ml-1">({dice}–{max})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm font-body">
                      <thead>
                        <tr className="border-b border-smoke-700 text-xs text-smoke-400">
                          <th className="text-left py-1.5 pr-6 font-display">Slot</th>
                          <th className="text-left py-1.5 pr-4 font-display">Bonus Dice</th>
                          <th className="text-right py-1.5 pr-4 font-display">Avg</th>
                          <th className="text-right py-1.5 font-display">Range</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          // Pre-sum base damage across all components once
                          let baseMin = 0, baseAvg = 0, baseMax = 0;
                          for (const dc of spell.damage_components) {
                            baseMin += dc.dice_count + (dc.flat_modifier ?? 0);
                            baseAvg += dc.dice_count * (dc.die_size + 1) / 2 + (dc.flat_modifier ?? 0);
                            baseMax += dc.dice_count * dc.die_size + (dc.flat_modifier ?? 0);
                          }
                          const upcastBase = spell.upcast_base_level ?? spell.level;
                          return Array.from({ length: 10 - spell.level }, (_, i) => {
                            const slot      = spell.level + i;
                            const extraDice = slot > upcastBase ? (slot - upcastBase) * spell.upcast_dice_increment! : 0;
                            const extraAvg  = extraDice * (spell.upcast_die_size! + 1) / 2;
                            const finalMin  = Math.round(baseMin + extraDice);
                            const finalAvg  = baseAvg + extraAvg;
                            const finalMax  = Math.round(baseMax + extraDice * spell.upcast_die_size!);
                            const isBase    = slot === spell.level;
                            return (
                              <tr key={slot} className="border-b border-smoke-800 hover:bg-smoke-800/40">
                                <td className="py-1.5 pr-6">
                                  {isBase
                                    ? <span className="text-gold-400 font-semibold">Slot {slot} <span className="text-xs text-smoke-400 font-normal">(base)</span></span>
                                    : <span className="text-parchment-300">Slot {slot}</span>
                                  }
                                </td>
                                <td className="py-1.5 pr-4 text-smoke-400 text-xs">
                                  {extraDice > 0 ? <span className="text-gold-500">+{extraDice}d{spell.upcast_die_size}</span> : '—'}
                                </td>
                                <td className="py-1.5 pr-4 text-right font-semibold text-gold-400">{finalAvg.toFixed(1)}</td>
                                <td className="py-1.5 text-right text-smoke-400">{finalMin}–{finalMax}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
      )}

      </div>{/* end left col */}

      {/* Right column: stat cards + chart */}
      <div className="min-w-0 mt-6 xl:mt-0">

      {/* Stat Cards — stacked vertically */}
      <div className="flex flex-col gap-3 mb-5">
        {[
          { label: 'Casting Time', value: spell.casting_time, icon: '⏱' },
          { label: 'Range',        value: spell.range,        icon: '⊕' },
          { label: 'Duration',     value: spell.duration,     icon: '⧗' },
        ].map(({ label, value, icon }) => (
          <div key={label} className="rounded-lg px-5 py-3 flex items-center justify-between"
            style={{ background: 'linear-gradient(145deg, #0e0a18 0%, #120d22 100%)', border: '1px solid rgba(109,40,217,0.18)', borderTop: '2px solid rgba(109,40,217,0.4)' }}>
            <div className="font-display text-[10px] text-gold-400 uppercase tracking-widest">{icon} {label}</div>
            <div className="font-body text-base font-semibold text-gold-300">{value}</div>
          </div>
        ))}
      </div>

      {/* Damage Distribution */}
      {spell.damage_components && spell.damage_components.length > 0 && (
        <div className="mb-5">
          <DamageChart damageComponents={spell.damage_components} spell={spell} title="Damage Distribution" />
        </div>
      )}

      </div>{/* end right col */}
      </div>{/* end 2-col grid */}

      {/* Expected Damage Analysis — full width below the two-column split */}
      {(spell.is_attack_roll || spell.is_saving_throw || spell.is_auto_hit) &&
        spell.damage_components &&
        spell.damage_components.length > 0 && (
          <div className="mt-6 rounded-xl p-6"
            style={{ background: 'linear-gradient(155deg, #130408 0%, #1a0510 100%)', border: '1px solid rgba(190,18,60,0.2)', borderLeft: '3px solid rgba(190,18,60,0.55)' }}>
            <h2 className="dnd-section-title text-xl mb-4">Expected Damage Analysis</h2>
            <div className="xl:grid xl:grid-cols-2 xl:gap-8">
              <div>
                <AnalysisContextForm context={analysisContext} onChange={setAnalysisContext} spells={spell ? [spell] : []} />

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
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    <div className="rounded-lg p-4 text-center"
                         style={{ background: 'linear-gradient(145deg, #0e0a18 0%, #120d22 100%)', border: '1px solid rgba(109,40,217,0.18)' }}>
                      <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">Type</div>
                      <div className="font-body font-semibold text-parchment-200 capitalize">
                        {analyzeSpell.data.results.spell_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                    <div className="rounded-lg p-4 text-center"
                         style={{ background: 'linear-gradient(145deg, #0e0a18 0%, #120d22 100%)', border: '1px solid rgba(109,40,217,0.18)', borderTop: '2px solid rgba(217,162,31,0.5)' }}>
                      <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">Expected Damage</div>
                      <div className="font-display text-2xl font-bold text-gold-400">
                        {analyzeSpell.data.results.expected_damage.toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-lg p-4 text-center"
                         style={{ background: 'linear-gradient(145deg, #0e0a18 0%, #120d22 100%)', border: '1px solid rgba(109,40,217,0.18)' }}>
                      <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">Efficiency</div>
                      <div className="font-display text-xl font-bold text-parchment-100">
                        {analyzeSpell.data.results.efficiency.toFixed(2)}
                      </div>
                      <div className="font-body text-xs text-smoke-400">dmg / slot level</div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                {getEfficiency.isError && (
                  <div className="mt-4 xl:mt-0">
                    <AlertMessage variant="error" message="Could not load efficiency data for this spell." />
                  </div>
                )}

                {getEfficiency.data && (
                  <div className="mt-6 xl:mt-0">
                    <EfficiencyChart
                      data={getEfficiency.data.efficiency_by_slot}
                      spellName={spell.name}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Action Buttons */}
      <div className="mt-6 flex gap-3">
        <Link to={`/compare?spell1=${spell.id}`} className="btn-gold px-6 py-2.5">
          ⚖️ Compare This Spell
        </Link>
        <button onClick={() => navigate(-1)} className="btn-secondary px-6 py-2.5">
          ← Back to List
        </button>
      </div>

      {/* Edit Spell Modal */}
      <CreateSpellModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        spellToEdit={spell}
      />

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="dnd-card max-w-sm w-full p-6 border-l-4 border-crimson-700">
            <h3 className="font-display text-xl font-semibold text-crimson-400 mb-2">Delete Spell?</h3>
            <p className="font-body text-parchment-300 text-sm mb-6">
              <span className="font-semibold text-parchment-100">{spell.name}</span> will be permanently deleted. This cannot be undone.
            </p>
            {deleteSpell.isError && (
              <p className="font-body text-crimson-400 text-sm mb-4">Failed to delete spell. Please try again.</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleteSpell.isPending}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteSpell.isPending}
                className="text-sm px-4 py-2 rounded-md border border-crimson-700 bg-crimson-950 text-crimson-300 hover:bg-crimson-900 transition-colors font-display disabled:opacity-50"
              >
                {deleteSpell.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpellDetailPage;
