from rest_framework import serializers
from .models import AnalysisContext, SpellComparison
from spells.serializers import SpellListSerializer


class AnalysisContextSerializer(serializers.ModelSerializer):
    """
    Serializer for analysis context parameters.
    """
    class Meta:
        model = AnalysisContext
        fields = [
            'id', 'target_ac', 'target_save_bonus', 'spell_save_dc',
            'caster_attack_bonus', 'number_of_targets', 'advantage',
            'disadvantage', 'spell_slot_level', 'crit_enabled',
            'half_damage_on_save', 'evasion_enabled', 'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at']

    def validate(self, attrs):
        """Validate context parameters."""
        if attrs.get('advantage') and attrs.get('disadvantage'):
            raise serializers.ValidationError(
                "Cannot have both advantage and disadvantage."
            )
        
        if attrs.get('spell_slot_level', 1) < 1 or attrs.get('spell_slot_level', 1) > 9:
            raise serializers.ValidationError(
                "Spell slot level must be between 1 and 9."
            )
        
        if attrs.get('number_of_targets', 1) < 1:
            raise serializers.ValidationError(
                "Number of targets must be at least 1."
            )
        
        return attrs


class SpellComparisonSerializer(serializers.ModelSerializer):
    """
    Serializer for spell comparison results.
    """
    spell_a = SpellListSerializer(read_only=True)
    spell_b = SpellListSerializer(read_only=True)
    context = AnalysisContextSerializer(read_only=True)

    class Meta:
        model = SpellComparison
        fields = ['id', 'spell_a', 'spell_b', 'context', 'results', 'created_at']
        read_only_fields = ['id', 'results', 'created_at']


class SpellComparisonRequestSerializer(serializers.Serializer):
    """
    Serializer for requesting a spell comparison.
    """
    spell_a_id = serializers.UUIDField(required=True)
    spell_b_id = serializers.UUIDField(required=True)
    
    # Context parameters
    target_ac = serializers.IntegerField(default=15, min_value=1, max_value=30)
    target_save_bonus = serializers.IntegerField(default=0, min_value=-5, max_value=15)
    spell_save_dc = serializers.IntegerField(default=15, min_value=1, max_value=30)
    caster_attack_bonus = serializers.IntegerField(default=5, min_value=-5, max_value=20)
    number_of_targets = serializers.IntegerField(default=1, min_value=1, max_value=20)
    advantage = serializers.BooleanField(default=False)
    disadvantage = serializers.BooleanField(default=False)
    spell_slot_level = serializers.IntegerField(default=1, min_value=1, max_value=9)
    crit_enabled = serializers.BooleanField(default=True)
    half_damage_on_save = serializers.BooleanField(default=True)
    evasion_enabled = serializers.BooleanField(default=False)

    def validate(self, attrs):
        """Validate comparison request."""
        if attrs.get('advantage') and attrs.get('disadvantage'):
            raise serializers.ValidationError(
                "Cannot have both advantage and disadvantage."
            )
        
        if attrs['spell_a_id'] == attrs['spell_b_id']:
            raise serializers.ValidationError(
                "Cannot compare a spell with itself."
            )
        
        return attrs

    def validate_spell_a_id(self, value):
        """Validate that spell A exists."""
        from spells.models import Spell
        
        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell A not found.")
        
        return value

    def validate_spell_b_id(self, value):
        """Validate that spell B exists."""
        from spells.models import Spell
        
        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell B not found.")
        
        return value


class SpellAnalysisRequestSerializer(serializers.Serializer):
    """
    Serializer for analyzing a single spell.
    """
    spell_id = serializers.UUIDField(required=True)
    
    # Context parameters
    target_ac = serializers.IntegerField(default=15, min_value=1, max_value=30)
    target_save_bonus = serializers.IntegerField(default=0, min_value=-5, max_value=15)
    spell_save_dc = serializers.IntegerField(default=15, min_value=1, max_value=30)
    caster_attack_bonus = serializers.IntegerField(default=5, min_value=-5, max_value=20)
    number_of_targets = serializers.IntegerField(default=1, min_value=1, max_value=20)
    advantage = serializers.BooleanField(default=False)
    disadvantage = serializers.BooleanField(default=False)
    spell_slot_level = serializers.IntegerField(default=1, min_value=1, max_value=9)
    crit_enabled = serializers.BooleanField(default=True)
    half_damage_on_save = serializers.BooleanField(default=True)
    evasion_enabled = serializers.BooleanField(default=False)

    def validate(self, attrs):
        """Validate analysis request."""
        if attrs.get('advantage') and attrs.get('disadvantage'):
            raise serializers.ValidationError(
                "Cannot have both advantage and disadvantage."
            )
        
        return attrs

    def validate_spell_id(self, value):
        """Validate that the spell exists."""
        from spells.models import Spell
        
        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell not found.")
        
        return value


class SpellEfficiencyRequestSerializer(serializers.Serializer):
    """
    Serializer for analyzing spell efficiency across slot levels.
    """
    spell_id = serializers.UUIDField(required=True)
    min_slot_level = serializers.IntegerField(default=1, min_value=1, max_value=9)
    max_slot_level = serializers.IntegerField(default=9, min_value=1, max_value=9)
    
    # Context parameters
    target_ac = serializers.IntegerField(default=15, min_value=1, max_value=30)
    target_save_bonus = serializers.IntegerField(default=0, min_value=-5, max_value=15)
    spell_save_dc = serializers.IntegerField(default=15, min_value=1, max_value=30)
    caster_attack_bonus = serializers.IntegerField(default=5, min_value=-5, max_value=20)
    number_of_targets = serializers.IntegerField(default=1, min_value=1, max_value=20)
    advantage = serializers.BooleanField(default=False)
    disadvantage = serializers.BooleanField(default=False)
    crit_enabled = serializers.BooleanField(default=True)
    half_damage_on_save = serializers.BooleanField(default=True)
    evasion_enabled = serializers.BooleanField(default=False)

    def validate(self, attrs):
        """Validate efficiency request."""
        if attrs.get('advantage') and attrs.get('disadvantage'):
            raise serializers.ValidationError(
                "Cannot have both advantage and disadvantage."
            )
        
        if attrs['min_slot_level'] > attrs['max_slot_level']:
            raise serializers.ValidationError(
                "min_slot_level cannot be greater than max_slot_level."
            )
        
        return attrs

    def validate_spell_id(self, value):
        """Validate that the spell exists."""
        from spells.models import Spell
        
        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell not found.")
        
        return value
