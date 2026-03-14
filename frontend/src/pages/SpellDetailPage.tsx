/**
 * Spell Detail Page
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useSpell, useDuplicateSpell, useDeleteSpell } from '../hooks/useSpells';
import { useAnalyzeSpell, useGetSpellEfficiency } from '../hooks/useAnalysis';
import { DamageChart } from '../components/DamageChart';
import { AnalysisContextForm } from '../components/AnalysisContextForm';
import { EfficiencyChart } from '../components/EfficiencyChart';
import { HitChanceHeatmap } from '../components/HitChanceHeatmap';
import { LoadingSpinner, AlertMessage } from '../components/ui';
import { CreateSpellModal } from '../components/CreateSpellModal';
import { useAuth } from '../contexts/AuthContext';
import type { AnalysisContext, SummonPerTemplateResult } from '../types/api';

export function SpellDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromSpellbook = (location.state ?? null) as {
    spellbookId?: string;
    spellbookName?: string;
    saveDC?: number;
    atkBonus?: number;
  } | null;
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
    caster_attack_bonus: fromSpellbook?.atkBonus ?? 5,
    spell_save_dc: fromSpellbook?.saveDC ?? 15,
    target_save_bonus: 0,
    number_of_targets: 1,
    advantage: false,
    disadvantage: false,
    spell_slot_level: 1,
    crit_enabled: true,
    half_damage_on_save: true,
    evasion_enabled: false,
    resistance: false,
    crit_type: 'double_dice',
    lucky: 'none',
    elemental_adept_type: null,
    save_penalty_die: 'none',
  });

  // Initialize spell_slot_level to the spell's base level when spell data loads
  useEffect(() => {
    if (spell && spell.level > 0) {
      setAnalysisContext(prev => ({ ...prev, spell_slot_level: spell.level }));
    }
  }, [spell?.id]);

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

  const TIMING_LABEL: Record<string, string> = {
    on_hit: 'on hit',
    on_fail: 'on failed save',
    on_success: 'on save',
    end_of_turn: 'end of turn',
    per_round: 'per round',
    delayed: 'delayed',
  };

  const isDelayedTiming = (timing: string) =>
    timing === 'end_of_turn' || timing === 'per_round' || timing === 'delayed';
  
  // Calculate average damage
  const totalAverageDamage = spell.damage_components?.reduce((sum, dc) => {
    const dicAvg = dc.dice_count * ((dc.die_size + 1) / 2);
    return sum + dicAvg + (dc.flat_modifier || 0);
  }, 0) || 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
      <Link
        to={fromSpellbook?.spellbookId ? `/spellbooks/${fromSpellbook.spellbookId}` : '/spells'}
        className="font-display text-gold-700 hover:text-gold-500 text-xs uppercase tracking-widest mb-4 inline-flex items-center gap-1 transition-colors"
        onClick={(e) => { if (!fromSpellbook?.spellbookId) { e.preventDefault(); navigate(-1); } }}
      >
        {fromSpellbook?.spellbookId
          ? `← Back to ${fromSpellbook.spellbookName ?? 'Spellbook'}`
          : '← Back to Spells'
        }
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
                <span
                  key={index}
                  className={`font-body text-xs px-2 py-0.5 rounded capitalize ${
                    isDelayedTiming(dc.timing)
                      ? 'bg-amber-900/40 text-amber-300 border border-amber-700/40'
                      : 'bg-smoke-700 text-parchment-300'
                  }`}
                >
                  {dc.dice_count}d{dc.die_size}{dc.flat_modifier ? ` + ${dc.flat_modifier}` : ''} {dc.damage_type}
                  <span className={`ml-1 ${isDelayedTiming(dc.timing) ? 'text-amber-500' : 'text-smoke-500'}`}>
                    · {TIMING_LABEL[dc.timing] ?? dc.timing.replace(/_/g, ' ')}
                  </span>
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
          <DamageChart
            damageComponents={spell.damage_components}
            spell={spell}
            title="Damage Distribution"
            selectedSlot={analysisContext.spell_slot_level ?? spell.level}
            onSlotChange={(slot) => setAnalysisContext(prev => ({ ...prev, spell_slot_level: slot }))}
            critType={analysisContext.crit_type}
            resistance={analysisContext.resistance}
            elementalAdeptType={analysisContext.elemental_adept_type ?? null}
          />
        </div>
      )}

      </div>{/* end right col */}
      </div>{/* end 2-col grid */}

      {/* ── Summoning Stat Blocks (TCE-style spells) ──────────────────────── */}
      {spell.summon_templates && spell.summon_templates.length > 0 && (
        <div className="mt-6 rounded-xl p-6"
          style={{ background: 'linear-gradient(155deg, #0a100e 0%, #0d1a12 100%)', border: '1px solid rgba(52,211,153,0.2)', borderLeft: '3px solid rgba(52,211,153,0.5)' }}>
          <h2 className="font-display text-xl font-semibold text-emerald-300 mb-3">🧿 Summoned Creatures</h2>
          <p className="font-body text-sm text-smoke-400 mb-5">
            Each spirit makes <span className="text-parchment-300">⌊slot ÷ 2⌋</span> attacks per round using your spell attack modifier.
            HP, AC, and damage all scale with spell slot level.
          </p>

          {/* ── Embedded Combat Parameters ──────────────────────────────── */}
          <div className="mb-6 rounded-xl p-5"
            style={{ background: '#0e0b18', border: '1px solid rgba(109,40,217,0.2)', borderLeft: '3px solid rgba(109,40,217,0.4)' }}>
            <h3 className="font-display text-sm font-semibold text-smoke-300 uppercase tracking-widest mb-4">⚔️ Combat Parameters</h3>
            <AnalysisContextForm context={analysisContext} onChange={setAnalysisContext} spells={spell ? [spell] : []} />
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={() => {
                  const ctx = { ...analysisContext, spell_slot_level: analysisContext.spell_slot_level ?? spell.level };
                  analyzeSpell.mutate({ spellId: spell.id, context: ctx });
                  getEfficiency.mutate({ spellId: spell.id, context: ctx, minLevel: spell.level, maxLevel: 9 });
                }}
                disabled={analyzeSpell.isPending || getEfficiency.isPending}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {(analyzeSpell.isPending || getEfficiency.isPending) ? 'Analyzing…' : '⚡ Analyze DPR'}
              </button>
            </div>
            {analyzeSpell.isError && (
              <div className="mt-4">
                <AlertMessage variant="error" message="Analysis failed. Check that attack bonus and target AC are set." />
              </div>
            )}
          </div>

          {/* ── DPR Analysis Results ─────────────────────────────────────── */}
          {analyzeSpell.data?.results.spell_type === 'summon' && (() => {
            const { expected_damage, efficiency, math_breakdown: mb } = analyzeSpell.data.results;
            const perTemplate = (mb.per_template ?? []) as SummonPerTemplateResult[];
            return (
              <div className="mb-6 rounded-xl p-5"
                style={{ background: 'linear-gradient(155deg, #130408 0%, #1a0510 100%)', border: '1px solid rgba(190,18,60,0.2)', borderLeft: '3px solid rgba(190,18,60,0.55)' }}>
                <h3 className="dnd-section-title text-base mb-4">📊 DPR Results — Slot {mb.slot_level}</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg p-3 text-center"
                    style={{ background: 'linear-gradient(145deg, #0e0a18 0%, #120d22 100%)', border: '1px solid rgba(109,40,217,0.18)', borderTop: '2px solid rgba(217,162,31,0.5)' }}>
                    <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">Best DPR</div>
                    <div className="font-display text-2xl font-bold text-gold-400">{expected_damage.toFixed(1)}</div>
                    <div className="font-body text-xs text-smoke-500 mt-0.5 truncate">{mb.best_template}</div>
                  </div>
                  <div className="rounded-lg p-3 text-center"
                    style={{ background: 'linear-gradient(145deg, #0e0a18 0%, #120d22 100%)', border: '1px solid rgba(109,40,217,0.18)' }}>
                    <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">Efficiency</div>
                    <div className="font-display text-xl font-bold text-parchment-100">{efficiency.toFixed(2)}</div>
                    <div className="font-body text-xs text-smoke-400">dmg / slot</div>
                  </div>
                  <div className="rounded-lg p-3 text-center"
                    style={{ background: 'linear-gradient(145deg, #0e0a18 0%, #120d22 100%)', border: '1px solid rgba(109,40,217,0.18)' }}>
                    <div className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-1">Hit Chance</div>
                    <div className="font-display text-xl font-bold text-green-400">{((mb.hit_probability ?? 0) * 100).toFixed(0)}%</div>
                    <div className="font-body text-xs text-smoke-400">{mb.num_attacks} atk / round</div>
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  {perTemplate.map((t) => (
                    <div key={t.name} className={`flex items-center justify-between rounded px-3 py-1.5 ${
                      t.name === mb.best_template ? 'bg-emerald-950/50 border border-emerald-700/50' : 'bg-smoke-800/40'
                    }`}>
                      <span className={`font-body text-xs ${t.name === mb.best_template ? 'text-emerald-300 font-semibold' : 'text-parchment-400'}`}>
                        {t.name === mb.best_template ? '★ ' : ''}{t.name}
                      </span>
                      <span className={`font-display text-sm font-bold ${t.name === mb.best_template ? 'text-emerald-400' : 'text-parchment-300'}`}>
                        {t.expected_dpr.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
                {getEfficiency.data && (
                  <EfficiencyChart data={getEfficiency.data.efficiency_by_slot} spellName={spell.name} />
                )}
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {spell.summon_templates.map((tmpl) => {
              const slotForCard = analysisContext.spell_slot_level ?? spell.level;
              const hpAtBase   = tmpl.base_hp + tmpl.hp_per_level * Math.max(0, tmpl.hp_base_level);
              const acAtPreview = tmpl.base_ac + tmpl.ac_per_level * slotForCard;
              const hpAtPreview = tmpl.base_hp + tmpl.hp_per_level * Math.max(0, slotForCard - tmpl.hp_base_level);
              const attacksAtPreview = Math.floor(slotForCard / 2);
              // Per-template DPR + best-template highlight from latest analysis
              const tmplAnalysis = analyzeSpell.data?.results.spell_type === 'summon'
                ? (analyzeSpell.data.results.math_breakdown.per_template as SummonPerTemplateResult[])?.find(t => t.name === tmpl.name)
                : undefined;
              const isBest = analyzeSpell.data?.results.spell_type === 'summon'
                && analyzeSpell.data.results.math_breakdown.best_template === tmpl.name;
              return (
                <div key={tmpl.id} className={`rounded-lg p-4 transition-colors ${
                  isBest ? 'border-2 border-emerald-500/70 bg-emerald-950/20' : 'border border-smoke-700 bg-smoke-900'
                }`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-display text-base font-semibold text-parchment-100 leading-tight">
                      {isBest && <span className="text-emerald-400 mr-1">★</span>}{tmpl.name}
                    </h3>
                    <span className="font-body text-xs text-smoke-400 shrink-0 mt-0.5">{tmpl.source}</span>
                  </div>
                  {tmpl.creature_type && (
                    <p className="font-body text-xs text-smoke-400 italic mb-3">{tmpl.creature_type}</p>
                  )}

                  {/* HP / AC / Attacks / DPR — 4-column stat boxes */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    <div className="bg-smoke-800 rounded p-2 text-center border border-smoke-700">
                      <div className="font-display text-xs text-smoke-400 mb-0.5">HP</div>
                      <div className="font-display text-sm font-bold text-red-400">{hpAtPreview}</div>
                      {tmpl.hp_per_level > 0 && (
                        <div className="font-body text-[10px] text-smoke-500">+{tmpl.hp_per_level}/lvl</div>
                      )}
                    </div>
                    <div className="bg-smoke-800 rounded p-2 text-center border border-smoke-700">
                      <div className="font-display text-xs text-smoke-400 mb-0.5">AC</div>
                      <div className="font-display text-sm font-bold text-blue-400">{acAtPreview}</div>
                      {tmpl.ac_per_level > 0 && (
                        <div className="font-body text-[10px] text-smoke-500">+1/lvl</div>
                      )}
                    </div>
                    <div className="bg-smoke-800 rounded p-2 text-center border border-smoke-700">
                      <div className="font-display text-xs text-smoke-400 mb-0.5">Atk</div>
                      <div className="font-display text-sm font-bold text-gold-400">{attacksAtPreview}</div>
                      <div className="font-body text-[10px] text-smoke-500">⌊lvl÷2⌋</div>
                    </div>
                    <div className={`rounded p-2 text-center border ${
                      tmplAnalysis ? 'bg-emerald-950/50 border-emerald-700' : 'bg-smoke-800 border-smoke-700'
                    }`}>
                      <div className="font-display text-xs text-smoke-400 mb-0.5">DPR</div>
                      {tmplAnalysis ? (
                        <div className="font-display text-sm font-bold text-emerald-400">{tmplAnalysis.expected_dpr.toFixed(1)}</div>
                      ) : (
                        <div className="font-display text-sm text-smoke-600">—</div>
                      )}
                    </div>
                  </div>

                  {/* Attack list */}
                  {tmpl.attacks.length > 0 && (
                    <div className="space-y-2">
                      {tmpl.attacks.map((atk) => {
                        const typeLabel = {
                          melee_weapon: 'Melee',
                          ranged_weapon: 'Ranged',
                          melee_spell: 'Melee Spell',
                          ranged_spell: 'Ranged Spell',
                        }[atk.attack_type] ?? atk.attack_type;
                        const perHitBase = `${atk.dice_count}d${atk.die_size}`;
                        const flatParts: string[] = [];
                        if (atk.flat_modifier > 0) flatParts.push(`+${atk.flat_modifier}`);
                        if (atk.flat_per_level > 0) flatParts.push('+lvl');
                        const secondaryPart = atk.secondary_dice_count > 0
                          ? ` + ${atk.secondary_dice_count}d${atk.secondary_die_size} ${atk.secondary_damage_type}`
                          : '';
                        return (
                          <div key={atk.id} className="bg-smoke-800/60 rounded p-2 border border-smoke-700/50">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-display text-xs font-semibold text-parchment-200">{atk.name}</span>
                              <span className="font-body text-xs text-smoke-400">{typeLabel}</span>
                            </div>
                            <div className="font-body text-xs text-parchment-300 mt-0.5">
                              <span className="text-gold-400 font-mono">{perHitBase}{flatParts.join('')}</span>
                              {' '}<span className="text-smoke-400">{atk.damage_type}</span>
                              {secondaryPart && (
                                <span className="text-smoke-400">{secondaryPart}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <p className="font-body text-[10px] text-smoke-600 mt-2 italic">
                    Slot {slotForCard} — base HP {hpAtBase} (lvl {tmpl.hp_base_level})
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Combat Parameters — full width (damage-component spells; summon spells have embedded params above) */}
      {(spell.is_attack_roll || spell.is_saving_throw || spell.is_auto_hit) &&
        spell.damage_components && spell.damage_components.length > 0 && (
          <>
            <div className="mt-6 rounded-xl p-6"
              style={{ background: 'linear-gradient(155deg, #0e0b18 0%, #130a1e 100%)', border: '1px solid rgba(109,40,217,0.2)', borderLeft: '3px solid rgba(109,40,217,0.5)' }}>
              <h2 className="dnd-section-title text-xl mb-4">⚔️ Combat Parameters</h2>
              <AnalysisContextForm context={analysisContext} onChange={setAnalysisContext} spells={spell ? [spell] : []} />

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    const ctx = { ...analysisContext, spell_slot_level: analysisContext.spell_slot_level ?? (spell.level > 0 ? spell.level : 1) };
                    analyzeSpell.mutate({ spellId: spell.id, context: ctx });
                    if (spell.level > 0) {
                      getEfficiency.mutate({ spellId: spell.id, context: analysisContext, minLevel: spell.level, maxLevel: 9 });
                    }
                  }}
                  disabled={analyzeSpell.isPending || getEfficiency.isPending}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {(analyzeSpell.isPending || getEfficiency.isPending) ? 'Analyzing…' : '⚡ Analyze'}
                </button>
              </div>

              {analyzeSpell.isError && (
                <div className="mt-4">
                  <AlertMessage variant="error" message="Analysis failed. This spell may have no parsed damage components yet." />
                </div>
              )}
            </div>

            {/* Analysis Results — shown after Analyze is clicked */}
            {analyzeSpell.data && (
              <div className="mt-4 rounded-xl p-6"
                style={{ background: 'linear-gradient(155deg, #130408 0%, #1a0510 100%)', border: '1px solid rgba(190,18,60,0.2)', borderLeft: '3px solid rgba(190,18,60,0.55)' }}>
                <h2 className="dnd-section-title text-xl mb-4">📊 Analysis Results</h2>

                {/* Expected Damage + Efficiency stat cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
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

                {/* Math Breakdown + Upcast Efficiency side by side */}
                <div className="xl:grid xl:grid-cols-2 xl:gap-8">
                  <div>
                    {(() => {
                      const { spell_type, math_breakdown: mb, average_damage, expected_damage } = analyzeSpell.data.results;
                      const isAttack = spell_type === 'attack_roll';
                      const isSave = spell_type === 'saving_throw';
                      const isSummon = spell_type === 'summon';
                      if (!isAttack && !isSave && !isSummon) return null;

                      return (
                        <div className="rounded-xl p-5"
                          style={{ background: 'linear-gradient(155deg, #0a0e1a 0%, #0e1222 100%)', border: '1px solid rgba(99,102,241,0.2)', borderLeft: '3px solid rgba(99,102,241,0.5)' }}>
                          <h3 className="dnd-section-title text-base mb-4 flex items-center gap-2">
                            <span aria-hidden="true">📐</span> Math Breakdown
                          </h3>

                          {isSummon && (() => {
                            const perTemplate = (mb.per_template ?? []) as SummonPerTemplateResult[];
                            // Per-card DPR also wired into creature cards via tmplAnalysis above
                            return (
                              <div className="space-y-3 font-body text-sm">
                                {[
                                  { label: 'Hit', color: '#4ade80', prob: mb.hit_probability ?? 0 },
                                  { label: 'Crit', color: '#fbbf24', prob: mb.crit_probability ?? 0 },
                                  { label: 'Miss', color: '#f87171', prob: mb.miss_probability ?? 0 },
                                ].map(({ label, color, prob }) => (
                                  <div key={label}>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-parchment-300 font-display">{label}</span>
                                      <span style={{ color }}>{(prob * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                                      <div className="h-full rounded-full transition-all" style={{ width: `${prob * 100}%`, background: color }} />
                                    </div>
                                  </div>
                                ))}

                                <div className="rounded-lg p-3" style={{ background: '#0e0a18', border: '1px solid rgba(52,211,153,0.2)' }}>
                                  <p className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-2">Best Template</p>
                                  <p className="font-body text-sm text-emerald-300 font-semibold">{mb.best_template}</p>
                                  <p className="font-body text-xs text-smoke-400 mt-0.5">
                                    {mb.num_attacks} attack{(mb.num_attacks ?? 1) !== 1 ? 's' : ''} / round
                                    {mb.resistance_applied && <span className="text-orange-400 ml-2">(resistance applied)</span>}
                                  </p>
                                </div>

                                <div className="rounded-lg p-3" style={{ background: '#0e0a18', border: '1px solid rgba(52,211,153,0.2)' }}>
                                  <p className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-2">Per-Template DPR</p>
                                  <div className="space-y-1.5">
                                    {perTemplate.map((t) => (
                                      <div key={t.name} className="flex items-center justify-between gap-2">
                                        <span className={`font-body text-xs truncate ${t.name === mb.best_template ? 'text-emerald-300 font-semibold' : 'text-parchment-400'}`}>
                                          {t.name === mb.best_template ? '★ ' : ''}{t.name}
                                        </span>
                                        <span className={`font-display text-xs font-bold shrink-0 ${t.name === mb.best_template ? 'text-emerald-400' : 'text-parchment-300'}`}>
                                          {t.expected_dpr.toFixed(1)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {isAttack && (() => {
                              const attacks = mb.number_of_attacks ?? 1;
                              const avgPerAtk = average_damage / attacks;
                              const baseExpPerAtk = (expected_damage / attacks) / (mb.resistance_applied ? 0.5 : 1);
                              const nonCritHitProb = Math.max(0, (mb.hit_probability ?? 0) - (mb.crit_probability ?? 0));
                              const missContrib = mb.half_on_miss ? (mb.miss_probability ?? 0) * avgPerAtk / 2 : 0;
                              const hitContrib = nonCritHitProb * avgPerAtk;
                              const critContrib = Math.max(0, baseExpPerAtk - hitContrib - missContrib);
                              return (
                                <div className="space-y-3 font-body text-sm">
                                  {[
                                    { label: 'Hit', color: '#4ade80', prob: mb.hit_probability ?? 0 },
                                    { label: 'Crit', color: '#fbbf24', prob: mb.crit_probability ?? 0 },
                                    { label: 'Miss', color: '#f87171', prob: mb.miss_probability ?? 0 },
                                  ].map(({ label, color, prob }) => (
                                    <div key={label}>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-parchment-300 font-display">{label}</span>
                                        <span style={{ color }}>{(prob * 100).toFixed(0)}%</span>
                                      </div>
                                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                                        <div className="h-full rounded-full transition-all" style={{ width: `${prob * 100}%`, background: color }} />
                                      </div>
                                    </div>
                                  ))}

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg p-2.5" style={{ background: '#0e0a18', border: '1px solid rgba(99,102,241,0.15)' }}>
                                      <p className="text-xs text-smoke-400 mb-0.5">Attacks</p>
                                      <p className="text-lg font-bold text-parchment-100">{attacks}</p>
                                    </div>
                                    <div className="rounded-lg p-2.5" style={{ background: '#0e0a18', border: '1px solid rgba(99,102,241,0.15)' }}>
                                      <p className="text-xs text-smoke-400 mb-0.5">Avg / Hit</p>
                                      <p className="text-lg font-bold text-parchment-100">{avgPerAtk.toFixed(1)}</p>
                                    </div>
                                  </div>

                                  <div className="rounded-lg p-3" style={{ background: '#0e0a18', border: '1px solid rgba(99,102,241,0.15)' }}>
                                    <p className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-2">Per-Attack Breakdown</p>
                                    {[
                                      { label: `Hit, no Crit (${(nonCritHitProb * 100).toFixed(0)}%) × ${avgPerAtk.toFixed(1)}`, contrib: hitContrib, color: '#4ade80' },
                                      { label: `Crit Bonus (${((mb.crit_probability ?? 0) * 100).toFixed(0)}%) × extra`, contrib: critContrib, color: '#fbbf24' },
                                      { label: `Miss (${((mb.miss_probability ?? 0) * 100).toFixed(0)}%) × ${mb.half_on_miss ? (avgPerAtk / 2).toFixed(1) : '0'}`, contrib: missContrib, color: '#f87171' },
                                    ].map(({ label, contrib, color }) => (
                                      <div key={label} className="flex justify-between text-xs py-0.5">
                                        <span style={{ color }}>{label}</span>
                                        <span className="text-parchment-300 font-semibold">{contrib.toFixed(2)}</span>
                                      </div>
                                    ))}
                                    <div className="mt-1.5 pt-1.5 border-t border-smoke-700 flex justify-between text-xs font-bold">
                                      <span className="text-parchment-300">Sub-total / attack</span>
                                      <span className="text-parchment-100">{baseExpPerAtk.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  <div className="rounded-lg p-3" style={{ background: '#0e0a18', border: '1px solid rgba(99,102,241,0.15)' }}>
                                    <p className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-2">Total Expected</p>
                                    <p className="font-body text-xs text-parchment-300 leading-relaxed">
                                      {baseExpPerAtk.toFixed(2)} / atk × {attacks} attack{attacks !== 1 ? 's' : ''}
                                      {mb.resistance_applied && <> ÷ 2 <span className="text-orange-400">(resistance)</span></>}
                                    </p>
                                    <p className="font-display text-sm font-semibold text-gold-400 mt-2">
                                      = {expected_damage.toFixed(2)} expected
                                    </p>
                                  </div>

                                  {mb.resistance_applied && (
                                    <p className="font-body text-xs text-orange-400 italic">⚔️ Target resistance applied — all damage halved</p>
                                  )}
                                  {mb.half_on_miss && (
                                    <p className="font-body text-xs text-parchment-400 italic">✦ Includes half damage on a missed attack</p>
                                  )}
                                </div>
                              );
                            })()}

                          {isSave && (() => {
                              const targets = mb.number_of_targets ?? 1;
                              const failP = mb.save_failure_probability ?? 0;
                              const successP = mb.save_success_probability ?? 0;
                              const fullDmg = mb.full_damage_avg ?? 0;
                              const halfDmg = mb.half_damage_avg ?? 0;
                              const failContrib = failP * fullDmg;
                              const successContrib = mb.half_on_success ? successP * halfDmg : 0;
                              const perTarget = failContrib + successContrib;
                              return (
                                <div className="space-y-3 font-body text-sm">
                                  {[
                                    { label: 'Save Fails', color: '#f87171', prob: failP },
                                    { label: 'Save Succeeds', color: '#4ade80', prob: successP },
                                  ].map(({ label, color, prob }) => (
                                    <div key={label}>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span className="text-parchment-300 font-display">{label}</span>
                                        <span style={{ color }}>{(prob * 100).toFixed(0)}%</span>
                                      </div>
                                      <div className="h-2 rounded-full overflow-hidden" style={{ background: '#1e1e2e' }}>
                                        <div className="h-full rounded-full transition-all" style={{ width: `${prob * 100}%`, background: color }} />
                                      </div>
                                    </div>
                                  ))}

                                  {mb.save_penalty_die && mb.save_penalty_die !== 'none' && (
                                    <div className="rounded-lg p-2.5" style={{ background: '#0e0a18', border: '1px solid rgba(251,191,36,0.3)' }}>
                                      <p className="text-xs text-amber-400">
                                        ⚡ Penalty: −{mb.save_penalty_die.toUpperCase()} active
                                        {' '}&mdash; Effective save bonus: <strong>{(mb.effective_save_bonus ?? 0).toFixed(1)}</strong>
                                      </p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg p-2.5" style={{ background: '#0e0a18', border: '1px solid rgba(99,102,241,0.15)' }}>
                                      <p className="text-xs text-smoke-400 mb-0.5">Targets</p>
                                      <p className="text-lg font-bold text-parchment-100">{targets}</p>
                                    </div>
                                    <div className="rounded-lg p-2.5" style={{ background: '#0e0a18', border: '1px solid rgba(99,102,241,0.15)' }}>
                                      <p className="text-xs text-smoke-400 mb-0.5">Full Dmg / Target</p>
                                      <p className="text-lg font-bold text-parchment-100">{fullDmg.toFixed(1)}</p>
                                    </div>
                                  </div>

                                  <div className="rounded-lg p-3" style={{ background: '#0e0a18', border: '1px solid rgba(99,102,241,0.15)' }}>
                                    <p className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-2">Per-Target Breakdown</p>
                                    <div className="flex justify-between text-xs py-0.5">
                                      <span className="text-red-400">Failed Save ({(failP * 100).toFixed(0)}%) × {fullDmg.toFixed(1)}</span>
                                      <span className="text-parchment-300 font-semibold">{failContrib.toFixed(2)}</span>
                                    </div>
                                    {mb.half_on_success ? (
                                      <div className="flex justify-between text-xs py-0.5">
                                        <span className="text-green-400">Passed Save ({(successP * 100).toFixed(0)}%) × {halfDmg.toFixed(1)}</span>
                                        <span className="text-parchment-300 font-semibold">{successContrib.toFixed(2)}</span>
                                      </div>
                                    ) : (
                                      <div className="flex justify-between text-xs py-0.5">
                                        <span className="text-green-400">Passed Save ({(successP * 100).toFixed(0)}%) × 0 (no half damage)</span>
                                        <span className="text-parchment-300 font-semibold">0.00</span>
                                      </div>
                                    )}
                                    <div className="mt-1.5 pt-1.5 border-t border-smoke-700 flex justify-between text-xs font-bold">
                                      <span className="text-parchment-300">Sub-total / target</span>
                                      <span className="text-parchment-100">{perTarget.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  <div className="rounded-lg p-3" style={{ background: '#0e0a18', border: '1px solid rgba(99,102,241,0.15)' }}>
                                    <p className="font-display text-xs text-smoke-400 uppercase tracking-widest mb-2">Total Expected</p>
                                    <p className="font-body text-xs text-parchment-300 leading-relaxed">
                                      {perTarget.toFixed(2)} / target × {targets} target{targets !== 1 ? 's' : ''}
                                      {mb.resistance_applied && <> ÷ 2 <span className="text-orange-400">(resistance)</span></>}
                                    </p>
                                    <p className="font-display text-sm font-semibold text-gold-400 mt-2">
                                      = {expected_damage.toFixed(2)} expected
                                    </p>
                                  </div>

                                  {mb.resistance_applied && (
                                    <p className="font-body text-xs text-orange-400 italic">⚔️ Target resistance applied — all damage halved</p>
                                  )}
                                </div>
                              );
                            })()}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    {getEfficiency.isError && (
                      <AlertMessage variant="error" message="Could not load efficiency data for this spell." />
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

                {/* Hit Chance Heatmap */}
                {(spell.is_attack_roll || spell.is_saving_throw) && (
                  <HitChanceHeatmap context={analysisContext} spell={spell} />
                )}
              </div>
            )}

            {/* Hit Chance Heatmap — pure client-side, visible before first Analyze */}
            {!analyzeSpell.data && (spell.is_attack_roll || spell.is_saving_throw) && (
              <HitChanceHeatmap context={analysisContext} spell={spell} />
            )}
          </>
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
