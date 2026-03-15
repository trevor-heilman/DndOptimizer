"""
Unit tests for model layer.
"""
import pytest
from django.contrib.auth import get_user_model

from analysis.models import AnalysisContext, SpellComparison
from spellbooks.models import Character, PreparedSpell, Spellbook
from spells.models import DamageComponent, Spell, SpellParsingMetadata

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Tests for the custom User model."""

    def test_create_user(self):
        """Test creating a user with email."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        assert user.email == 'test@example.com'
        assert user.check_password('testpass123')
        assert user.is_active
        assert not user.is_staff
        assert not user.is_superuser

    def test_create_superuser(self):
        """Test creating a superuser."""
        admin = User.objects.create_superuser(
            username='adminuser',
            email='admin@example.com',
            password='adminpass123'
        )
        assert admin.is_staff
        assert admin.is_superuser
        assert admin.is_active

    def test_user_str(self):
        """Test user string representation."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        assert str(user) == 'test@example.com'


@pytest.mark.django_db
class TestSpellModel:
    """Tests for the Spell model."""

    def test_create_spell(self):
        """Test creating a basic spell."""
        spell = Spell.objects.create(
            name='Magic Missile',
            level=1,
            school='evocation',
            casting_time='1 action',
            range='120 feet',
            duration='Instantaneous',
            description='You create three magical darts.',
            is_attack_roll=False,
            is_saving_throw=False
        )
        assert spell.name == 'Magic Missile'
        assert spell.level == 1
        assert spell.school == 'evocation'
        assert not spell.concentration
        assert not spell.ritual

    def test_spell_with_concentration(self):
        """Test spell with concentration."""
        spell = Spell.objects.create(
            name='Bless',
            level=1,
            school='enchantment',
            casting_time='1 action',
            range='30 feet',
            duration='Concentration, up to 1 minute',
            concentration=True,
            description='You bless up to three creatures.'
        )
        assert spell.concentration

    def test_spell_with_upcast(self):
        """Test spell with upcast data."""
        spell = Spell.objects.create(
            name='Fireball',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='150 feet',
            duration='Instantaneous',
            description='A bright streak flashes.',
            is_saving_throw=True,
            save_type='DEX',
            half_damage_on_save=True,
            upcast_dice_increment=1,
            upcast_die_size=6
        )
        assert spell.upcast_dice_increment == 1
        assert spell.upcast_die_size == 6
        assert spell.is_saving_throw
        assert spell.save_type == 'DEX'
        assert spell.half_damage_on_save

    def test_spell_str(self):
        """Test spell string representation."""
        spell = Spell.objects.create(
            name='Fireball',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='150 feet',
            duration='Instantaneous',
            description='A bright streak flashes.'
        )
        assert str(spell) == 'Fireball (Level 3)'


@pytest.mark.django_db
class TestDamageComponentModel:
    """Tests for the DamageComponent model."""

    def test_create_damage_component(self):
        """Test creating a damage component."""
        spell = Spell.objects.create(
            name='Fireball',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='150 feet',
            duration='Instantaneous',
            description='A bright streak flashes.'
        )

        damage = DamageComponent.objects.create(
            spell=spell,
            dice_count=8,
            die_size=6,
            damage_type='fire',
            timing='on_fail',
            is_verified=True
        )

        assert damage.dice_count == 8
        assert damage.die_size == 6
        assert damage.damage_type == 'fire'
        assert damage.timing == 'on_fail'
        assert damage.is_verified

    def test_damage_component_with_modifier(self):
        """Test damage component with flat modifier."""
        spell = Spell.objects.create(
            name='Test Spell',
            level=1,
            school='evocation',
            casting_time='1 action',
            range='60 feet',
            duration='Instantaneous',
            description='Test description'
        )

        damage = DamageComponent.objects.create(
            spell=spell,
            dice_count=1,
            die_size=10,
            flat_modifier=5,
            damage_type='force',
            timing='on_hit'
        )

        assert damage.flat_modifier == 5

    def test_multiple_damage_components(self):
        """Test spell with multiple damage components."""
        spell = Spell.objects.create(
            name='Ice Knife',
            level=1,
            school='conjuration',
            casting_time='1 action',
            range='60 feet',
            duration='Instantaneous',
            description='Ice knife attack and explosion.'
        )

        # Primary damage on hit
        DamageComponent.objects.create(
            spell=spell,
            dice_count=1,
            die_size=10,
            damage_type='piercing',
            timing='on_hit'
        )

        # Secondary damage on fail
        DamageComponent.objects.create(
            spell=spell,
            dice_count=2,
            die_size=6,
            damage_type='cold',
            timing='on_fail'
        )

        assert spell.damage_components.count() == 2

    def test_zero_dice_count_flat_only_damage(self):
        """dice_count=0 is a valid flat-only component (e.g. Savage Attacker 0d0+5)."""
        spell = Spell.objects.create(
            name='Flat Damage Spell', level=1, school='abjuration',
            casting_time='1 action', range='Touch', duration='Instantaneous',
            description='Pure flat damage.'
        )
        dc = DamageComponent.objects.create(
            spell=spell, dice_count=0, die_size=0, flat_modifier=5,
            damage_type='force', timing='on_hit',
        )
        assert dc.dice_count == 0
        assert dc.flat_modifier == 5

    def test_negative_flat_modifier(self):
        """A negative flat_modifier is stored and retrieved correctly."""
        spell = Spell.objects.create(
            name='Penalised Spell', level=1, school='necromancy',
            casting_time='1 action', range='60 feet', duration='Instantaneous',
            description='Reduced damage.'
        )
        dc = DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=8, flat_modifier=-3,
            damage_type='necrotic', timing='on_fail',
        )
        assert dc.flat_modifier == -3

    def test_all_timing_choices_are_storable(self):
        """Every TIMING_CHOICES value can be persisted without validation error."""
        spell = Spell.objects.create(
            name='Multi-timing Spell', level=3, school='evocation',
            casting_time='1 action', range='30 feet', duration='1 minute',
            description='Complex spell.'
        )
        valid_timings = ['on_hit', 'on_fail', 'on_success', 'end_of_turn', 'per_round', 'delayed']
        for timing in valid_timings:
            dc = DamageComponent.objects.create(
                spell=spell, dice_count=1, die_size=6, damage_type='fire', timing=timing,
            )
            assert dc.timing == timing

    def test_on_crit_extra_false(self):
        """on_crit_extra can be explicitly set to False (e.g. DoT component)."""
        spell = Spell.objects.create(
            name='DoT Spell', level=2, school='necromancy',
            casting_time='1 action', range='60 feet', duration='Instantaneous',
            description='Damage over time spell.'
        )
        dc = DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=6, damage_type='necrotic',
            timing='per_round', on_crit_extra=False,
        )
        assert dc.on_crit_extra is False

    def test_condition_label_stored_and_retrieved(self):
        """condition_label (informational only) is stored and returned correctly."""
        spell = Spell.objects.create(
            name='Condition Spell', level=1, school='enchantment',
            casting_time='1 action', range='30 feet', duration='Instantaneous',
            description='Conditional damage.'
        )
        dc = DamageComponent.objects.create(
            spell=spell, dice_count=1, die_size=6, damage_type='psychic',
            timing='on_hit', condition_label='target is frightened',
        )
        assert dc.condition_label == 'target is frightened'

    def test_condition_label_null_by_default(self):
        """condition_label is None when not set."""
        spell = Spell.objects.create(
            name='Plain Spell', level=1, school='evocation',
            casting_time='1 action', range='60 feet', duration='Instantaneous',
            description='Plain damage.'
        )
        dc = DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=4, damage_type='fire', timing='on_hit',
        )
        assert dc.condition_label is None

    def test_per_component_upcast_increment_override(self):
        """upcast_dice_increment on DamageComponent overrides the spell-level increment."""
        spell = Spell.objects.create(
            name='Upcast Spell', level=2, school='evocation',
            casting_time='1 action', range='60 feet', duration='Instantaneous',
            description='Scales differently per component.',
            upcast_dice_increment=1,
        )
        dc = DamageComponent.objects.create(
            spell=spell, dice_count=2, die_size=6, damage_type='fire',
            timing='on_hit', upcast_dice_increment=2,
        )
        assert dc.upcast_dice_increment == 2

    def test_damage_component_str(self):
        """__str__ returns a human-readable summary."""
        spell = Spell.objects.create(
            name='Fireball', level=3, school='evocation',
            casting_time='1 action', range='150 feet', duration='Instantaneous',
            description='Fire explosion.'
        )
        dc = DamageComponent.objects.create(
            spell=spell, dice_count=8, die_size=6, damage_type='fire', timing='on_fail',
        )
        assert '8d6' in str(dc)
        assert 'fire' in str(dc)


@pytest.mark.django_db
class TestSpellParsingMetadata:
    """Tests for SpellParsingMetadata model."""

    def test_create_parsing_metadata(self):
        """Test creating parsing metadata."""
        spell = Spell.objects.create(
            name='Test Spell',
            level=1,
            school='evocation',
            casting_time='1 action',
            range='60 feet',
            duration='Instantaneous',
            description='Test'
        )

        metadata = SpellParsingMetadata.objects.create(
            spell=spell,
            parsing_confidence=0.85,
            requires_review=False,
            parsing_notes={'test': 'data'}
        )

        assert metadata.parsing_confidence == 0.85
        assert not metadata.requires_review

    def test_review_workflow(self):
        """Test spell review workflow."""
        user = User.objects.create_user(
            username='reviewer',
            email='reviewer@example.com',
            password='pass123'
        )

        spell = Spell.objects.create(
            name='Test Spell',
            level=1,
            school='evocation',
            casting_time='1 action',
            range='60 feet',
            duration='Instantaneous',
            description='Test'
        )

        metadata = SpellParsingMetadata.objects.create(
            spell=spell,
            parsing_confidence=0.5,
            requires_review=True
        )

        from django.utils import timezone
        # Mark as reviewed
        metadata.reviewed_by = user
        metadata.reviewed_at = timezone.now()
        metadata.save()

        assert metadata.reviewed_by == user
        assert metadata.reviewed_at is not None


@pytest.mark.django_db
class TestSpellbookModel:
    """Tests for Spellbook and PreparedSpell models."""

    def test_create_spellbook(self):
        """Test creating a spellbook."""
        user = User.objects.create_user(
            username='player',
            email='player@example.com',
            password='pass123'
        )

        spellbook = Spellbook.objects.create(
            owner=user,
            name='My Wizard Spells',
            description='Spells for my wizard character'
        )

        assert spellbook.name == 'My Wizard Spells'
        assert spellbook.owner == user
        assert spellbook.spells.count() == 0

    def test_add_spell_to_spellbook(self):
        """Test adding spells to a spellbook."""
        user = User.objects.create_user(
            username='player',
            email='player@example.com',
            password='pass123'
        )

        spellbook = Spellbook.objects.create(
            owner=user,
            name='My Spells'
        )

        spell1 = Spell.objects.create(
            name='Fireball',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='150 feet',
            duration='Instantaneous',
            description='Fire damage'
        )

        spell2 = Spell.objects.create(
            name='Magic Missile',
            level=1,
            school='evocation',
            casting_time='1 action',
            range='120 feet',
            duration='Instantaneous',
            description='Force damage'
        )

        # Add spells via PreparedSpell
        PreparedSpell.objects.create(
            spellbook=spellbook,
            spell=spell1,
            prepared=True,
            notes='My favorite damage spell'
        )

        PreparedSpell.objects.create(
            spellbook=spellbook,
            spell=spell2,
        )

        assert spellbook.spells.count() == 2
        assert spellbook.prepared_spells.filter(prepared=True).count() == 1

    def test_spellbook_str(self):
        """Test spellbook string representation."""
        user = User.objects.create_user(
            username='player',
            email='player@example.com',
            password='pass123'
        )

        spellbook = Spellbook.objects.create(
            owner=user,
            name='Wizard Spells'
        )

        assert str(spellbook) == 'Wizard Spells (player)'


@pytest.mark.django_db
class TestAnalysisModels:
    """Tests for AnalysisContext and SpellComparison models."""

    def test_create_analysis_context(self):
        """Test creating an analysis context."""
        context = AnalysisContext.objects.create(
            target_ac=15,
            caster_attack_bonus=5,
            spell_save_dc=13,
            number_of_targets=1,
        )

        assert context.target_ac == 15
        assert context.caster_attack_bonus == 5
        assert context.number_of_targets == 1

    def test_create_spell_comparison(self):
        """Test creating a spell comparison."""
        spell1 = Spell.objects.create(
            name='Fireball',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='150 feet',
            duration='Instantaneous',
            description='Fire damage'
        )

        spell2 = Spell.objects.create(
            name='Lightning Bolt',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='100 feet',
            duration='Instantaneous',
            description='Lightning damage'
        )

        context = AnalysisContext.objects.create(
            target_ac=15,
            spell_save_dc=13
        )

        comparison = SpellComparison.objects.create(
            spell_a=spell1,
            spell_b=spell2,
            context=context,
            results={
                'spell_a_avg_damage': 28.0,
                'spell_b_avg_damage': 28.0,
                'winner': 'tie'
            }
        )

        assert comparison.spell_a == spell1
        assert comparison.spell_b == spell2
        assert comparison.results['winner'] == 'tie'


@pytest.mark.django_db
class TestCharacterMaxPreparedSpells:
    """Tests for the Character.max_prepared_spells computed property.

    Covers every ruleset/class branch: 2024 wizard lookup table, 2014
    mod+level formula, half-level classes, spells-known (None) classes,
    ruleset differences (paladin, bard), and the prepared_spells_bonus field.
    """

    @pytest.fixture
    def user(self, db):
        return User.objects.create_user(
            username='chartest', email='chartest@example.com', password='pass'
        )

    def _char(self, owner, **kwargs) -> Character:
        """Instantiate an *unsaved* Character; max_prepared_spells is a pure property."""
        defaults = dict(
            name='Test Hero',
            owner=owner,
            character_class='wizard',
            character_level=5,
            spellcasting_ability_modifier=3,
            ruleset='2014',
            prepared_spells_bonus=0,
        )
        defaults.update(kwargs)
        return Character(**defaults)

    # ── 2024 Wizard lookup table ───────────────────────────────────────────

    def test_wizard_2024_uses_lookup_table(self, user):
        """2024 Wizard returns fixed table values regardless of modifier."""
        cases = [(1, 4), (5, 9), (10, 15), (20, 25)]
        for level, expected in cases:
            char = self._char(
                user, character_class='wizard', ruleset='2024',
                character_level=level, spellcasting_ability_modifier=5,
            )
            assert char.max_prepared_spells == expected, f"level {level}"

    def test_wizard_2024_mod_ignored(self, user):
        """2024 Wizard: changing the modifier does not change the result."""
        char_high = self._char(user, character_class='wizard', ruleset='2024',
                               character_level=5, spellcasting_ability_modifier=5)
        char_low = self._char(user, character_class='wizard', ruleset='2024',
                              character_level=5, spellcasting_ability_modifier=0)
        assert char_high.max_prepared_spells == char_low.max_prepared_spells == 9

    # ── 2014 Wizard formula ───────────────────────────────────────────────

    def test_wizard_2014_mod_plus_level(self, user):
        """2014 Wizard uses max(1, mod + level)."""
        char = self._char(user, character_class='wizard', ruleset='2014',
                          character_level=5, spellcasting_ability_modifier=3)
        assert char.max_prepared_spells == 8  # 3 + 5

    def test_wizard_2014_clamped_to_one(self, user):
        """Negative-modifier 2014 Wizard at level 1 is clamped to 1."""
        char = self._char(user, character_class='wizard', ruleset='2014',
                          character_level=1, spellcasting_ability_modifier=-3)
        assert char.max_prepared_spells == 1  # max(1, -3+1) = 1

    # ── prepared_spells_bonus ─────────────────────────────────────────────

    def test_prepared_spells_bonus_stacks(self, user):
        """prepared_spells_bonus is always added on top of the class base."""
        char = self._char(user, character_class='cleric', ruleset='2014',
                          character_level=4, spellcasting_ability_modifier=2,
                          prepared_spells_bonus=3)
        assert char.max_prepared_spells == 9  # (2+4) + 3

    def test_prepared_spells_bonus_on_2024_wizard(self, user):
        """Bonus also stacks on the fixed 2024 lookup value."""
        char = self._char(user, character_class='wizard', ruleset='2024',
                          character_level=5, prepared_spells_bonus=2)
        assert char.max_prepared_spells == 11  # table[5]=9 + 2

    # ── Paladin ruleset difference ────────────────────────────────────────

    def test_paladin_2014_uses_half_level(self, user):
        """2014 Paladin uses max(1, mod + level // 2)."""
        char = self._char(user, character_class='paladin', ruleset='2014',
                          character_level=6, spellcasting_ability_modifier=4)
        assert char.max_prepared_spells == 7  # 4 + 6//2 = 4 + 3

    def test_paladin_2024_uses_full_level(self, user):
        """2024 Paladin uses full level, not half-level."""
        char = self._char(user, character_class='paladin', ruleset='2024',
                          character_level=6, spellcasting_ability_modifier=4)
        assert char.max_prepared_spells == 10  # 4 + 6

    # ── Other class branches ──────────────────────────────────────────────

    def test_artificer_half_level(self, user):
        """Artificer always uses max(1, mod + level // 2) regardless of ruleset."""
        char = self._char(user, character_class='artificer', ruleset='2014',
                          character_level=8, spellcasting_ability_modifier=3)
        assert char.max_prepared_spells == 7  # 3 + 8//2 = 3 + 4

    def test_bard_2014_returns_none(self, user):
        """2014 Bard uses a spells-known model → None."""
        char = self._char(user, character_class='bard', ruleset='2014',
                          character_level=5, spellcasting_ability_modifier=3)
        assert char.max_prepared_spells is None

    def test_bard_2024_uses_mod_plus_level(self, user):
        """2024 Bard gains a prepared-spell model, returns mod + level."""
        char = self._char(user, character_class='bard', ruleset='2024',
                          character_level=5, spellcasting_ability_modifier=3)
        assert char.max_prepared_spells == 8  # 3 + 5

    def test_ranger_2024_half_level(self, user):
        """2024 Ranger uses max(1, mod + level // 2)."""
        char = self._char(user, character_class='ranger', ruleset='2024',
                          character_level=6, spellcasting_ability_modifier=2)
        assert char.max_prepared_spells == 5  # 2 + 6//2 = 2 + 3

    def test_spells_known_class_returns_none(self, user):
        """Sorcerer (spells-known model) returns None."""
        char = self._char(user, character_class='sorcerer')
        assert char.max_prepared_spells is None

    def test_no_class_returns_none(self, user):
        """A character with no class set returns None."""
        char = self._char(user, character_class='')
        assert char.max_prepared_spells is None
