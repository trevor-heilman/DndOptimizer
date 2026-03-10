from rest_framework import serializers
from .models import Spellbook, PreparedSpell
from spells.serializers import SpellListSerializer


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

    class Meta:
        model = Spellbook
        fields = [
            'id', 'name', 'description', 'character_class', 'character_level',
            'owner', 'owner_username',
            'spell_count', 'prepared_spell_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class SpellbookDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for spellbook with all prepared spells.
    """
    prepared_spells = PreparedSpellSerializer(many=True, read_only=True)
    spell_count = serializers.IntegerField(read_only=True)
    prepared_spell_count = serializers.IntegerField(read_only=True)
    owner_username = serializers.CharField(source='owner.username', read_only=True)

    class Meta:
        model = Spellbook
        fields = [
            'id', 'name', 'description', 'character_class', 'character_level',
            'owner', 'owner_username',
            'spell_count', 'prepared_spell_count', 'prepared_spells',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']


class SpellbookCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating spellbooks.
    """
    class Meta:
        model = Spellbook
        fields = ['name', 'description', 'character_class', 'character_level']


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
