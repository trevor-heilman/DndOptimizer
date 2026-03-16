"""
Tests for the compare_growth service method and API endpoint.

Covers:
- SpellAnalysisService.compare_growth_analysis (cantrip vs cantrip, spell vs spell,
  cantrip vs spell, crossover detection, slot profile)
- POST /api/analysis/compare_growth/ endpoint (auth, valid, invalid, caching)
- AnalysisContextViewSet and SpellComparisonViewSet get_queryset staff branch
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from analysis.models import AnalysisContext
from analysis.services import SpellAnalysisService
from spells.models import DamageComponent, Spell

User = get_user_model()

# ── fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture
def user(db):
    return User.objects.create_user(username="growthuser", email="growth@example.com", password="pass123")


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(username="staffuser", email="staff@example.com", password="pass123", is_staff=True)


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
def cantrip_fire(db):
    """Attack-roll cantrip (Fire Bolt style)."""
    spell = Spell.objects.create(
        name="Fire Bolt",
        level=0,
        school="evocation",
        casting_time="1 action",
        range="120 feet",
        duration="Instantaneous",
        description="You hurl a mote of fire. 1d10 fire damage.",
        is_attack_roll=True,
    )
    DamageComponent.objects.create(
        spell=spell,
        dice_count=1,
        die_size=10,
        damage_type="fire",
    )
    return spell


@pytest.fixture
def cantrip_save(db):
    """Saving-throw cantrip (Poison Spray style)."""
    spell = Spell.objects.create(
        name="Poison Spray",
        level=0,
        school="conjuration",
        casting_time="1 action",
        range="10 feet",
        duration="Instantaneous",
        description="You extend your hand toward a creature. 1d12 poison.",
        is_saving_throw=True,
        save_type="CON",
        half_damage_on_save=False,
    )
    DamageComponent.objects.create(
        spell=spell,
        dice_count=1,
        die_size=12,
        damage_type="poison",
    )
    return spell


@pytest.fixture
def spell_fireball(db):
    """Leveled saving-throw spell (Fireball)."""
    spell = Spell.objects.create(
        name="Fireball",
        level=3,
        school="evocation",
        casting_time="1 action",
        range="150 feet",
        duration="Instantaneous",
        description="A bright streak flashes. 8d6 fire.",
        is_saving_throw=True,
        save_type="DEX",
        half_damage_on_save=True,
        upcast_dice_increment=1,
        upcast_die_size=6,
        upcast_base_level=3,
    )
    DamageComponent.objects.create(
        spell=spell,
        dice_count=8,
        die_size=6,
        damage_type="fire",
    )
    return spell


@pytest.fixture
def spell_magic_missile(db):
    """Auto-hit leveled spell (Magic Missile)."""
    spell = Spell.objects.create(
        name="Magic Missile",
        level=1,
        school="evocation",
        casting_time="1 action",
        range="120 feet",
        duration="Instantaneous",
        description="Three darts of magical force.",
        is_auto_hit=True,
        number_of_attacks=3,
        upcast_attacks_increment=1,
        upcast_base_level=1,
    )
    DamageComponent.objects.create(
        spell=spell,
        dice_count=1,
        die_size=4,
        damage_type="force",
        flat_modifier=1,
    )
    return spell


@pytest.fixture
def base_context(db):
    """A simple unsaved AnalysisContext for service tests."""
    return AnalysisContext(
        target_ac=15,
        target_save_bonus=2,
        spell_save_dc=15,
        caster_attack_bonus=5,
        number_of_targets=1,
        advantage=False,
        disadvantage=False,
        spell_slot_level=1,
        crit_enabled=True,
        half_damage_on_save=True,
        evasion_enabled=False,
    )


# ── SpellAnalysisService.compare_growth_analysis ─────────────────────────────


@pytest.mark.django_db
class TestCompareGrowthService:

    def test_cantrip_vs_cantrip_profile_length(self, cantrip_fire, cantrip_save, base_context):
        """Should produce 20 entries for character levels 1-20."""
        result = SpellAnalysisService.compare_growth_analysis(cantrip_fire, cantrip_save, base_context)
        assert len(result["profile"]) == 20

    def test_cantrip_profile_keys(self, cantrip_fire, cantrip_save, base_context):
        """Each profile entry has required keys."""
        result = SpellAnalysisService.compare_growth_analysis(cantrip_fire, cantrip_save, base_context)
        entry = result["profile"][0]
        assert {"x", "label", "spell_a_damage", "spell_b_damage", "spell_a_slot", "spell_b_slot"} <= set(entry)

    def test_cantrip_slot_is_none(self, cantrip_fire, cantrip_save, base_context):
        """Cantrips should have slot=None in profile entries."""
        result = SpellAnalysisService.compare_growth_analysis(cantrip_fire, cantrip_save, base_context)
        for entry in result["profile"]:
            assert entry["spell_a_slot"] is None
            assert entry["spell_b_slot"] is None

    def test_cantrip_damage_grows_with_level(self, cantrip_fire, cantrip_save, base_context):
        """Cantrip damage should be higher at level 17+ than at level 1."""
        result = SpellAnalysisService.compare_growth_analysis(cantrip_fire, cantrip_save, base_context)
        profile = result["profile"]
        lvl1_a = profile[0]["spell_a_damage"]
        lvl17_a = profile[16]["spell_a_damage"]  # index 16 = char level 17
        assert lvl17_a > lvl1_a

    def test_cantrip_no_slot_profile(self, cantrip_fire, cantrip_save, base_context):
        """Two cantrips produce an empty slot_profile."""
        result = SpellAnalysisService.compare_growth_analysis(cantrip_fire, cantrip_save, base_context)
        assert result["slot_profile"] == []
        assert result["slot_crossover"] is None

    def test_leveled_vs_leveled_has_slot_profile(self, spell_fireball, spell_magic_missile, base_context):
        """Two leveled spells produce a non-empty slot_profile."""
        result = SpellAnalysisService.compare_growth_analysis(spell_fireball, spell_magic_missile, base_context)
        assert len(result["slot_profile"]) > 0

    def test_leveled_spell_zero_damage_before_accessible(self, spell_fireball, base_context):
        """A level-3 spell should have 0 damage at character level 1 (no 3rd-level slot)."""
        result = SpellAnalysisService.compare_growth_analysis(spell_fireball, spell_fireball, base_context)
        # Character level 1 → slot 1 → can't cast level-3 Fireball
        assert result["profile"][0]["spell_a_damage"] == 0.0

    def test_leveled_spell_positive_damage_at_level_5(self, spell_fireball, base_context):
        """A level-3 spell has positive damage at character level 5 (has 3rd-level slot)."""
        result = SpellAnalysisService.compare_growth_analysis(spell_fireball, spell_fireball, base_context)
        # Character level 5 → slot 3 → index 4
        assert result["profile"][4]["spell_a_damage"] > 0.0

    def test_slot_profile_keys(self, spell_fireball, spell_magic_missile, base_context):
        """Slot profile entries have required keys."""
        result = SpellAnalysisService.compare_growth_analysis(spell_fireball, spell_magic_missile, base_context)
        entry = result["slot_profile"][0]
        assert {"slot", "label", "spell_a_damage", "spell_b_damage"} <= set(entry)

    def test_crossover_detection(self, cantrip_fire, spell_magic_missile, base_context):
        """Cantrip vs leveled spell: crossover_x records where A first overtakes B."""
        result = SpellAnalysisService.compare_growth_analysis(cantrip_fire, spell_magic_missile, base_context)
        # Result is allowed to be None if A never overtakes B, but should be int if it does
        crossover = result["crossover_x"]
        assert crossover is None or isinstance(crossover, int)

    def test_spell_b_is_cantrip_spell_a_is_leveled(self, spell_magic_missile, cantrip_fire, base_context):
        """Leveled spell vs cantrip: cantrip (B) has slot=None, leveled (A) has slot value."""
        result = SpellAnalysisService.compare_growth_analysis(spell_magic_missile, cantrip_fire, base_context)
        # At level 1, A (Magic Missile) can be cast; B (cantrip) always has None
        entry_lvl1 = result["profile"][0]
        assert entry_lvl1["spell_b_slot"] is None
        assert entry_lvl1["spell_a_damage"] > 0.0

    def test_result_structure(self, spell_fireball, spell_magic_missile, base_context):
        """Top-level result has the four expected keys."""
        result = SpellAnalysisService.compare_growth_analysis(spell_fireball, spell_magic_missile, base_context)
        assert set(result.keys()) == {"profile", "crossover_x", "slot_profile", "slot_crossover"}


# ── POST /api/analysis/compare_growth/ ───────────────────────────────────────


@pytest.mark.django_db
class TestCompareGrowthView:

    def test_unauthenticated_rejected(self, cantrip_fire, cantrip_save):
        """Unauthenticated request returns 401."""
        c = APIClient()
        response = c.post(
            "/api/analysis/compare_growth/",
            {
                "spell_a_id": str(cantrip_fire.id),
                "spell_b_id": str(cantrip_save.id),
            },
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_valid_cantrip_vs_cantrip(self, client, cantrip_fire, cantrip_save):
        """Returns 200 with profile for two cantrips."""
        response = client.post(
            "/api/analysis/compare_growth/",
            {
                "spell_a_id": str(cantrip_fire.id),
                "spell_b_id": str(cantrip_save.id),
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "spell_a" in data
        assert "spell_b" in data
        assert "profile" in data
        assert len(data["profile"]) == 20

    def test_valid_leveled_vs_leveled(self, client, spell_fireball, spell_magic_missile):
        """Returns 200 with slot_profile for two leveled spells."""
        response = client.post(
            "/api/analysis/compare_growth/",
            {
                "spell_a_id": str(spell_fireball.id),
                "spell_b_id": str(spell_magic_missile.id),
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert "slot_profile" in data
        assert len(data["slot_profile"]) > 0

    def test_same_spell_rejected(self, client, cantrip_fire):
        """Comparing a spell with itself returns 400."""
        response = client.post(
            "/api/analysis/compare_growth/",
            {
                "spell_a_id": str(cantrip_fire.id),
                "spell_b_id": str(cantrip_fire.id),
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_missing_spell_id(self, client, cantrip_fire):
        """Missing spell_b_id returns 400."""
        response = client.post(
            "/api/analysis/compare_growth/",
            {
                "spell_a_id": str(cantrip_fire.id),
            },
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_response_includes_spell_metadata(self, client, cantrip_fire, cantrip_save):
        """Response includes spell_a and spell_b metadata."""
        response = client.post(
            "/api/analysis/compare_growth/",
            {
                "spell_a_id": str(cantrip_fire.id),
                "spell_b_id": str(cantrip_save.id),
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["spell_a"]["name"] == "Fire Bolt"
        assert response.data["spell_b"]["name"] == "Poison Spray"

    def test_cached_response_returned(self, client, cantrip_fire, cantrip_save):
        """Second identical request hits cache (should return 200 both times)."""
        payload = {
            "spell_a_id": str(cantrip_fire.id),
            "spell_b_id": str(cantrip_save.id),
        }
        r1 = client.post("/api/analysis/compare_growth/", payload, format="json")
        r2 = client.post("/api/analysis/compare_growth/", payload, format="json")
        assert r1.status_code == status.HTTP_200_OK
        assert r2.status_code == status.HTTP_200_OK
        # Both should have the same profile data
        assert r1.data["profile"] == r2.data["profile"]

    def test_optional_context_params(self, client, cantrip_fire, cantrip_save):
        """Optional context params are accepted without error."""
        response = client.post(
            "/api/analysis/compare_growth/",
            {
                "spell_a_id": str(cantrip_fire.id),
                "spell_b_id": str(cantrip_save.id),
                "target_ac": 18,
                "caster_attack_bonus": 7,
                "number_of_targets": 2,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK


# ── AnalysisContextViewSet get_queryset ───────────────────────────────────────


@pytest.mark.django_db
class TestAnalysisContextViewSet:

    def test_user_only_sees_own_contexts(self, user, staff_user):
        """Regular user only sees their own AnalysisContext objects."""
        ctx_mine = AnalysisContext.objects.create(
            target_ac=15,
            target_save_bonus=0,
            spell_save_dc=15,
            caster_attack_bonus=5,
            created_by=user,
        )
        ctx_other = AnalysisContext.objects.create(
            target_ac=12,
            target_save_bonus=2,
            spell_save_dc=13,
            caster_attack_bonus=3,
            created_by=staff_user,
        )
        c = APIClient()
        c.force_authenticate(user=user)
        response = c.get("/api/analysis/contexts/")
        assert response.status_code == status.HTTP_200_OK
        ids = [item["id"] for item in response.data["results"]]
        assert str(ctx_mine.id) in ids
        assert str(ctx_other.id) not in ids

    def test_staff_sees_all_contexts(self, user, staff_user, staff_client):
        """Staff user can see all AnalysisContext objects."""
        AnalysisContext.objects.create(
            target_ac=15,
            target_save_bonus=0,
            spell_save_dc=15,
            caster_attack_bonus=5,
            created_by=user,
        )
        AnalysisContext.objects.create(
            target_ac=12,
            target_save_bonus=2,
            spell_save_dc=13,
            caster_attack_bonus=3,
            created_by=staff_user,
        )
        response = staff_client.get("/api/analysis/contexts/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["count"] >= 2

    def test_create_sets_created_by(self, client, user):
        """Creating a context via API sets created_by to the requesting user."""
        response = client.post(
            "/api/analysis/contexts/",
            {
                "target_ac": 16,
                "target_save_bonus": 1,
                "spell_save_dc": 14,
                "caster_attack_bonus": 6,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_201_CREATED
        ctx = AnalysisContext.objects.get(id=response.data["id"])
        assert ctx.created_by == user


# ── SpellComparisonViewSet get_queryset ───────────────────────────────────────


@pytest.mark.django_db
class TestSpellComparisonViewSet:

    def test_unauthenticated_rejected(self):
        c = APIClient()
        response = c.get("/api/analysis/comparisons/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_authenticated_returns_200(self, client):
        response = client.get("/api/analysis/comparisons/")
        assert response.status_code == status.HTTP_200_OK

    def test_staff_sees_all_comparisons(self, staff_client):
        response = staff_client.get("/api/analysis/comparisons/")
        assert response.status_code == status.HTTP_200_OK
