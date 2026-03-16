"""
Tests for the Character & Spellbook system (spellbooks app).

Covers:
- CharacterViewSet CRUD + custom actions (spell_slots, reset_slots, all_spells)
- SpellbookViewSet CRUD + custom actions (add_spell, remove_spell,
  update_prepared_spell, export, duplicate, reorder, copy_cost)
- calculate_copy_cost service
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from spellbooks.models import Character, PreparedSpell, Spellbook
from spellbooks.services import calculate_copy_cost
from spells.models import DamageComponent, Spell

User = get_user_model()


# ── fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def user(db):
    return User.objects.create_user(username="spellbookuser", email="sb@example.com", password="pass123")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="otheruser", email="other@example.com", password="pass123")


@pytest.fixture
def client(user):
    c = APIClient()
    c.force_authenticate(user=user)
    return c


@pytest.fixture
def other_client(other_user):
    c = APIClient()
    c.force_authenticate(user=other_user)
    return c


@pytest.fixture
def character(user):
    return Character.objects.create(
        name="Gandalf",
        character_class="wizard",
        character_level=10,
        spellcasting_ability_modifier=4,
        ruleset="2014",
        owner=user,
    )


@pytest.fixture
def spellbook(user, character):
    return Spellbook.objects.create(
        name="Gandalf's Tome",
        owner=user,
        character=character,
        book_color="violet",
    )


@pytest.fixture
def spell_fireball(db):
    spell = Spell.objects.create(
        name="Fireball",
        level=3,
        school="evocation",
        casting_time="1 action",
        range="150 feet",
        duration="Instantaneous",
        description="Fire",
        is_saving_throw=True,
        save_type="DEX",
        half_damage_on_save=True,
    )
    DamageComponent.objects.create(spell=spell, dice_count=8, die_size=6, damage_type="fire", timing="on_fail")
    return spell


@pytest.fixture
def spell_mage_hand(db):
    return Spell.objects.create(
        name="Mage Hand",
        level=0,
        school="conjuration",
        casting_time="1 action",
        range="30 feet",
        duration="1 minute",
        description="Conjure a spectral hand.",
    )


# ── Character CRUD ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCharacterCRUD:

    def test_list_own_characters(self, client, character):
        response = client.get("/api/spellbooks/characters/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Gandalf"

    def test_other_user_cannot_see_my_characters(self, other_client, character):
        response = other_client.get("/api/spellbooks/characters/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0

    def test_create_character(self, client):
        data = {
            "name": "Merlin",
            "character_class": "wizard",
            "character_level": 5,
            "spellcasting_ability_modifier": 3,
        }
        response = client.post("/api/spellbooks/characters/", data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "Merlin"
        assert response.data["character_class"] == "wizard"

    def test_create_character_2024_ruleset(self, client):
        data = {
            "name": "Valindra",
            "character_class": "wizard",
            "character_level": 7,
            "spellcasting_ability_modifier": 5,
            "ruleset": "2024",
        }
        response = client.post("/api/spellbooks/characters/", data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["ruleset"] == "2024"

    def test_retrieve_character(self, client, character):
        response = client.get(f"/api/spellbooks/characters/{character.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Gandalf"
        assert "max_prepared_spells" in response.data
        assert "spell_save_dc" in response.data
        assert "spell_attack_bonus" in response.data

    def test_update_character(self, client, character):
        data = {
            "name": "Gandalf the White",
            "character_class": "wizard",
            "character_level": 20,
            "spellcasting_ability_modifier": 5,
        }
        response = client.put(f"/api/spellbooks/characters/{character.id}/", data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Gandalf the White"

    def test_partial_update_character(self, client, character):
        response = client.patch(f"/api/spellbooks/characters/{character.id}/", {"name": "Olorin"})
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Olorin"

    def test_delete_character(self, client, character):
        response = client.delete(f"/api/spellbooks/characters/{character.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Character.objects.filter(id=character.id).exists()

    def test_unauthenticated_blocked(self, db):
        anon = APIClient()
        response = anon.get("/api/spellbooks/characters/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ── Character custom actions ──────────────────────────────────────────────────


@pytest.mark.django_db
class TestCharacterActions:

    def test_update_spell_slots(self, client, character):
        slots = [1, 1, 0, 0, 0, 0, 0, 0, 0]
        response = client.patch(
            f"/api/spellbooks/characters/{character.id}/spell_slots/",
            {"spell_slots_used": slots},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["spell_slots_used"] == slots

    def test_update_spell_slots_wrong_length_rejected(self, client, character):
        response = client.patch(
            f"/api/spellbooks/characters/{character.id}/spell_slots/",
            {"spell_slots_used": [1, 2, 3]},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reset_spell_slots(self, client, character):
        # First set some slots as used
        character.spell_slots_used = [2, 1, 0, 0, 0, 0, 0, 0, 0]
        character.save()

        response = client.post(f"/api/spellbooks/characters/{character.id}/reset_slots/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["spell_slots_used"] == [0] * 9

    def test_all_spells_empty(self, client, character):
        response = client.get(f"/api/spellbooks/characters/{character.id}/spells/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_all_spells_with_prepared(self, client, character, spellbook, spell_fireball):
        PreparedSpell.objects.create(spellbook=spellbook, spell=spell_fireball, prepared=True)
        response = client.get(f"/api/spellbooks/characters/{character.id}/spells/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]["spellbook_name"] == spellbook.name


# ── Character computed properties ─────────────────────────────────────────────


@pytest.mark.django_db
class TestCharacterComputedProperties:

    def test_wizard_max_prepared_spells_2014(self, client, user):
        char = Character.objects.create(
            name="Wizard 2014",
            character_class="wizard",
            character_level=5,
            spellcasting_ability_modifier=3,
            ruleset="2014",
            owner=user,
        )
        response = client.get(f"/api/spellbooks/characters/{char.id}/")
        # 2014: level + modifier = 5 + 3 = 8
        assert response.data["max_prepared_spells"] == 8

    def test_wizard_max_prepared_spells_2024(self, client, user):
        char = Character.objects.create(
            name="Wizard 2024",
            character_class="wizard",
            character_level=5,
            spellcasting_ability_modifier=3,
            ruleset="2024",
            owner=user,
        )
        response = client.get(f"/api/spellbooks/characters/{char.id}/")
        # 2024: fixed table, level 5 = 9
        assert response.data["max_prepared_spells"] == 9

    def test_cleric_max_prepared_spells(self, client, user):
        char = Character.objects.create(
            name="Cleric",
            character_class="cleric",
            character_level=6,
            spellcasting_ability_modifier=4,
            ruleset="2014",
            owner=user,
        )
        response = client.get(f"/api/spellbooks/characters/{char.id}/")
        # cleric: level + modifier = 6 + 4 = 10
        assert response.data["max_prepared_spells"] == 10

    def test_sorcerer_has_no_max_prepared(self, client, user):
        char = Character.objects.create(
            name="Sorcerer",
            character_class="sorcerer",
            character_level=10,
            spellcasting_ability_modifier=5,
            ruleset="2014",
            owner=user,
        )
        response = client.get(f"/api/spellbooks/characters/{char.id}/")
        assert response.data["max_prepared_spells"] is None

    def test_proficiency_bonus_interpolation(self, client, user):
        char = Character.objects.create(
            name="Level 5 Char",
            character_class="wizard",
            character_level=5,
            spellcasting_ability_modifier=3,
            owner=user,
        )
        response = client.get(f"/api/spellbooks/characters/{char.id}/")
        # Level 5 → proficiency bonus = 3
        assert response.data["proficiency_bonus"] == 3


# ── Spellbook CRUD ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSpellbookCRUD:

    def test_list_own_spellbooks(self, client, spellbook):
        response = client.get("/api/spellbooks/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["name"] == "Gandalf's Tome"

    def test_other_user_cannot_see_spellbooks(self, other_client, spellbook):
        response = other_client.get("/api/spellbooks/")
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 0

    def test_create_spellbook(self, client):
        data = {"name": "New Tome", "book_color": "emerald"}
        response = client.post("/api/spellbooks/", data)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == "New Tome"

    def test_retrieve_spellbook(self, client, spellbook):
        response = client.get(f"/api/spellbooks/{spellbook.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Gandalf's Tome"
        assert "prepared_spells" in response.data

    def test_update_spellbook(self, client, spellbook):
        data = {
            "name": "Renamed Tome",
            "book_color": "crimson",
        }
        response = client.patch(f"/api/spellbooks/{spellbook.id}/", data)
        assert response.status_code == status.HTTP_200_OK
        assert response.data["name"] == "Renamed Tome"

    def test_delete_spellbook(self, client, spellbook):
        response = client.delete(f"/api/spellbooks/{spellbook.id}/")
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Spellbook.objects.filter(id=spellbook.id).exists()


# ── Spellbook add / remove / update prepared spell ───────────────────────────


@pytest.mark.django_db
class TestSpellbookSpellManagement:

    def test_add_spell_to_spellbook(self, client, spellbook, spell_fireball):
        data = {"spell_id": str(spell_fireball.id), "prepared": False, "notes": ""}
        response = client.post(f"/api/spellbooks/{spellbook.id}/add_spell/", data)
        assert response.status_code == status.HTTP_201_CREATED
        assert PreparedSpell.objects.filter(spellbook=spellbook, spell=spell_fireball).exists()

    def test_add_duplicate_spell_rejected(self, client, spellbook, spell_fireball):
        PreparedSpell.objects.create(spellbook=spellbook, spell=spell_fireball, prepared=False)
        data = {"spell_id": str(spell_fireball.id), "prepared": False, "notes": ""}
        response = client.post(f"/api/spellbooks/{spellbook.id}/add_spell/", data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_spell_from_spellbook(self, client, spellbook, spell_fireball):
        PreparedSpell.objects.create(spellbook=spellbook, spell=spell_fireball)
        response = client.delete(
            f"/api/spellbooks/{spellbook.id}/remove_spell/",
            data={"spell_id": str(spell_fireball.id)},
            QUERY_STRING=f"spell_id={spell_fireball.id}",
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not PreparedSpell.objects.filter(spellbook=spellbook, spell=spell_fireball).exists()

    def test_remove_spell_missing_spell_id(self, client, spellbook):
        response = client.delete(f"/api/spellbooks/{spellbook.id}/remove_spell/")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_remove_nonexistent_spell_returns_404(self, client, spellbook, spell_fireball):
        response = client.delete(f"/api/spellbooks/{spellbook.id}/remove_spell/?spell_id={spell_fireball.id}")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_prepared_spell(self, client, spellbook, spell_fireball):
        ps = PreparedSpell.objects.create(spellbook=spellbook, spell=spell_fireball, prepared=False)
        response = client.patch(
            f"/api/spellbooks/{spellbook.id}/update_prepared_spell/?spell_id={spell_fireball.id}",
            {"prepared": True, "notes": "Key offensive spell"},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        ps.refresh_from_db()
        assert ps.prepared is True
        assert ps.notes == "Key offensive spell"

    def test_update_prepared_spell_missing_spell_id(self, client, spellbook):
        response = client.patch(
            f"/api/spellbooks/{spellbook.id}/update_prepared_spell/",
            {"prepared": True},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_update_prepared_spell_not_found(self, client, spellbook, spell_fireball):
        response = client.patch(
            f"/api/spellbooks/{spellbook.id}/update_prepared_spell/?spell_id={spell_fireball.id}",
            {"prepared": True},
            format="json",
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ── Spellbook export / duplicate / reorder / copy_cost ───────────────────────


@pytest.mark.django_db
class TestSpellbookActions:

    def test_export_spellbook(self, client, spellbook, spell_fireball):
        PreparedSpell.objects.create(spellbook=spellbook, spell=spell_fireball)
        response = client.get(f"/api/spellbooks/{spellbook.id}/export/")
        assert response.status_code == status.HTTP_200_OK
        assert "name" in response.data

    def test_duplicate_spellbook(self, client, spellbook, spell_fireball):
        PreparedSpell.objects.create(spellbook=spellbook, spell=spell_fireball)
        response = client.post(f"/api/spellbooks/{spellbook.id}/duplicate/")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["name"] == f"{spellbook.name} (Copy)"
        # Original and copy both exist
        assert Spellbook.objects.filter(owner__username="spellbookuser").count() == 2
        # Copy has the same spells
        copy_id = response.data["id"]
        assert PreparedSpell.objects.filter(spellbook_id=copy_id).count() == 1

    def test_reorder_spellbooks(self, client, user):
        book_a = Spellbook.objects.create(name="A", owner=user, sort_order=0)
        book_b = Spellbook.objects.create(name="B", owner=user, sort_order=1)
        data = {
            "items": [
                {"id": str(book_a.id), "sort_order": 5},
                {"id": str(book_b.id), "sort_order": 2},
            ]
        }
        response = client.post("/api/spellbooks/reorder/", data, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["updated"] == 2
        book_a.refresh_from_db()
        book_b.refresh_from_db()
        assert book_a.sort_order == 5
        assert book_b.sort_order == 2

    def test_copy_cost_no_character(self, client, spellbook, spell_fireball):
        PreparedSpell.objects.create(spellbook=spellbook, spell=spell_fireball)
        response = client.get(f"/api/spellbooks/{spellbook.id}/copy_cost/")
        assert response.status_code == status.HTTP_200_OK
        assert "total_gold" in response.data
        assert "total_hours" in response.data
        assert "spell_entries" in response.data
        # Fireball level 3: 3 * 50gp = 150gp, 3 * 2h = 6h
        assert response.data["total_gold"] == 150.0
        assert response.data["total_hours"] == 6.0

    def test_copy_cost_with_scribes_discount(self, client, user, character):
        character.subclass = "order_of_scribes"
        character.save()
        book = Spellbook.objects.create(name="Scribes Tome", owner=user, character=character)
        spell = Spell.objects.create(
            name="Magic Missile",
            level=1,
            school="evocation",
            casting_time="1 action",
            range="120 feet",
            duration="Instantaneous",
            description="Darts",
        )
        PreparedSpell.objects.create(spellbook=book, spell=spell)
        response = client.get(f"/api/spellbooks/{book.id}/copy_cost/")
        assert response.status_code == status.HTTP_200_OK
        # Level 1: 50gp base → 50% off = 25gp
        assert response.data["total_gold"] == 25.0
        assert response.data["scribes_discount_applied"] is True

    def test_copy_cost_cantrip_skipped(self, client, spellbook, spell_mage_hand):
        PreparedSpell.objects.create(spellbook=spellbook, spell=spell_mage_hand)
        response = client.get(f"/api/spellbooks/{spellbook.id}/copy_cost/")
        assert response.status_code == status.HTTP_200_OK
        # Cantrips cost nothing
        assert response.data["total_gold"] == 0.0
        assert response.data["spell_entries"] == []


# ── Service unit tests ─────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestCalculateCopyCost:

    def test_basic_cost_no_discounts(self, user):
        book = Spellbook.objects.create(name="Basic", owner=user)
        spell = Spell.objects.create(
            name="Fireball",
            level=3,
            school="evocation",
            casting_time="1 action",
            range="150 feet",
            duration="Instantaneous",
            description="Fire",
        )
        PreparedSpell.objects.create(spellbook=book, spell=spell)
        result = calculate_copy_cost(book, character=None)
        assert result.total_gold == 150.0
        assert result.total_hours == 6.0
        assert len(result.spell_entries) == 1
        assert result.scribes_discount_applied is False

    def test_order_of_scribes_50pct(self, user):
        char = Character.objects.create(
            name="Scribe",
            character_class="wizard",
            character_level=5,
            subclass="order_of_scribes",
            owner=user,
        )
        book = Spellbook.objects.create(name="Scribes", owner=user, character=char)
        spell = Spell.objects.create(
            name="Shield",
            level=1,
            school="abjuration",
            casting_time="1 action",
            range="Self",
            duration="1 round",
            description="A shimmering field.",
        )
        PreparedSpell.objects.create(spellbook=book, spell=spell)
        result = calculate_copy_cost(book, char)
        assert result.total_gold == 25.0
        assert result.scribes_discount_applied is True

    def test_school_discount_applied(self, user):
        char = Character.objects.create(
            name="Evoker",
            character_class="wizard",
            character_level=5,
            school_copy_discounts={"evocation": 25},
            owner=user,
        )
        book = Spellbook.objects.create(name="Evoker Book", owner=user, character=char)
        spell = Spell.objects.create(
            name="Chromatic Orb",
            level=1,
            school="evocation",
            casting_time="1 action",
            range="90 feet",
            duration="Instantaneous",
            description="Orb",
        )
        PreparedSpell.objects.create(spellbook=book, spell=spell)
        result = calculate_copy_cost(book, char)
        # 50gp * 75% = 37.5gp
        assert result.total_gold == 37.5
        assert result.spell_entries[0].discount_pct == 25

    def test_cantrips_excluded(self, user):
        book = Spellbook.objects.create(name="Cantrip Book", owner=user)
        cantrip = Spell.objects.create(
            name="Prestidigitation",
            level=0,
            school="transmutation",
            casting_time="1 action",
            range="10 feet",
            duration="Up to 1 hour",
            description="Minor magic trick.",
        )
        PreparedSpell.objects.create(spellbook=book, spell=cantrip)
        result = calculate_copy_cost(book, character=None)
        assert result.total_gold == 0.0
        assert result.spell_entries == []

    def test_scribes_and_school_highest_wins(self, user):
        """When both scribes (50%) and school (75%) discounts apply, highest wins."""
        char = Character.objects.create(
            name="Power Scribe",
            character_class="wizard",
            character_level=10,
            subclass="order_of_scribes",
            school_copy_discounts={"evocation": 75},
            owner=user,
        )
        book = Spellbook.objects.create(name="Book", owner=user, character=char)
        spell = Spell.objects.create(
            name="Lightning Bolt",
            level=3,
            school="evocation",
            casting_time="1 action",
            range="100 feet",
            duration="Instantaneous",
            description="Lightning",
        )
        PreparedSpell.objects.create(spellbook=book, spell=spell)
        result = calculate_copy_cost(book, char)
        # 150gp * 25% = 37.5gp (75% off)
        assert result.total_gold == 37.5
        assert result.spell_entries[0].discount_pct == 75

    def test_multiple_spells_summed(self, user):
        book = Spellbook.objects.create(name="Full Book", owner=user)
        spells = [
            Spell.objects.create(
                name=f"Spell {i}",
                level=i,
                school="evocation",
                casting_time="1 action",
                range="90 feet",
                duration="Instantaneous",
                description="Spell",
            )
            for i in range(1, 4)  # levels 1, 2, 3
        ]
        for s in spells:
            PreparedSpell.objects.create(spellbook=book, spell=s)
        result = calculate_copy_cost(book, character=None)
        # (1+2+3) * 50 = 300gp, (1+2+3) * 2 = 12h
        assert result.total_gold == 300.0
        assert result.total_hours == 12.0
        assert len(result.spell_entries) == 3


# ── Import / Export ────────────────────────────────────────────────────────────


@pytest.mark.django_db
class TestSpellbookImport:
    """Tests for POST /api/spellbooks/import/ (spellbook JSON round-trip)."""

    def test_import_empty_spellbook(self, client):
        payload = {
            "name": "Imported Tome",
            "description": "A tome brought from afar.",
            "spells": [],
        }
        response = client.post("/api/spellbooks/import/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["spellbook"]["name"] == "Imported Tome"
        assert response.data["imported"] == 0
        assert response.data["skipped"] == []

    def test_import_matches_spell_by_name(self, client, spell_fireball):
        payload = {
            "name": "Firey Tome",
            "spells": [{"name": "Fireball", "source": "phb", "prepared": True}],
        }
        response = client.post("/api/spellbooks/import/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["imported"] == 1
        assert response.data["skipped"] == []

    def test_import_skips_unknown_spells(self, client):
        payload = {
            "name": "Mystery Tome",
            "spells": [{"name": "Nonexistent Spell", "prepared": False}],
        }
        response = client.post("/api/spellbooks/import/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["imported"] == 0
        assert "Nonexistent Spell" in response.data["skipped"]

    def test_import_unauthenticated_blocked(self, db):
        anon = APIClient()
        response = anon.post(
            "/api/spellbooks/import/",
            {"name": "Tome", "spells": []},
            format="json",
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_export_then_import_round_trip(self, client, spellbook, spell_fireball):
        """Export a spellbook, then import it back; imported count should match."""
        PreparedSpell.objects.create(spellbook=spellbook, spell=spell_fireball)
        export_data = client.get(f"/api/spellbooks/{spellbook.id}/export/").data

        payload = {
            "name": "Round-trip Tome",
            "spells": export_data["spells"],
        }
        response = client.post("/api/spellbooks/import/", payload, format="json")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data["imported"] == 1


@pytest.mark.django_db
class TestCharacterExport:
    """Tests for GET /api/spellbooks/characters/{id}/export/."""

    def test_export_character_structure(self, client, character, spellbook, spell_fireball):
        PreparedSpell.objects.create(spellbook=spellbook, spell=spell_fireball)
        response = client.get(f"/api/spellbooks/characters/{character.id}/export/")
        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data["name"] == character.name
        assert "spellbooks" in data
        assert len(data["spellbooks"]) == 1
        assert data["spellbooks"][0]["name"] == spellbook.name
        assert len(data["spellbooks"][0]["spells"]) == 1

    def test_export_character_not_owned(self, other_client, character):
        response = other_client.get(f"/api/spellbooks/characters/{character.id}/export/")
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_export_character_unauthenticated(self, db, character):
        anon = APIClient()
        response = anon.get(f"/api/spellbooks/characters/{character.id}/export/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
