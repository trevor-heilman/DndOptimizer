/**
 * Unit tests for AdminReviewPage (F13).
 *
 * Covers: loading, error (+Retry), empty state, data state (spell count + cards).
 */
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../utils/render';
import { AdminReviewPage } from '../../pages/AdminReviewPage';

// ── Mock hooks ───────────────────────────────────────────────────────────────
vi.mock('../../hooks/useSpells', () => ({
  useSpells: vi.fn(),
  useSpell: vi.fn(),
  useSpellSources: vi.fn(),
  useNeedsReview: vi.fn(),
  useMarkReviewed: vi.fn(),
  useCreateSpell: vi.fn(),
  useUpdateSpell: vi.fn(),
  useDeleteSpell: vi.fn(),
  useDuplicateSpell: vi.fn(),
  useImportSpells: vi.fn(),
  useBulkDeleteSpells: vi.fn(),
  useSpellCounts: vi.fn(),
}));

import { useNeedsReview, useMarkReviewed } from '../../hooks/useSpells';

const stubMutation = () => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  isPending: false,
  isError: false,
  data: null,
  error: null,
  reset: vi.fn(),
});

// A minimal Spell fixture that includes parsing_metadata so SpellReviewCard renders.
const mockSpell = {
  id: 'spell-1',
  name: 'Arcane Eye',
  level: 4,
  school: 'divination',
  casting_time: '1 action',
  range: '30 feet',
  duration: '1 hour',
  concentration: true,
  ritual: false,
  is_attack_roll: false,
  is_saving_throw: false,
  is_auto_hit: false,
  half_damage_on_save: false,
  description: 'You create an invisible magical sensor.',
  damage_components: [],
  source: 'PHB 2014',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  parsing_metadata: {
    id: 'meta-1',
    parsing_confidence: 0.45,
    requires_review: true,
    parsing_notes: {},
    auto_extracted_components: {},
  },
};

const mockSpell2 = { ...mockSpell, id: 'spell-2', name: 'Detect Magic', parsing_metadata: { ...mockSpell.parsing_metadata, id: 'meta-2' } };

function renderPage() {
  return renderWithProviders(<AdminReviewPage />);
}

beforeEach(() => {
  vi.mocked(useNeedsReview).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as any);
  vi.mocked(useMarkReviewed).mockReturnValue(stubMutation() as any);
});

// ── Page structure ────────────────────────────────────────────────────────────

describe('AdminReviewPage — structure', () => {
  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /parsing confidence review/i })).toBeInTheDocument();
  });

  it('renders the page description', () => {
    renderPage();
    expect(screen.getByText(/low parsing confidence/i)).toBeInTheDocument();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('AdminReviewPage — loading state', () => {
  it('shows "Loading spells for review…" while loading', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByText('Loading spells for review\u2026')).toBeInTheDocument();
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('AdminReviewPage — error state', () => {
  it('shows an "Error" heading when loading fails', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByRole('heading', { name: /^error$/i })).toBeInTheDocument();
  });

  it('shows the error description text', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByText(/could not load spells for review/i)).toBeInTheDocument();
  });

  it('shows a Retry button in error state', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls refetch when the Retry button is clicked', () => {
    const refetch = vi.fn();
    vi.mocked(useNeedsReview).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch } as any);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledOnce();
  });
});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('AdminReviewPage — empty state', () => {
  it('shows "All clear!" when no spells need review', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByText(/all clear/i)).toBeInTheDocument();
  });

  it('shows the "no spells flagged" message in empty state', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: [], isLoading: false, isError: false, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByText(/no spells are currently flagged/i)).toBeInTheDocument();
  });
});

// ── Data state ────────────────────────────────────────────────────────────────

describe('AdminReviewPage — data state', () => {
  it('shows "1 spell awaiting review" for a single spell', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: [mockSpell], isLoading: false, isError: false, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByText('1 spell awaiting review')).toBeInTheDocument();
  });

  it('shows "2 spells awaiting review" for multiple spells (plural)', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: [mockSpell, mockSpell2], isLoading: false, isError: false, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByText('2 spells awaiting review')).toBeInTheDocument();
  });

  it('renders a review card for each spell', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: [mockSpell, mockSpell2], isLoading: false, isError: false, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByRole('heading', { name: 'Arcane Eye' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Detect Magic' })).toBeInTheDocument();
  });

  it('renders the "Mark as Reviewed" button for each spell card', () => {
    vi.mocked(useNeedsReview).mockReturnValue({ data: [mockSpell], isLoading: false, isError: false, refetch: vi.fn() } as any);
    renderPage();
    expect(screen.getByRole('button', { name: /mark as reviewed/i })).toBeInTheDocument();
  });
});
