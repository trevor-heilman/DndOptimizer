from rest_framework import serializers
from .models import Spell, DamageComponent, SpellParsingMetadata


class DamageComponentSerializer(serializers.ModelSerializer):
    """
    Serializer for damage components.
    """
    average_damage = serializers.FloatField(read_only=True)

    class Meta:
        model = DamageComponent
        fields = [
            'id', 'dice_count', 'die_size', 'flat_modifier', 'damage_type',
            'timing', 'on_crit_extra', 'scales_with_slot', 'is_verified',
            'average_damage', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'average_damage']


class SpellParsingMetadataSerializer(serializers.ModelSerializer):
    """
    Serializer for spell parsing metadata.
    """
    class Meta:
        model = SpellParsingMetadata
        fields = [
            'id', 'parsing_confidence', 'requires_review', 'parsing_notes',
            'auto_extracted_components', 'reviewed_by', 'reviewed_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SpellListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for spell lists.
    """
    class Meta:
        model = Spell
        fields = [
            'id', 'name', 'level', 'school', 'casting_time', 'range',
            'duration', 'concentration', 'ritual', 'is_attack_roll',
            'is_saving_throw', 'source', 'is_custom', 'created_by'
        ]
        read_only_fields = ['id', 'created_by']


class SpellDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for spell detail view.
    """
    damage_components = DamageComponentSerializer(many=True, read_only=True)
    parsing_metadata = SpellParsingMetadataSerializer(read_only=True)
    created_by_username = serializers.CharField(
        source='created_by.username',
        read_only=True
    )

    class Meta:
        model = Spell
        fields = [
            'id', 'name', 'level', 'school', 'casting_time', 'range',
            'duration', 'concentration', 'ritual', 'is_attack_roll',
            'is_saving_throw', 'save_type', 'half_damage_on_save',
            'number_of_attacks', 'crit_enabled', 'aoe_radius', 'damage_type',
            'upcast_base_level', 'upcast_dice_increment', 'upcast_die_size',
            'source', 'is_custom', 'description', 'higher_level', 'raw_data',
            'damage_components', 'parsing_metadata', 'created_by',
            'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']


class SpellCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating spells.
    """
    damage_components = DamageComponentSerializer(many=True, required=False)

    class Meta:
        model = Spell
        fields = [
            'name', 'level', 'school', 'casting_time', 'range',
            'duration', 'concentration', 'ritual', 'is_attack_roll',
            'is_saving_throw', 'save_type', 'half_damage_on_save',
            'number_of_attacks', 'crit_enabled', 'aoe_radius', 'damage_type',
            'upcast_base_level', 'upcast_dice_increment', 'upcast_die_size',
            'source', 'is_custom', 'description', 'higher_level', 'raw_data',
            'damage_components'
        ]

    def create(self, validated_data):
        """Create spell with damage components."""
        damage_components_data = validated_data.pop('damage_components', [])
        spell = Spell.objects.create(**validated_data)
        
        for component_data in damage_components_data:
            DamageComponent.objects.create(spell=spell, **component_data)
        
        return spell

    def update(self, instance, validated_data):
        """Update spell and its damage components."""
        damage_components_data = validated_data.pop('damage_components', None)
        
        # Update spell fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update damage components if provided
        if damage_components_data is not None:
            # Remove old components
            instance.damage_components.all().delete()
            # Create new components
            for component_data in damage_components_data:
                DamageComponent.objects.create(spell=instance, **component_data)
        
        return instance


class SpellImportSerializer(serializers.Serializer):
    """
    Serializer for bulk spell import.
    """
    spells = serializers.ListField(
        child=serializers.JSONField(),
        allow_empty=False
    )
    source = serializers.CharField(max_length=255, required=False, default='imported')
    auto_parse = serializers.BooleanField(default=True)

    def validate_spells(self, value):
        """Validate that each spell has required fields."""
        required_fields = ['name', 'level']
        
        for idx, spell_data in enumerate(value):
            for field in required_fields:
                if field not in spell_data:
                    raise serializers.ValidationError(
                        f"Spell at index {idx} is missing required field: {field}"
                    )
        
        return value


class SpellExportSerializer(serializers.ModelSerializer):
    """
    Serializer for spell export to JSON.
    """
    damage_components = DamageComponentSerializer(many=True, read_only=True)

    class Meta:
        model = Spell
        fields = [
            'name', 'level', 'school', 'casting_time', 'range',
            'duration', 'concentration', 'ritual', 'is_attack_roll',
            'is_saving_throw', 'save_type', 'half_damage_on_save',
            'number_of_attacks', 'crit_enabled', 'aoe_radius', 'damage_type',
            'upcast_base_level', 'upcast_dice_increment', 'upcast_die_size',
            'source', 'description', 'higher_level', 'raw_data',
            'damage_components'
        ]
