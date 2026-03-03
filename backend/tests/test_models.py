"""
Unit tests for model layer.
"""
import pytest
from django.contrib.auth import get_user_model
from spells.models import Spell, DamageComponent, SpellParsingMetadata
from spellbooks.models import Spellbook, PreparedSpell
from analysis.models import AnalysisContext, SpellComparison

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Tests for the custom User model."""
    
    def test_create_user(self):
        """Test creating a user with email."""
        user = User.objects.create_user(
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
            email='admin@example.com',
            password='adminpass123'
        )
        assert admin.is_staff
        assert admin.is_superuser
        assert admin.is_active
    
    def test_user_str(self):
        """Test user string representation."""
        user = User.objects.create_user(
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
        assert str(spell) == 'Fireball'


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
        assert not metadata.is_reviewed
    
    def test_review_workflow(self):
        """Test spell review workflow."""
        user = User.objects.create_user(
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
        
        # Mark as reviewed
        metadata.is_reviewed = True
        metadata.reviewed_by = user
        metadata.save()
        
        assert metadata.is_reviewed
        assert metadata.reviewed_by == user
        assert metadata.reviewed_at is not None


@pytest.mark.django_db
class TestSpellbookModel:
    """Tests for Spellbook and PreparedSpell models."""
    
    def test_create_spellbook(self):
        """Test creating a spellbook."""
        user = User.objects.create_user(
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
            is_prepared=True,
            notes='My favorite damage spell'
        )
        
        PreparedSpell.objects.create(
            spellbook=spellbook,
            spell=spell2,
            is_prepared=False
        )
        
        assert spellbook.spells.count() == 2
        assert spellbook.prepared_spells.filter(is_prepared=True).count() == 1
    
    def test_spellbook_str(self):
        """Test spellbook string representation."""
        user = User.objects.create_user(
            email='player@example.com',
            password='pass123'
        )
        
        spellbook = Spellbook.objects.create(
            owner=user,
            name='Wizard Spells'
        )
        
        assert str(spellbook) == 'Wizard Spells (player@example.com)'


@pytest.mark.django_db
class TestAnalysisModels:
    """Tests for AnalysisContext and SpellComparison models."""
    
    def test_create_analysis_context(self):
        """Test creating an analysis context."""
        context = AnalysisContext.objects.create(
            target_ac=15,
            target_saves={'DEX': 12, 'WIS': 10},
            caster_spell_attack_bonus=5,
            caster_spell_save_dc=13,
            advantage_disadvantage='normal',
            num_targets=1
        )
        
        assert context.target_ac == 15
        assert context.caster_spell_attack_bonus == 5
        assert context.advantage_disadvantage == 'normal'
    
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
            caster_spell_save_dc=13
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
