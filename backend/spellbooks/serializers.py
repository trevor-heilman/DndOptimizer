from rest_framework import serializers

from spells.serializers import SpellListSerializer

from .models import Character, PreparedSpell, Spellbook

# ─── Character serializers ───────────────────────────────────────────────────

class CharacterSerializer(serializers.ModelSerializer):
    """Full serializer for a character (list + detail)."""
    spell_save_dc = serializers.IntegerField(read_only=True)
    spell_attack_bonus = serializers.IntegerField(read_only=True)
    proficiency_bonus = serializers.IntegerField(read_only=True)
    max_prepared_spells = serializers.IntegerField(read_only=True, allow_null=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    spellbook_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Character
        fields = [
            'id', 'name', 'character_class', 'character_level', 'subclass',
            'portrait_color', 'ruleset',
            'spellcasting_ability_modifier', 'dc_bonus', 'attack_bonus_extra',
            'spell_slots_used', 'school_copy_discounts',
            # computed
            'spell_save_dc', 'spell_attack_bonus', 'proficiency_bonus', 'max_prepared_spells',
            'spellbook_count',
            'owner', 'owner_username', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class CharacterCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Character
        fields = [
            'name', 'character_class', 'character_level', 'subclass',
            'portrait_color', 'ruleset',
            'spellcasting_ability_modifier', 'dc_bonus', 'attack_bonus_extra',
            'spell_slots_used', 'school_copy_discounts',
        ]


class UpdateSpellSlotsSerializer(serializers.Serializer):
    """Patch just the spell_slots_used field."""
    spell_slots_used = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        min_length=9,
        max_length=9,
    )


# ─── Spellbook serializers ───────────────────────────────────────────────────

class PreparedSpellSerializer(serializers.ModelSerializer):
    """
    Serializer for prepared spells within a spellbook.
    """
    spell = SpellListSerializer(read_only=True)
    spell_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = PreparedSpell
        fields = [
            'id', 'spell', 'spell_id', 'prepared', 'notes',
            'added_at', 'updated_at'
        ]
        read_only_fields = ['id', 'added_at', 'updated_at']


class SpellbookListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for spellbook lists.
    """
    spell_count = serializers.IntegerField(read_only=True)
    prepared_spell_count = serializers.IntegerField(read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    character_name = serializers.SerializerMethodField()

    class Meta:
        model = Spellbook
        fields = [
            'id', 'name', 'description', 'character_class', 'character_level',
            'character', 'character_name', 'book_color', 'label_color', 'sort_order',
            'owner', 'owner_username',
            'spell_count', 'prepared_spell_count', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_character_name(self, obj: Spellbook) -> str | None:
        return obj.character.name if obj.character_id else None


class SpellbookDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for spellbook with all prepared spells.
    """
    prepared_spells = PreparedSpellSerializer(many=True, read_only=True)
    spell_count = serializers.IntegerField(read_only=True)
    prepared_spell_count = serializers.IntegerField(read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    character_name = serializers.SerializerMethodField()

    class Meta:
        model = Spellbook
        fields = [
            'id', 'name', 'description', 'character_class', 'character_level',
            'character', 'character_name', 'book_color', 'label_color', 'sort_order',
            'owner', 'owner_username',
            'spell_count', 'prepared_spell_count', 'prepared_spells',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_character_name(self, obj: Spellbook) -> str | None:
        return obj.character.name if obj.character_id else None


class SpellbookCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating spellbooks.
    """
    class Meta:
        model = Spellbook
        fields = ['name', 'description', 'character_class', 'character_level', 'character', 'book_color', 'label_color', 'sort_order']


class ReorderSpellbooksSerializer(serializers.Serializer):
    """Accepts a list of {id, sort_order} to bulk-update book positions."""
    class _Entry(serializers.Serializer):
        id = serializers.UUIDField()
        sort_order = serializers.IntegerField(min_value=0)

    items = _Entry(many=True)


class AddSpellToSpellbookSerializer(serializers.Serializer):
    """
    Serializer for adding a spell to a spellbook.
    """
    spell_id = serializers.UUIDField(required=True)
    prepared = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_spell_id(self, value):
        """Validate that the spell exists."""
        from spells.models import Spell

        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell not found.")

        return value


class UpdatePreparedSpellSerializer(serializers.ModelSerializer):
    """
    Serializer for updating prepared spell status and notes.
    """
    class Meta:
        model = PreparedSpell
        fields = ['prepared', 'notes']


class SpellbookExportSerializer(serializers.ModelSerializer):
    """
    Serializer for exporting a spellbook to JSON.
    """
    spells = serializers.SerializerMethodField()
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Spellbook
        fields = ['name', 'description', 'owner_username', 'spells', 'created_at']

    def get_spells(self, obj):
        """Get all spells with their prepared status."""
        from spells.serializers import SpellExportSerializer

        prepared_spells = obj.prepared_spells.select_related('spell').all()
        return [
            {
                'spell': SpellExportSerializer(ps.spell).data,
                'prepared': ps.prepared,
                'notes': ps.notes
            }
            for ps in prepared_spells
        ]
