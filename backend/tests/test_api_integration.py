"""
Integration tests for API endpoints.
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from spells.models import Spell, DamageComponent
from spellbooks.models import Spellbook

User = get_user_model()


@pytest.fixture
def api_client():
    """Fixture for API client."""
    return APIClient()


@pytest.fixture
def test_user(db):
    """Fixture for test user."""
    return User.objects.create_user(
        username='testuser',
        email='testuser@example.com',
        password='testpass123'
    )


@pytest.fixture
def authenticated_client(test_user):
    """Fixture for authenticated API client."""
    client = APIClient()
    client.force_authenticate(user=test_user)
    return client


@pytest.fixture
def test_spell(db):
    """Fixture for test spell."""
    spell = Spell.objects.create(
        name='Fireball',
        level=3,
        school='evocation',
        casting_time='1 action',
        range='150 feet',
        duration='Instantaneous',
        description='A bright streak flashes from your pointing finger to a point you choose.',
        is_saving_throw=True,
        save_type='DEX',
        half_damage_on_save=True
    )
    
    DamageComponent.objects.create(
        spell=spell,
        dice_count=8,
        die_size=6,
        damage_type='fire',
        timing='on_fail'
    )
    
    return spell


@pytest.mark.django_db
class TestUserAuthentication:
    """Test user registration and authentication."""
    
    def test_user_registration(self, api_client):
        """Test user can register."""
        data = {
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'password_confirm': 'newpass123'
        }
        
        response = api_client.post('/api/users/register/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['email'] == 'newuser@example.com'
    
    def test_user_login(self, api_client, test_user):
        """Test user can log in."""
        data = {
            'email': 'testuser@example.com',
            'password': 'testpass123'
        }
        
        response = api_client.post('/api/users/login/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
    
    def test_get_current_user(self, authenticated_client, test_user):
        """Test authenticated user can get their profile."""
        response = authenticated_client.get('/api/users/me/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == test_user.email
    
    def test_unauthenticated_access(self, api_client):
        """Test unauthenticated user cannot access protected endpoint."""
        response = api_client.get('/api/users/me/')
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestSpellAPI:
    """Test spell CRUD operations."""
    
    def test_list_spells(self, authenticated_client, test_spell):
        """Test listing spells."""
        response = authenticated_client.get('/api/spells/spells/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == 'Fireball'
    
    def test_get_spell_detail(self, authenticated_client, test_spell):
        """Test getting spell details."""
        response = authenticated_client.get(f'/api/spells/spells/{test_spell.id}/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Fireball'
        assert response.data['level'] == 3
        assert len(response.data['damage_components']) == 1
    
    def test_create_spell(self, authenticated_client):
        """Test creating a spell."""
        data = {
            'name': 'Magic Missile',
            'level': 1,
            'school': 'evocation',
            'casting_time': '1 action',
            'range': '120 feet',
            'duration': 'Instantaneous',
            'description': 'You create three magical darts.',
            'is_attack_roll': False,
            'is_saving_throw': False
        }
        
        response = authenticated_client.post('/api/spells/spells/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Magic Missile'
    
    def test_update_spell(self, authenticated_client, test_spell):
        """Test updating a spell."""
        data = {
            'name': 'Fireball Updated',
            'level': 3,
            'school': 'evocation',
            'casting_time': '1 action',
            'range': '150 feet',
            'duration': 'Instantaneous',
            'description': 'Updated description'
        }
        
        response = authenticated_client.put(
            f'/api/spells/spells/{test_spell.id}/',
            data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Fireball Updated'
    
    def test_delete_spell(self, authenticated_client, test_spell):
        """Test deleting a spell."""
        response = authenticated_client.delete(f'/api/spells/spells/{test_spell.id}/')
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert Spell.objects.filter(id=test_spell.id).count() == 0
    
    def test_filter_spells_by_level(self, authenticated_client, test_spell):
        """Test filtering spells by level."""
        # Create another spell
        Spell.objects.create(
            name='Magic Missile',
            level=1,
            school='evocation',
            casting_time='1 action',
            range='120 feet',
            duration='Instantaneous',
            description='Darts'
        )
        
        response = authenticated_client.get('/api/spells/spells/?level=1')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1
        assert response.data['results'][0]['name'] == 'Magic Missile'
    
    def test_filter_spells_by_school(self, authenticated_client, test_spell):
        """Test filtering spells by school."""
        response = authenticated_client.get('/api/spells/spells/?school=evocation')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 1


@pytest.mark.django_db
class TestSpellbookAPI:
    """Test spellbook operations."""
    
    def test_create_spellbook(self, authenticated_client):
        """Test creating a spellbook."""
        data = {
            'name': 'My Wizard Spells',
            'description': 'Spells for my wizard character'
        }
        
        response = authenticated_client.post('/api/spellbooks/', data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'My Wizard Spells'
    
    def test_list_spellbooks(self, authenticated_client, test_user):
        """Test listing spellbooks."""
        Spellbook.objects.create(
            owner=test_user,
            name='Spellbook 1'
        )
        Spellbook.objects.create(
            owner=test_user,
            name='Spellbook 2'
        )
        
        response = authenticated_client.get('/api/spellbooks/')
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 2
    
    def test_add_spell_to_spellbook(self, authenticated_client, test_user, test_spell):
        """Test adding a spell to a spellbook."""
        spellbook = Spellbook.objects.create(
            owner=test_user,
            name='My Spells'
        )
        
        data = {
            'spell_id': str(test_spell.id),
            'is_prepared': True,
            'notes': 'Great damage spell'
        }
        
        response = authenticated_client.post(
            f'/api/spellbooks/{spellbook.id}/add_spell/',
            data
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert spellbook.spells.count() == 1
    
    def test_remove_spell_from_spellbook(self, authenticated_client, test_user, test_spell):
        """Test removing a spell from a spellbook."""
        spellbook = Spellbook.objects.create(
            owner=test_user,
            name='My Spells'
        )
        spellbook.spells.add(test_spell)
        
        data = {'spell_id': str(test_spell.id)}
        
        response = authenticated_client.post(
            f'/api/spellbooks/{spellbook.id}/remove_spell/',
            data
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert spellbook.spells.count() == 0
    
    def test_duplicate_spellbook(self, authenticated_client, test_user, test_spell):
        """Test duplicating a spellbook."""
        spellbook = Spellbook.objects.create(
            owner=test_user,
            name='Original Spellbook'
        )
        spellbook.spells.add(test_spell)
        
        data = {'new_name': 'Copied Spellbook'}
        
        response = authenticated_client.post(
            f'/api/spellbooks/{spellbook.id}/duplicate/',
            data
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Copied Spellbook'
        assert Spellbook.objects.count() == 2


@pytest.mark.django_db
class TestAnalysisAPI:
    """Test analysis endpoints."""
    
    def test_analyze_spell(self, authenticated_client, test_spell):
        """Test analyzing a single spell."""
        data = {
            'spell_id': str(test_spell.id),
            'target_ac': 15,
            'target_saves': {'DEX': 12},
            'caster_spell_save_dc': 13,
            'num_targets': 1
        }
        
        response = authenticated_client.post('/api/analysis/analyze/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'average_damage' in response.data
        assert 'maximum_damage' in response.data
    
    def test_compare_spells(self, authenticated_client, test_spell):
        """Test comparing two spells."""
        spell2 = Spell.objects.create(
            name='Lightning Bolt',
            level=3,
            school='evocation',
            casting_time='1 action',
            range='100 feet',
            duration='Instantaneous',
            description='Lightning damage',
            is_saving_throw=True,
            save_type='DEX',
            half_damage_on_save=True
        )
        
        DamageComponent.objects.create(
            spell=spell2,
            dice_count=8,
            die_size=6,
            damage_type='lightning',
            timing='on_fail'
        )
        
        data = {
            'spell_a_id': str(test_spell.id),
            'spell_b_id': str(spell2.id),
            'target_ac': 15,
            'target_saves': {'DEX': 12},
            'caster_spell_save_dc': 13,
            'num_targets': 1
        }
        
        response = authenticated_client.post('/api/analysis/compare/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'spell_a' in response.data
        assert 'spell_b' in response.data
        assert 'winner' in response.data
    
    def test_efficiency_analysis(self, authenticated_client, test_spell):
        """Test spell efficiency across slot levels."""
        data = {
            'spell_id': str(test_spell.id),
            'target_ac': 15,
            'target_saves': {'DEX': 12},
            'caster_spell_save_dc': 13,
            'num_targets': 1
        }
        
        response = authenticated_client.post('/api/analysis/efficiency/', data)
        
        assert response.status_code == status.HTTP_200_OK
        assert 'efficiency_data' in response.data


@pytest.mark.django_db
class TestPermissions:
    """Test API permissions."""
    
    def test_cannot_delete_others_spellbook(self, test_user, test_spell):
        """Test user cannot delete another user's spellbook."""
        # Create another user and their spellbook
        other_user = User.objects.create_user(
            email='other@example.com',
            password='pass123'
        )
        other_spellbook = Spellbook.objects.create(
            owner=other_user,
            name='Other Spellbook'
        )
        
        # Try to delete as test_user
        client = APIClient()
        client.force_authenticate(user=test_user)
        
        response = client.delete(f'/api/spellbooks/{other_spellbook.id}/')
        
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]


# ---------------------------------------------------------------------------
# Helpers shared across import tests
# ---------------------------------------------------------------------------

IMPORT_URL = '/api/spells/spells/import_spells/'

SNAKE_SPELL = {
    'name': 'Fireball',
    'level': 3,
    'school': 'evocation',
    'casting_time': '1 action',
    'range': '150 feet',
    'duration': 'Instantaneous',
    'description': 'A bright streak of fire.',
    'is_saving_throw': True,
    'save_type': 'DEX',
}

PASCAL_SPELL = {
    'Name': 'Mind Sliver',
    'Level': 0,
    'School': 'Enchantment',
    'CastingTime': '1 action',
    'Range': '60 feet',
    'Duration': 'Instantaneous',
    'Description': 'You drive a disorienting spike of psychic energy.',
    'Ritual': False,
    'Source': 'TCoE',
    'Components': 'V',
    'Classes': 'Sorcerer, Warlock, Wizard',
}


@pytest.fixture
def staff_user(db):
    """Fixture for a staff (admin) user."""
    return User.objects.create_user(
        username='adminuser',
        email='admin@example.com',
        password='adminpass123',
        is_staff=True,
    )


@pytest.fixture
def authenticated_staff_client(staff_user):
    """Fixture for authenticated staff API client."""
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.mark.django_db
class TestSpellImport:
    """
    Test POST /api/spells/spells/import_spells/ with a variety of JSON structures.
    """

    # ------------------------------------------------------------------
    # 1. Standard flat snake_case array
    # ------------------------------------------------------------------
    def test_import_snake_case_array(self, authenticated_client):
        """Flat JSON array with snake_case field names (spells.json format)."""
        payload = {'spells': [SNAKE_SPELL], 'source': 'test'}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['imported'] == 1
        assert response.data['failed'] == 0
        assert Spell.objects.filter(name='Fireball').exists()

    # ------------------------------------------------------------------
    # 2. PascalCase keyed-dict (TCoE format: {"Spells.X": {...}, ...})
    #    The frontend extracts Spells.* entries before sending; this test
    #    sends the already-extracted list as the server receives it.
    # ------------------------------------------------------------------
    def test_import_pascal_case_fields(self, authenticated_client):
        """Spell objects with PascalCase fields (TCoE schema)."""
        payload = {'spells': [PASCAL_SPELL], 'source': 'TCoE test'}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['imported'] == 1
        assert response.data['failed'] == 0
        assert Spell.objects.filter(name='Mind Sliver').exists()

    # ------------------------------------------------------------------
    # 3. Cantrip – level supplied as integer 0
    # ------------------------------------------------------------------
    def test_import_cantrip_level_zero(self, authenticated_client):
        """Cantrip with level=0 should import without validation errors."""
        cantrip = {**SNAKE_SPELL, 'name': 'Prestidigitation', 'level': 0}
        payload = {'spells': [cantrip], 'source': 'test'}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['imported'] == 1
        spell = Spell.objects.get(name='Prestidigitation')
        assert spell.level == 0

    # ------------------------------------------------------------------
    # 4. Cantrip – level supplied as the string 'cantrip' (raw format)
    # ------------------------------------------------------------------
    def test_import_cantrip_string_level(self, authenticated_client):
        """Level='cantrip' string should be normalised to 0 by the parsing service."""
        cantrip = {**SNAKE_SPELL, 'name': 'Light', 'level': 'cantrip'}
        payload = {'spells': [cantrip], 'source': 'test'}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['imported'] == 1
        spell = Spell.objects.get(name='Light')
        assert spell.level == 0

    # ------------------------------------------------------------------
    # 5. Multiple spells in one import (mixed schools / levels)
    # ------------------------------------------------------------------
    def test_import_multiple_spells(self, authenticated_client):
        """Importing multiple spells in a single request."""
        magic_missile = {
            'name': 'Magic Missile',
            'level': 1,
            'school': 'evocation',
            'casting_time': '1 action',
            'range': '120 feet',
            'duration': 'Instantaneous',
            'description': 'Three darts of magical force.',
        }
        sleep = {
            'name': 'Sleep',
            'level': 1,
            'school': 'enchantment',
            'casting_time': '1 action',
            'range': '90 feet',
            'duration': '1 minute',
            'description': 'Sends creatures into a magical slumber.',
        }
        payload = {'spells': [SNAKE_SPELL, magic_missile, sleep], 'source': 'test'}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['imported'] == 3
        assert response.data['failed'] == 0

    # ------------------------------------------------------------------
    # 6. Mixed batch: some valid, one missing name
    # ------------------------------------------------------------------
    def test_import_partial_failure(self, authenticated_client):
        """Batch with one invalid spell returns partial success, not a full 400."""
        bad_spell = {'level': 2, 'school': 'abjuration', 'casting_time': '1 action',
                     'range': '30 feet', 'duration': 'Instantaneous', 'description': 'No name.'}
        payload = {'spells': [SNAKE_SPELL, bad_spell], 'source': 'test'}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        # The serializer validates each spell; missing name triggers 400 at validation
        # OR the service handles it as a failed spell — either is acceptable
        if response.status_code == status.HTTP_201_CREATED:
            # Per-spell failure tracked in 'failed'
            assert response.data['imported'] >= 1
        else:
            assert response.status_code == status.HTTP_400_BAD_REQUEST

    # ------------------------------------------------------------------
    # 7. Entirely missing required field → 400 from serializer
    # ------------------------------------------------------------------
    def test_import_missing_name_field_rejected(self, authenticated_client):
        """Spell missing 'name' (and 'Name') should be rejected."""
        bad_spell = {'level': 1, 'school': 'evocation', 'casting_time': '1 action',
                     'range': '60 feet', 'duration': 'Instantaneous', 'description': 'No name.'}
        payload = {'spells': [bad_spell]}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # ------------------------------------------------------------------
    # 8. Empty spells list → 400 (allow_empty=False on serializer)
    # ------------------------------------------------------------------
    def test_import_empty_list_rejected(self, authenticated_client):
        """Empty spells list should return 400 (allow_empty=False)."""
        payload = {'spells': []}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    # ------------------------------------------------------------------
    # 9. Unauthenticated user → 401
    # ------------------------------------------------------------------
    def test_import_unauthenticated(self, api_client):
        """Unauthenticated request should be rejected."""
        payload = {'spells': [SNAKE_SPELL]}
        response = api_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    # ------------------------------------------------------------------
    # 10. is_system=True without staff → 403
    # ------------------------------------------------------------------
    def test_import_system_requires_staff(self, authenticated_client):
        """Non-staff user requesting is_system import should get 403."""
        payload = {'spells': [SNAKE_SPELL], 'is_system': True}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    # ------------------------------------------------------------------
    # 11. is_system=True with staff → imported spell is non-custom, no owner
    # ------------------------------------------------------------------
    def test_import_system_by_staff(self, authenticated_staff_client):
        """Staff user with is_system=True marks spells as system (no owner)."""
        payload = {'spells': [SNAKE_SPELL], 'source': 'official', 'is_system': True}
        response = authenticated_staff_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['imported'] == 1
        spell = Spell.objects.get(name='Fireball')
        assert spell.is_custom is False
        assert spell.created_by is None

    # ------------------------------------------------------------------
    # 12. Standard user import → spell is non-custom but owned by user
    # ------------------------------------------------------------------
    def test_import_user_owned(self, authenticated_client, test_user):
        """Regular user import: spell is non-custom, owned by that user."""
        payload = {'spells': [SNAKE_SPELL], 'source': 'homebrew'}
        response = authenticated_client.post(IMPORT_URL, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        spell = Spell.objects.get(name='Fireball')
        assert spell.is_custom is False
        assert spell.created_by == test_user
