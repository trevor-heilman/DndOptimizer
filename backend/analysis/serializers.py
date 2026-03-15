from rest_framework import serializers

from spells.serializers import SpellListSerializer

from .models import AnalysisContext, SpellComparison


class AnalysisContextSerializer(serializers.ModelSerializer):
    """
    Serializer for analysis context parameters.
    """
    class Meta:
        model = AnalysisContext
        fields = [
            'id', 'target_ac', 'target_save_bonus', 'spell_save_dc',
            'caster_attack_bonus', 'number_of_targets', 'advantage',
            'disadvantage', 'spell_slot_level', 'crit_enabled', 'crit_type',
            'half_damage_on_save', 'evasion_enabled', 'resistance',
            'lucky', 'elemental_adept_type', 'save_penalty_die',
            'spellcasting_ability_modifier', 'created_by', 'created_at'
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


class ContextParametersMixin(serializers.Serializer):
    """
    Shared mixin providing all 11 analysis context parameter fields.
    Validates that advantage and disadvantage are mutually exclusive.
    """
    target_ac = serializers.IntegerField(default=15, min_value=1, max_value=30)
    target_save_bonus = serializers.IntegerField(default=0, min_value=-5, max_value=15)
    spell_save_dc = serializers.IntegerField(default=15, min_value=1, max_value=30)
    caster_attack_bonus = serializers.IntegerField(default=5, min_value=-5, max_value=20)
    number_of_targets = serializers.IntegerField(default=1, min_value=1, max_value=20)
    advantage = serializers.BooleanField(default=False)
    disadvantage = serializers.BooleanField(default=False)
    spell_slot_level = serializers.IntegerField(default=1, min_value=1, max_value=9)
    character_level = serializers.IntegerField(default=1, min_value=1, max_value=20, required=False)
    crit_enabled = serializers.BooleanField(default=True)
    half_damage_on_save = serializers.BooleanField(default=True)
    evasion_enabled = serializers.BooleanField(default=False)
    resistance = serializers.BooleanField(default=False)
    crit_type = serializers.ChoiceField(
        choices=['double_dice', 'double_damage', 'max_plus_roll'],
        default='double_dice',
    )
    lucky = serializers.ChoiceField(
        choices=['none', 'halfling', 'lucky_feat'],
        default='none',
    )
    elemental_adept_type = serializers.CharField(
        max_length=50, required=False, allow_null=True, allow_blank=True, default=None,
    )
    save_penalty_die = serializers.ChoiceField(
        choices=['none', 'd4', 'd6', 'd8'],
        default='none',
    )

    def validate(self, attrs):
        if attrs.get('advantage') and attrs.get('disadvantage'):
            raise serializers.ValidationError(
                "Cannot have both advantage and disadvantage."
            )
        return attrs


class SpellComparisonRequestSerializer(ContextParametersMixin):
    """
    Serializer for requesting a spell comparison.
    Per-spell overrides for number_of_targets and resistance allow the caller
    to set different values for each spell (e.g. AoE vs single-target).
    If omitted they fall back to the shared context values.
    """
    spell_a_id = serializers.UUIDField(required=True)
    spell_b_id = serializers.UUIDField(required=True)
    # Per-spell overrides (optional)
    number_of_targets_a = serializers.IntegerField(default=None, required=False, allow_null=True, min_value=1, max_value=20)
    number_of_targets_b = serializers.IntegerField(default=None, required=False, allow_null=True, min_value=1, max_value=20)
    resistance_a = serializers.BooleanField(required=False, default=None, allow_null=True)
    resistance_b = serializers.BooleanField(required=False, default=None, allow_null=True)

    def validate(self, attrs):
        """Validate comparison request."""
        attrs = super().validate(attrs)

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


class SpellAnalysisRequestSerializer(ContextParametersMixin):
    """
    Serializer for analyzing a single spell.
    """
    spell_id = serializers.UUIDField(required=True)

    def validate_spell_id(self, value):
        """Validate that the spell exists."""
        from spells.models import Spell

        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell not found.")

        return value


class SpellEfficiencyRequestSerializer(ContextParametersMixin):
    """
    Serializer for analyzing spell efficiency across slot levels.
    """
    spell_id = serializers.UUIDField(required=True)
    min_slot_level = serializers.IntegerField(default=1, min_value=1, max_value=20)
    max_slot_level = serializers.IntegerField(default=9, min_value=1, max_value=20)

    def validate(self, attrs):
        """Validate efficiency request."""
        attrs = super().validate(attrs)

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


class BreakevenRequestSerializer(ContextParametersMixin):
    """
    Serializer for break-even analysis between two spells.
    Context params define the baseline; target_ac and target_save_bonus
    are swept automatically by the service.
    """
    spell_a_id = serializers.UUIDField(required=True)
    spell_b_id = serializers.UUIDField(required=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs['spell_a_id'] == attrs['spell_b_id']:
            raise serializers.ValidationError("Cannot compare a spell with itself.")
        return attrs

    def validate_spell_a_id(self, value):
        from spells.models import Spell
        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell A not found.")
        return value

    def validate_spell_b_id(self, value):
        from spells.models import Spell
        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell B not found.")
        return value


class CompareGrowthRequestSerializer(ContextParametersMixin):
    """
    Serializer for the compare_growth endpoint.
    Extends ContextParametersMixin so all advanced context fields (crit_type,
    lucky, elemental_adept_type, save_penalty_die) are present for
    AnalysisContext.from_data(). spell_slot_level is accepted but ignored —
    the service sweeps all character levels / slot levels internally.
    """
    spell_a_id = serializers.UUIDField(required=True)
    spell_b_id = serializers.UUIDField(required=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if attrs['spell_a_id'] == attrs['spell_b_id']:
            raise serializers.ValidationError("Cannot compare a spell with itself.")
        return attrs

    def validate_spell_a_id(self, value):
        from spells.models import Spell
        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell A not found.")
        return value

    def validate_spell_b_id(self, value):
        from spells.models import Spell
        if not Spell.objects.filter(id=value).exists():
            raise serializers.ValidationError("Spell B not found.")
        return value
