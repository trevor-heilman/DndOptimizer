/**
 * Integration tests for SpellDetailPage.
 */
import { screen, fireEvent } from '@testing-library/react';
import { Routes, Route } from 'react-router-dom';
import { renderWithProviders } from '../utils/render';
import { SpellDetailPage } from '../../pages/SpellDetailPage';

// ── Mock hooks ──────────────────────────────────────────────────────────────
vi.mock('../../hooks/useSpells', () => ({
  useSpell: vi.fn(),
  useSpells: vi.fn(),
  useDuplicateSpell: vi.fn(),
  useDeleteSpell: vi.fn(),
  useUpdateSpell: vi.fn(),
  useCreateSpell: vi.fn(),
  useSpellSources: vi.fn(),
  useImportSpells: vi.fn(),
  useBulkDeleteSpells: vi.fn(),
  useSpellCounts: vi.fn(),
}));

vi.mock('../../hooks/useAnalysis', () => ({
  useAnalyzeSpell: vi.fn(),
  useGetSpellEfficiency: vi.fn(),
  useBatchAnalyzeSpells: vi.fn(),
  useCompareSpells: vi.fn(),
  useBreakevenAnalysis: vi.fn(),
  useCompareGrowth: vi.fn(),
}));

import {
  useSpell,
  useDuplicateSpell,
  useDeleteSpell,
  useUpdateSpell,
  useCreateSpell,
  useSpellSources,
} from '../../hooks/useSpells';
import { useAnalyzeSpell, useGetSpellEfficiency } from '../../hooks/useAnalysis';

// ── Fixtures ────────────────────────────────────────────────────────────────

const stubMutation = () => ({
  mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue(undefined),
  isPending: false, isError: false, data: undefined, error: null, reset: vi.fn(),
});

/** Full featured spell: saving throw, upcast, V/S/M components */
const mockSpellFull = {
  id: 'spell-1', name: 'Fireball', level: 3, school: 'evocation',
  casting_time: '1 action', range: '150 feet', duration: 'Instantaneous',
  concentration: false, ritual: false,
  is_attack_roll: false, is_saving_throw: true, is_auto_hit: false,
  save_type: 'DEX', half_damage_on_save: true,
  components_v: true, components_s: true, components_m: true,
  material: 'A tiny ball of bat guano and sulfur.',
  description: 'A bright streak flashes from your pointing finger to a point you choose.',
  higher_level: 'When you cast this spell using a spell slot of 4th level or higher…',
  upcast_dice_increment: 1, upcast_die_size: 6, upcast_base_level: 3,
  damage_components: [{
    id: 'dc-1', dice_count: 8, die_size: 6, flat_modifier: 0,
    damage_type: 'fire', timing: 'on_fail', is_verified: true,
  }],
  summon_templates: [], tags: [],
  source: "Player's Handbook",
  created_by: 'user-1', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

/** Non-scaling spell — no upcast increment, no char_level_breakpoints */
const mockNonScalingSpell = {
  ...mockSpellFull,
  id: 'spell-2', name: 'Burning Hands', level: 1,
  upcast_dice_increment: null, upcast_die_size: null, upcast_base_level: null,
  higher_level: undefined,
};

/** Spell with char_level_breakpoints (cantrip-style scaling) */
const mockCantrip = {
  ...mockSpellFull,
  id: 'spell-cantrip', name: 'Fire Bolt', level: 0,
  is_saving_throw: false, is_attack_roll: true,
  upcast_dice_increment: 1, upcast_die_size: 10,
  char_level_breakpoints: {
    5:  { die_count: 2, die_size: 10, flat: 0 },
    11: { die_count: 3, die_size: 10, flat: 0 },
    17: { die_count: 4, die_size: 10, flat: 0 },
  },
};

/** Summon spell with one template */
const mockSummonSpell = {
  ...mockSpellFull,
  id: 'spell-3', name: 'Summon Beast',
  is_saving_throw: false, tags: ['summoning'],
  damage_components: [],
  summon_templates: [{
    id: 'st-1', name: 'Air Body', creature_type: 'Small beast',
    source: 'TCoE', base_hp: 30, hp_per_level: 5, hp_base_level: 2,
    base_ac: 11, ac_per_level: 1, num_attacks_formula: 'floor_half_level',
    attacks: [],
  }],
};

/** Analysis result fixture for a saving-throw spell */
const mockAnalysisResult = {
  results: {
    spell_type: 'saving_throw',
    expected_damage: 28.5,
    efficiency: 9.5,
    average_damage: 28.5,
    math_breakdown: {
      slot_level: 3,
      hit_probability: null,
      crit_probability: null,
      miss_probability: null,
      per_template: null,
      best_template: null,
      num_attacks: null,
      resistance_applied: false,
    },
  },
};

/** Analysis result fixture for a summon spell */
const mockSummonAnalysisResult = {
  results: {
    spell_type: 'summon',
    expected_damage: 14.2,
    efficiency: 4.7,
    math_breakdown: {
      slot_level: 3,
      best_template: 'Air Body',
      hit_probability: 0.6,
      crit_probability: 0.05,
      miss_probability: 0.4,
      num_attacks: 1,
      resistance_applied: false,
      per_template: [{ name: 'Air Body', expected_dpr: 14.2 }],
    },
  },
};

// ── Render helper ────────────────────────────────────────────────────────────

function renderDetailPage(id = 'spell-1') {
  return renderWithProviders(
    <Routes>
      <Route path="/spells/:id" element={<SpellDetailPage />} />
    </Routes>,
    { initialEntries: [`/spells/${id}`] }
  );
}

// ── Default beforeEach ───────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(useSpell).mockReturnValue({ data: mockSpellFull, isLoading: false, error: null } as any);
  vi.mocked(useDuplicateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useDeleteSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useUpdateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useCreateSpell).mockReturnValue(stubMutation() as any);
  vi.mocked(useSpellSources).mockReturnValue({ data: [], isLoading: false } as any);
  vi.mocked(useAnalyzeSpell).mockReturnValue({ ...stubMutation(), data: undefined } as any);
  vi.mocked(useGetSpellEfficiency).mockReturnValue({ ...stubMutation(), data: undefined } as any);
});

// ═══════════════════════════════════════════════════════════════════════════
// Describe groups
// ═══════════════════════════════════════════════════════════════════════════

describe('SpellDetailPage — loading / error states', () => {
  it('shows a loading spinner while data is loading', () => {
    vi.mocked(useSpell).mockReturnValue({ data: undefined, isLoading: true, error: null } as any);
    renderDetailPage();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows a Spell Not Found error when the spell cannot be fetched', () => {
    vi.mocked(useSpell).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Not Found' } } as any);
    renderDetailPage();
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });

  it('renders a Back to Spells button on the error page', () => {
    vi.mocked(useSpell).mockReturnValue({ data: undefined, isLoading: false, error: { message: 'Not Found' } } as any);
    renderDetailPage();
    expect(screen.getByRole('button', { name: /back to spells/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellDetailPage — spell header', () => {
  it('renders the spell name as a heading', () => {
    renderDetailPage();
    expect(screen.getByRole('heading', { name: /fireball/i })).toBeInTheDocument();
  });

  it('renders the school badge', () => {
    renderDetailPage();
    expect(screen.getByText('Evocation')).toBeInTheDocument();
  });

  it('renders the level badge', () => {
    renderDetailPage();
    expect(screen.getAllByText(/level 3/i).length).toBeGreaterThan(0);
  });

  it('renders the Concentration badge when applicable', () => {
    vi.mocked(useSpell).mockReturnValue({
      data: { ...mockSpellFull, concentration: true },
      isLoading: false, error: null,
    } as any);
    renderDetailPage();
    expect(screen.getByText(/concentration/i)).toBeInTheDocument();
  });

  it('renders the Ritual badge when applicable', () => {
    vi.mocked(useSpell).mockReturnValue({
      data: { ...mockSpellFull, ritual: true },
      isLoading: false, error: null,
    } as any);
    renderDetailPage();
    expect(screen.getByText(/ritual/i)).toBeInTheDocument();
  });

  it('renders the Duplicate button for the spell owner', () => {
    renderDetailPage();
    expect(screen.getByRole('button', { name: /duplicate/i })).toBeInTheDocument();
  });

  it('renders Edit and Delete buttons for the spell owner', () => {
    // mockUser.id === 'user-1' and mockSpellFull.created_by === 'user-1'
    renderDetailPage();
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellDetailPage — spell info', () => {
  it('renders the spell description', () => {
    renderDetailPage();
    expect(screen.getByText(/bright streak/i)).toBeInTheDocument();
  });

  it('renders the At Higher Levels section', () => {
    renderDetailPage();
    expect(screen.getByText(/at higher levels/i)).toBeInTheDocument();
    expect(screen.getByText(/4th level or higher/i)).toBeInTheDocument();
  });

  it('renders the casting time, range, and duration stat cards', () => {
    renderDetailPage();
    expect(screen.getByText(/1 action/i)).toBeInTheDocument();
    expect(screen.getByText(/150 feet/i)).toBeInTheDocument();
    expect(screen.getByText(/instantaneous/i)).toBeInTheDocument();
  });

  it('renders the Components card', () => {
    renderDetailPage();
    // V, S, M — "Components" label appears in multiple stat cards so use getAllByText
    expect(screen.getAllByText(/components/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/bat guano/i)).toBeInTheDocument();
  });

  it('renders the Saving Throw type badge in Spell Mechanics', () => {
    renderDetailPage();
    expect(screen.getAllByText(/saving throw/i).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the save type (DEX)', () => {
    renderDetailPage();
    expect(screen.getAllByText('DEX').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the "Half damage" on-save description', () => {
    renderDetailPage();
    // "Half damage" appears in Spell Mechanics; AnalysisContextForm also shows it
    expect(screen.getAllByText(/half damage/i).length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellDetailPage — damage components section', () => {
  it('renders the Damage Components heading', () => {
    renderDetailPage();
    expect(screen.getByRole('heading', { name: /damage components/i })).toBeInTheDocument();
  });

  it('renders the average base damage', () => {
    renderDetailPage();
    // 8d6 avg = 28.0 — also appears in the upcast table row and DamageChart
    expect(screen.getAllByText('28.0').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the damage type chip (fire)', () => {
    renderDetailPage();
    expect(screen.getByText(/8d6.*fire/i)).toBeInTheDocument();
  });

  it('renders the "Damage by Spell Slot" table heading for an upcastable spell', () => {
    renderDetailPage();
    expect(screen.getByText(/damage by spell slot/i)).toBeInTheDocument();
  });

  it('renders the base Slot 3 row in the upcast table', () => {
    renderDetailPage();
    // Table row + DamageChart slot selector both match /slot 3/i
    expect(screen.getAllByText(/slot 3/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/\(base\)/i)).toBeInTheDocument();
  });

  it('shows the Upcast Bonus in Spell Mechanics for a non-cantrip scaling spell', () => {
    renderDetailPage();
    expect(screen.getByText(/upcast bonus/i)).toBeInTheDocument();
    expect(screen.getByText(/per slot level/i)).toBeInTheDocument();
  });

  it('does not render the Damage by Spell Slot table for a non-scaling spell', () => {
    vi.mocked(useSpell).mockReturnValue({ data: mockNonScalingSpell, isLoading: false, error: null } as any);
    renderDetailPage('spell-2');
    expect(screen.queryByText(/damage by spell slot/i)).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellDetailPage — char-level breakpoints', () => {
  it('renders the "Char Level Scaling" label when breakpoints exist', () => {
    vi.mocked(useSpell).mockReturnValue({ data: mockCantrip, isLoading: false, error: null } as any);
    renderDetailPage('spell-cantrip');
    expect(screen.getByText(/char level scaling/i)).toBeInTheDocument();
  });

  it('renders at least one breakpoint level entry', () => {
    vi.mocked(useSpell).mockReturnValue({ data: mockCantrip, isLoading: false, error: null } as any);
    renderDetailPage('spell-cantrip');
    expect(screen.getByText(/level 5\+/i)).toBeInTheDocument();
  });

  it('renders "Cantrip Scaling" text in Spell Mechanics for level-0 spells', () => {
    vi.mocked(useSpell).mockReturnValue({ data: mockCantrip, isLoading: false, error: null } as any);
    renderDetailPage('spell-cantrip');
    expect(screen.getByText(/cantrip scaling/i)).toBeInTheDocument();
  });

  it('renders Damage by Character Level breakdown for cantrips', () => {
    vi.mocked(useSpell).mockReturnValue({ data: mockCantrip, isLoading: false, error: null } as any);
    renderDetailPage('spell-cantrip');
    expect(screen.getByText(/damage by character level/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellDetailPage — combat parameters & analyze button', () => {
  it('renders the analysis context form (save DC field for saving-throw spells)', () => {
    renderDetailPage();
    expect(screen.getByLabelText(/spell save dc/i)).toBeInTheDocument();
  });

  it('renders the Analyze button', () => {
    renderDetailPage();
    expect(screen.getByRole('button', { name: /analyze/i })).toBeInTheDocument();
  });

  it('shows "Analyzing…" text and disables the button while pending', () => {
    vi.mocked(useAnalyzeSpell).mockReturnValue({
      ...stubMutation(), isPending: true, data: undefined,
    } as any);
    renderDetailPage();
    expect(screen.getByText(/analyzing…/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analyzing/i })).toBeDisabled();
  });

  it('shows an analysis error alert when the mutation fails', () => {
    vi.mocked(useAnalyzeSpell).mockReturnValue({
      ...stubMutation(), isError: true, data: undefined,
    } as any);
    renderDetailPage();
    expect(screen.getByText(/analysis failed/i)).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellDetailPage — analysis results (damage-component spell)', () => {
  beforeEach(() => {
    vi.mocked(useAnalyzeSpell).mockReturnValue({
      ...stubMutation(), data: mockAnalysisResult,
    } as any);
  });

  it('renders the Analysis Results section heading', () => {
    renderDetailPage();
    expect(screen.getByRole('heading', { name: /analysis results/i })).toBeInTheDocument();
  });

  it('renders the Expected Damage label', () => {
    renderDetailPage();
    expect(screen.getByText(/expected damage/i)).toBeInTheDocument();
  });

  it('renders the expected damage value', () => {
    renderDetailPage();
    expect(screen.getByText('28.50')).toBeInTheDocument();
  });

  it('renders the Efficiency card for a spell that scales with slot', () => {
    // mockSpellFull has upcast_dice_increment: 1 — scalesWithSlot is true
    renderDetailPage();
    expect(screen.getByText(/efficiency/i)).toBeInTheDocument();
    expect(screen.getByText('9.50')).toBeInTheDocument();
  });

  it('does NOT render the Efficiency card for a non-scaling spell', () => {
    vi.mocked(useSpell).mockReturnValue({ data: mockNonScalingSpell, isLoading: false, error: null } as any);
    renderDetailPage('spell-2');
    // Non-scaling spell — efficiency stat card should not appear
    expect(screen.queryByText('9.50')).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('SpellDetailPage — summon spell section', () => {
  beforeEach(() => {
    vi.mocked(useSpell).mockReturnValue({ data: mockSummonSpell, isLoading: false, error: null } as any);
  });

  it('renders the Summoned Creatures heading', () => {
    renderDetailPage('spell-3');
    expect(screen.getByRole('heading', { name: /summoned creatures/i })).toBeInTheDocument();
  });

  it('renders the template name card (Air Body)', () => {
    renderDetailPage('spell-3');
    expect(screen.getByText('Air Body')).toBeInTheDocument();
  });

  it('renders the creature type subtitle', () => {
    renderDetailPage('spell-3');
    expect(screen.getByText('Small beast')).toBeInTheDocument();
  });

  it('renders HP, AC, Atk stat labels on the template card', () => {
    renderDetailPage('spell-3');
    expect(screen.getByText('HP')).toBeInTheDocument();
    expect(screen.getByText('AC')).toBeInTheDocument();
    expect(screen.getByText('Atk')).toBeInTheDocument();
  });

  it('renders the Analyze DPR button inside the summon section', () => {
    renderDetailPage('spell-3');
    expect(screen.getByRole('button', { name: /analyze dpr/i })).toBeInTheDocument();
  });

  it('shows the DPR Results panel after analysis returns summon data', () => {
    vi.mocked(useAnalyzeSpell).mockReturnValue({
      ...stubMutation(), data: mockSummonAnalysisResult,
    } as any);
    renderDetailPage('spell-3');
    expect(screen.getByText(/dpr results/i)).toBeInTheDocument();
    expect(screen.getByText(/best dpr/i)).toBeInTheDocument();
    // 14.2 appears in both the Best DPR stat card and the per-template row
    expect(screen.getAllByText('14.2').length).toBeGreaterThanOrEqual(1);
  });

  it('highlights the best template row in the per-template list', () => {
    vi.mocked(useAnalyzeSpell).mockReturnValue({
      ...stubMutation(), data: mockSummonAnalysisResult,
    } as any);
    renderDetailPage('spell-3');
    // "★ Air Body" — best template gets a star
    expect(screen.getByText(/★.*air body/i)).toBeInTheDocument();
  });
});
