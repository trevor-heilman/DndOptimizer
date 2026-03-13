"""
Tests for advanced Spell view actions and user account management.

Covers:
- SpellViewSet.duplicate
- SpellViewSet.bulk_delete (custom, imported, system)
- SpellViewSet.export_multiple
- SpellViewSet.needs_review  (staff only)
- SpellViewSet.mark_reviewed (staff only)
- DamageComponentViewSet with spell_id filter
- UserViewSet.change_password
- UserViewSet.get_queryset (staff branch)
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from spells.models import DamageComponent, Spell

User = get_user_model()


# ── fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def user(db):
    return User.objects.create_user(
        username='spelltester', email='spell@example.com', password='pass123'
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_superuser(
        username='staffuser', email='staff@example.com', password='pass123'
    )


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def staff_client(staff_user):
    c = APIClient()
    c.force_authenticate(user=staff_user)
    return c


@pytest.fixture
def system_spell(db):
    """A system spell (no owner, not custom) seeded by admin."""
    spell = Spell.objects.create(
        name='Magic Missile', level=1, school='evocation',
        casting_time='1 action', range='120 feet', duration='Instantaneous',
        description='Three darts.', is_custom=False, created_by=None,
    )
    DamageComponent.objects.create(
        spell=spell, dice_count=1, die_size=4, flat_modifier=1,
        damage_type='force', timing='on_hit',
    )
    return spell


@pytest.fixture
def custom_spell(user):
    """A custom spell created by the test user."""
    spell = Spell.objects.create(
        name='My Custom Spell', level=2, school='abjuration',
        casting_time='1 action', range='Self', duration='1 minute',
        description='Custom magic.', is_custom=True, created_by=user,
    )
    DamageComponent.objects.create(
        spell=spell, dice_count=3, die_size=6, damage_type='radiant', timing='on_hit',
    )
    return spell


@pytest.fixture
def imported_spell(user):
    """A user-imported spell (non-custom but owned by user)."""
    return Spell.objects.create(
        name='Imported Spell', level=2, school='transmutation',
        casting_time='1 action', range='60 feet', duration='Instantaneous',
        description='An imported spell.', is_custom=False, created_by=user,
    )


# ── SpellViewSet.duplicate ─────────────────────────────────────────────────────

@pytest.mark.django_db
class TestSpellDuplicate:

    def test_duplicate_spell(self, client, system_spell):
        response = client.post(f'/api/spells/spells/{system_spell.id}/duplicate/')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == f'{system_spell.name} (Copy)'
        assert response.data['is_custom'] is True
        # Original still exists
        assert Spell.objects.filter(id=system_spell.id).exists()
        # Copy has the same damage components
        copy_id = response.data['id']
        assert DamageComponent.objects.filter(spell_id=copy_id).count() == 1

    def test_duplicate_requires_auth(self, system_spell):
        anon = APIClient()
        response = anon.post(f'/api/spells/spells/{system_spell.id}/duplicate/')
        # Either 401 (unauthenticated) or 403 depending on DRF config
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN
        )


# ── SpellViewSet.bulk_delete ───────────────────────────────────────────────────

@pytest.mark.django_db
class TestBulkDelete:

    def test_bulk_delete_custom_spells(self, client, custom_spell):
        assert Spell.objects.filter(is_custom=True, created_by__username='spelltester').count() == 1
        response = client.post(
            '/api/spells/spells/bulk_delete/',
            {'categories': ['custom']},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        # deleted count includes cascade rows (damage components etc.)
        assert response.data['deleted'] >= 1
        assert not Spell.objects.filter(id=custom_spell.id).exists()

    def test_bulk_delete_imported_spells(self, client, imported_spell):
        response = client.post(
            '/api/spells/spells/bulk_delete/',
            {'categories': ['imported']},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['deleted'] == 1
        assert not Spell.objects.filter(id=imported_spell.id).exists()

    def test_bulk_delete_system_requires_staff(self, client, system_spell):
        response = client.post(
            '/api/spells/spells/bulk_delete/',
            {'categories': ['system']},
            format='json',
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_bulk_delete_system_by_staff(self, staff_client, system_spell):
        response = staff_client.post(
            '/api/spells/spells/bulk_delete/',
            {'categories': ['system']},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        # deleted count includes cascade rows (damage components etc.)
        assert response.data['deleted'] >= 1
        assert not Spell.objects.filter(id=system_spell.id).exists()

    def test_bulk_delete_invalid_category(self, client):
        response = client.post(
            '/api/spells/spells/bulk_delete/',
            {'categories': ['invalid']},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_delete_empty_categories(self, client):
        response = client.post(
            '/api/spells/spells/bulk_delete/',
            {'categories': []},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_bulk_delete_multiple_categories(self, client, custom_spell, imported_spell):
        response = client.post(
            '/api/spells/spells/bulk_delete/',
            {'categories': ['custom', 'imported']},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['deleted'] >= 2  # includes cascade rows
        assert not Spell.objects.filter(id=custom_spell.id).exists()
        assert not Spell.objects.filter(id=imported_spell.id).exists()


# ── SpellViewSet.export_multiple ──────────────────────────────────────────────

@pytest.mark.django_db
class TestExportMultiple:

    def test_export_multiple_spells(self, client, system_spell, custom_spell):
        response = client.post(
            '/api/spells/spells/export_multiple/',
            {'spell_ids': [str(system_spell.id), str(custom_spell.id)]},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert 'spells' in response.data
        assert response.data['count'] == 2

    def test_export_multiple_missing_ids(self, client):
        response = client.post(
            '/api/spells/spells/export_multiple/',
            {'spell_ids': []},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_export_single_spell(self, client, system_spell):
        response = client.get(f'/api/spells/spells/{system_spell.id}/export/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == system_spell.name


# ── SpellViewSet.needs_review / mark_reviewed (staff only) ───────────────────

@pytest.mark.django_db
class TestAdminSpellActions:

    def test_needs_review_requires_staff(self, client):
        response = client.get('/api/spells/spells/needs_review/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_needs_review_staff_empty(self, staff_client):
        response = staff_client.get('/api/spells/spells/needs_review/')
        assert response.status_code == status.HTTP_200_OK

    def test_needs_review_returns_flagged_spells(self, staff_client, system_spell):
        from spells.models import SpellParsingMetadata
        SpellParsingMetadata.objects.create(
            spell=system_spell,
            requires_review=True,
            parsing_confidence=0.5,
        )
        response = staff_client.get('/api/spells/spells/needs_review/')
        assert response.status_code == status.HTTP_200_OK

    def test_mark_reviewed_requires_staff(self, client, system_spell):
        response = client.post(f'/api/spells/spells/{system_spell.id}/mark_reviewed/')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_mark_reviewed_no_metadata_returns_400(self, staff_client, system_spell):
        response = staff_client.post(
            f'/api/spells/spells/{system_spell.id}/mark_reviewed/'
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_mark_reviewed_success(self, staff_client, system_spell):
        from spells.models import SpellParsingMetadata
        SpellParsingMetadata.objects.create(
            spell=system_spell,
            requires_review=True,
            parsing_confidence=0.7,
        )
        response = staff_client.post(
            f'/api/spells/spells/{system_spell.id}/mark_reviewed/'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'reviewed'


# ── DamageComponentViewSet with spell_id filter ───────────────────────────────

@pytest.mark.django_db
class TestDamageComponentFilter:

    def test_filter_by_spell_id(self, client, system_spell, custom_spell):
        response = client.get(
            f'/api/spells/damage-components/?spell_id={system_spell.id}'
        )
        assert response.status_code == status.HTTP_200_OK
        # Should return only the 1 component belonging to system_spell
        result_list = response.data if isinstance(response.data, list) else response.data.get('results', [])
        assert len(result_list) == 1

    def test_list_all_components_without_filter(self, client, system_spell, custom_spell):
        response = client.get('/api/spells/damage-components/')
        assert response.status_code == status.HTTP_200_OK
        # Both spells have 1 damage component each, so 2 total
        result_list = response.data if isinstance(response.data, list) else response.data.get('results', [])
        assert len(result_list) == 2


# ── UserViewSet.change_password ───────────────────────────────────────────────

@pytest.mark.django_db
class TestChangePassword:

    def test_change_password_success(self, client, user):
        response = client.post(
            '/api/users/change_password/',
            {'old_password': 'pass123', 'new_password': 'NewSecure456!', 'new_password_confirm': 'NewSecure456!'},
            format='json',
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['message'] == 'Password changed successfully'
        # Verify new password works
        user.refresh_from_db()
        assert user.check_password('NewSecure456!')

    def test_change_password_wrong_old_password(self, client, user):
        response = client.post(
            '/api/users/change_password/',
            {'old_password': 'wrong_password', 'new_password': 'NewSecure456!', 'new_password_confirm': 'NewSecure456!'},
            format='json',
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_requires_auth(self):
        anon = APIClient()
        response = anon.post(
            '/api/users/change_password/',
            {'old_password': 'pass123', 'new_password': 'new', 'new_password_confirm': 'new'},
            format='json',
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── UserViewSet staff queryset ────────────────────────────────────────────────

@pytest.mark.django_db
class TestUserViewSetStaff:

    def test_staff_can_see_all_users(self, staff_client, user):
        response = staff_client.get('/api/users/')
        assert response.status_code == status.HTTP_200_OK
        # Staff should see more than just their own profile
        usernames = [u['username'] for u in response.data['results']]
        assert 'spelltester' in usernames

    def test_regular_user_sees_only_self(self, client, user, staff_user):
        response = client.get('/api/users/')
        assert response.status_code == status.HTTP_200_OK
        # Only own profile
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['username'] == 'spelltester'
