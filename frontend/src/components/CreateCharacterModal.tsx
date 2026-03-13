/**
 * Create / Edit Character Modal
 */
import { useState, useEffect } from 'react';
import type { Character, CharacterCreate, BookColor } from '../types/api';
import { ModalShell, AlertMessage } from './ui';
import { BookColorPicker } from './BookColorPicker';

const CLASS_CHOICES = [
  { value: 'artificer', label: 'Artificer' },
  { value: 'bard',      label: 'Bard' },
  { value: 'cleric',    label: 'Cleric' },
  { value: 'druid',     label: 'Druid' },
  { value: 'paladin',   label: 'Paladin' },
  { value: 'ranger',    label: 'Ranger' },
  { value: 'sorcerer',  label: 'Sorcerer' },
  { value: 'warlock',   label: 'Warlock' },
  { value: 'wizard',    label: 'Wizard' },
];

const WIZARD_SUBCLASSES = [
  { value: '',                         label: '— None —' },
  { value: 'order_of_scribes',         label: 'Order of Scribes (−50% copy cost)' },
  { value: 'bladesinging',             label: 'Bladesinging' },
  { value: 'school_of_abjuration',     label: 'School of Abjuration' },
  { value: 'school_of_conjuration',    label: 'School of Conjuration' },
  { value: 'school_of_divination',     label: 'School of Divination' },
  { value: 'school_of_enchantment',    label: 'School of Enchantment' },
  { value: 'school_of_evocation',      label: 'School of Evocation' },
  { value: 'school_of_illusion',       label: 'School of Illusion' },
  { value: 'school_of_necromancy',     label: 'School of Necromancy' },
  { value: 'school_of_transmutation',  label: 'School of Transmutation' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CharacterCreate) => Promise<void>;
  /** When editing, pre-fill from an existing character. */
  existing?: Character;
}

export function CreateCharacterModal({ isOpen, onClose, onSave, existing }: Props) {
  const [name,       setName]       = useState('');
  const [cls,        setCls]        = useState('');
  const [level,      setLevel]      = useState('1');
  const [subclass,   setSubclass]   = useState('');
  // Stored as ability score (1–30); modifier is derived as floor((score-10)/2).
  const [abilScore,  setAbilScore]  = useState('10');
  const [dcBonus,    setDcBonus]    = useState('0');
  const [atkBonus,   setAtkBonus]   = useState('0');
  const [color,      setColor]      = useState<BookColor>('violet');
  const [ruleset,    setRuleset]    = useState<'2014' | '2024'>('2014');
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  // --- Live derived stats ---
  const WIZARD_2024_PREPARED: Record<number, number> = {
    1: 4, 2: 5, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 12,
    9: 14, 10: 15, 11: 16, 12: 16, 13: 17, 14: 18, 15: 19,
    16: 21, 17: 22, 18: 23, 19: 24, 20: 25,
  };
  const _score    = Math.max(1, Math.min(30, parseInt(abilScore, 10) || 10));
  const _lvl      = Math.max(1, Math.min(20, parseInt(level, 10) || 1));
  const derivedMod   = Math.floor((_score - 10) / 2);
  const derivedProf  = Math.floor((_lvl - 1) / 4) + 2;
  const derivedDC    = 8 + derivedProf + derivedMod + (parseInt(dcBonus, 10) || 0);
  const derivedAtk   = derivedProf + derivedMod + (parseInt(atkBonus, 10) || 0);
  const derivedPrepared: number | null = (() => {
    const m = derivedMod;
    const l = _lvl;
    const is2024 = ruleset === '2024';
    if (cls === 'wizard') {
      return is2024 ? (WIZARD_2024_PREPARED[l] ?? Math.max(1, m + l)) : Math.max(1, m + l);
    }
    if (cls === 'cleric' || cls === 'druid') return Math.max(1, m + l);
    if (cls === 'paladin') return is2024 ? Math.max(1, m + l) : Math.max(1, m + Math.floor(l / 2));
    if (cls === 'artificer') return Math.max(1, m + Math.floor(l / 2));
    if (cls === 'bard' && is2024) return Math.max(1, m + l);
    if (cls === 'ranger' && is2024) return Math.max(1, m + Math.floor(l / 2));
    return null;
  })();

  // Pre-fill when editing
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setCls(existing.character_class ?? '');
      setLevel(String(existing.character_level ?? 1));
      setSubclass(existing.subclass ?? '');
      // Convert stored modifier back to the canonical even score (mod*2+10).
      const storedMod = existing.spellcasting_ability_modifier ?? 0;
      setAbilScore(String(storedMod * 2 + 10));
      setDcBonus(String(existing.dc_bonus ?? 0));
      setAtkBonus(String(existing.attack_bonus_extra ?? 0));
      setColor(existing.portrait_color ?? 'violet');
      setRuleset(existing.ruleset ?? '2014');
    } else {
      setName(''); setCls(''); setLevel('1'); setSubclass('');
      setAbilScore('10'); setDcBonus('0'); setAtkBonus('0'); setColor('violet');
      setRuleset('2014');
    }
    setError('');
  }, [existing, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    const lvlNum = parseInt(level, 10);
    if (isNaN(lvlNum) || lvlNum < 1 || lvlNum > 20) {
      setError('Level must be 1–20');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        character_class: cls || undefined,
        character_level: lvlNum,
        subclass: subclass || undefined,
        portrait_color: color,
        ruleset,
        // Derive modifier from score before sending to API.
        spellcasting_ability_modifier: Math.floor((Math.max(1, Math.min(30, parseInt(abilScore, 10) || 10)) - 10) / 2),
        dc_bonus: parseInt(dcBonus, 10) || 0,
        attack_bonus_extra: parseInt(atkBonus, 10) || 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to save character');
    } finally {
      setSubmitting(false);
    }
  };

  const isWizard = cls === 'wizard';

  return (
    <ModalShell
      title={existing ? 'Edit Character' : 'New Character'}
      onClose={handleClose}
      disabled={submitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Name */}
        <div>
          <label className="block text-sm font-display font-medium text-parchment-300 mb-1.5">
            Character Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="dnd-input font-body"
            placeholder="Alara Brightweave"
            disabled={submitting}
            required
          />
        </div>

        {/* Class + Level */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-display font-medium text-parchment-300 mb-1.5">
              Class
            </label>
            <select
              value={cls}
              onChange={(e) => { setCls(e.target.value); setSubclass(''); }}
              className="dnd-input font-body"
              disabled={submitting}
            >
              <option value="">— None —</option>
              {CLASS_CHOICES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-display font-medium text-parchment-300 mb-1.5">
              Level <span className="text-smoke-500 font-normal">(1–20)</span>
            </label>
            <input
              type="number"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="dnd-input font-body"
              min={1} max={20}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Wizard subclass */}
        {isWizard && (
          <div>
            <label className="block text-sm font-display font-medium text-parchment-300 mb-1.5">
              Wizard Subclass
              <span className="text-smoke-500 font-normal text-xs ml-2">affects spellbook copy cost</span>
            </label>
            <select
              value={subclass}
              onChange={(e) => setSubclass(e.target.value)}
              className="dnd-input font-body"
              disabled={submitting}
            >
              {WIZARD_SUBCLASSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Rules Edition */}
        <div>
          <label className="block text-sm font-display font-medium text-parchment-300 mb-1.5">
            Rules Edition
          </label>
          <div className="flex gap-2">
            {(['2014', '2024'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRuleset(r)}
                disabled={submitting}
                className={[
                  'flex-1 py-2 rounded-md text-sm font-display font-medium transition-colors',
                  ruleset === r
                    ? 'bg-accent-700 text-parchment-100 border border-accent-500'
                    : 'bg-surface-700 text-smoke-400 border border-surface-600 hover:border-accent-600 hover:text-parchment-300',
                ].join(' ')}
              >
                {r === '2014' ? 'D&D 5e (2014)' : 'D&D 5e (2024)'}
              </button>
            ))}
          </div>
        </div>

        {/* Spellcasting stats */}
        <div>
          <p className="text-xs font-display uppercase tracking-widest text-smoke-500 mb-2">
            Spellcasting Stats
          </p>

          {/* Row 1: Ability Score + bonuses */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-display text-parchment-400 mb-1 flex items-center gap-1.5">
                Ability Score
                <span
                  className="font-bold text-[11px] px-1 rounded"
                  style={{ color: derivedMod >= 0 ? '#fde68a' : '#f87171' }}
                >
                  {derivedMod >= 0 ? `+${derivedMod}` : derivedMod}
                </span>
              </label>
              <input
                type="number"
                value={abilScore}
                onChange={(e) => setAbilScore(e.target.value)}
                className="dnd-input font-body text-sm"
                min={1} max={30}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-xs font-display text-parchment-400 mb-1">
                DC Bonus
              </label>
              <input
                type="number"
                value={dcBonus}
                onChange={(e) => setDcBonus(e.target.value)}
                className="dnd-input font-body text-sm"
                min={0} max={10}
                disabled={submitting}
              />
            </div>
            <div>
              <label className="block text-xs font-display text-parchment-400 mb-1">
                Atk Bonus
              </label>
              <input
                type="number"
                value={atkBonus}
                onChange={(e) => setAtkBonus(e.target.value)}
                className="dnd-input font-body text-sm"
                min={0} max={10}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Live preview row */}
          <div
            className="mt-2.5 flex items-center gap-3 px-3 py-2 rounded-md flex-wrap"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="font-display text-[10px] uppercase tracking-widest text-smoke-500">Calculated →</span>
            <span className="font-display text-xs text-smoke-400">
              Save DC
              <span className="font-bold text-parchment-200 ml-1">{derivedDC}</span>
            </span>
            <span className="text-smoke-700">·</span>
            <span className="font-display text-xs text-smoke-400">
              Atk
              <span className="font-bold text-parchment-200 ml-1">
                {derivedAtk >= 0 ? `+${derivedAtk}` : derivedAtk}
              </span>
            </span>
            <span className="text-smoke-700">·</span>
            <span className="font-display text-xs text-smoke-400">
              Prof
              <span className="font-bold text-smoke-300 ml-1">+{derivedProf}</span>
            </span>
            {derivedPrepared !== null && (
              <>
                <span className="text-smoke-700">·</span>
                <span className="font-display text-xs text-smoke-400">
                  Prepared
                  <span className="font-bold text-parchment-200 ml-1">{derivedPrepared}</span>
                </span>
              </>
            )}
          </div>

          <p className="text-[10px] text-smoke-600 mt-1.5 font-body italic">
            DC&nbsp;Bonus and Atk&nbsp;Bonus are for magical items, feats, or boons (e.g.&nbsp;+1 from an Arcane Grimoire).
          </p>
        </div>

        {/* Color picker */}
        <div>
          <label className="block text-sm font-display font-medium text-parchment-300 mb-2">
            Shelf Color
          </label>
          <BookColorPicker value={color} onChange={setColor} disabled={submitting} />
        </div>

        {error && (
          <AlertMessage variant="error" title="Error" message={error} />
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 font-display text-sm py-2 rounded border border-smoke-700 text-smoke-300 hover:text-parchment-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 btn-gold font-display text-sm py-2"
          >
            {submitting ? 'Saving…' : existing ? 'Save Changes' : 'Create Character'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
