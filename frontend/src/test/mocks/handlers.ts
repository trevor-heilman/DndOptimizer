/**
 * MSW request handlers for all API routes used in tests.
 */
import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:8000/api';

// ─── Fixtures ────────────────────────────────────────────────────────────────

export const mockUser = {
  id: 'user-1',
  email: 'tester@example.com',
  created_at: '2026-01-01T00:00:00Z',
};

export const mockTokens = {
  access: 'mock-access-token',
  refresh: 'mock-refresh-token',
};

export const mockSpell = {
  id: 'spell-1',
  name: 'Fireball',
  level: 3,
  school: 'evocation',
  casting_time: '1 action',
  range: '150 feet',
  duration: 'Instantaneous',
  concentration: false,
  ritual: false,
  is_attack_roll: false,
  is_saving_throw: true,
  save_type: 'DEX',
  half_damage_on_save: true,
  description: 'A bright streak flashes from your pointing finger…',
  higher_level: 'When you cast this spell using a spell slot of 4th level or higher…',
  upcast_dice_increment: 1,
  upcast_die_size: 6,
  damage_components: [
    {
      id: 'dc-1',
      dice_count: 8,
      die_size: 6,
      flat_modifier: 0,
      damage_type: 'fire',
      timing: 'on_fail',
      is_verified: true,
    },
  ],
  parsing_metadata: {
    id: 'pm-1',
    parsing_confidence: 0.9,
    requires_review: false,
    is_reviewed: false,
  },
  created_by: 'user-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const mockSpell2 = {
  ...mockSpell,
  id: 'spell-2',
  name: 'Magic Missile',
  level: 1,
  is_attack_roll: false,
  is_saving_throw: false,
  description: 'You create three glowing darts of magical force.',
  damage_components: [],
};

export const mockSpellbook = {
  id: 'sb-1',
  owner: 'user-1',
  name: 'My Spellbook',
  description: 'Test spellbook',
  spells: [mockSpell],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

export const mockAnalysisResult = {
  spell: { id: 'spell-1', name: 'Fireball', level: 3 },
  results: {
    type: 'saving_throw',
    expected_damage: 17.5,
    efficiency: 5.83,
  },
};

export const mockComparisonResult = {
  spell_a: {
    spell_name: 'Fireball',
    spell_type: 'saving_throw',
    average_damage: 28,
    maximum_damage: 48,
    minimum_damage: 8,
    expected_damage: 17.5,
    save_failure_probability: 0.625,
  },
  spell_b: {
    spell_name: 'Magic Missile',
    spell_type: 'other',
    average_damage: 10.5,
    maximum_damage: 15,
    minimum_damage: 6,
    expected_damage: 10.5,
  },
  winner: 'spell_a',
  difference: 7.0,
};

export const mockEfficiencyResponse = {
  spell: { id: 'spell-1', name: 'Fireball', level: 3 },
  efficiency_by_slot: [
    { slot_level: 3, expected_damage: 17.5, efficiency: 5.83 },
    { slot_level: 4, expected_damage: 21.0, efficiency: 5.25 },
    { slot_level: 5, expected_damage: 24.5, efficiency: 4.9 },
  ],
};

// ─── Handlers ────────────────────────────────────────────────────────────────

export const handlers = [
  // Auth
  http.post(`${BASE}/users/login/`, () =>
    HttpResponse.json({ access: mockTokens.access, refresh: mockTokens.refresh, user: mockUser })
  ),
  http.post(`${BASE}/users/register/`, () =>
    HttpResponse.json(
      { access: mockTokens.access, refresh: mockTokens.refresh, user: mockUser },
      { status: 201 }
    )
  ),
  http.get(`${BASE}/users/me/`, () => HttpResponse.json(mockUser)),

  // Spells
  http.get(`${BASE}/spells/spells/`, () =>
    HttpResponse.json({ count: 2, next: null, previous: null, results: [mockSpell, mockSpell2] })
  ),
  http.get(`${BASE}/spells/spells/:id/`, ({ params }) => {
    const spell = [mockSpell, mockSpell2].find((s) => s.id === params.id);
    return spell ? HttpResponse.json(spell) : HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
  }),
  http.post(`${BASE}/spells/spells/`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockSpell, id: 'spell-new', name: body['name'] as string }, { status: 201 });
  }),
  http.post(`${BASE}/spells/spells/import_spells/`, () =>
    HttpResponse.json({ imported: 2, errors: [] })
  ),
  http.delete(`${BASE}/spells/spells/:id/`, () => new HttpResponse(null, { status: 204 })),

  // Spellbooks
  http.get(`${BASE}/spellbooks/spellbooks/`, () =>
    HttpResponse.json({ count: 1, next: null, previous: null, results: [mockSpellbook] })
  ),

  // Analysis
  http.post(`${BASE}/analysis/analyze/`, () => HttpResponse.json(mockAnalysisResult)),
  http.post(`${BASE}/analysis/compare/`, () => HttpResponse.json(mockComparisonResult)),
  http.post(`${BASE}/analysis/efficiency/`, () => HttpResponse.json(mockEfficiencyResponse)),
];
