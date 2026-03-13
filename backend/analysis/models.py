import uuid
from django.db import models
from django.conf import settings


CRIT_TYPE_CHOICES = [
    ('double_dice', 'Double Dice (standard 5e)'),
    ('double_damage', 'Double Total Damage'),
    ('max_plus_roll', 'Max Dice + Roll Again'),
]

LUCKY_CHOICES = [
    ('none', 'None'),
    ('halfling', 'Halfling Lucky (reroll 1s)'),
    ('lucky_feat', 'Lucky Feat (reroll misses)'),
]

SAVE_PENALTY_DIE_CHOICES = [
    ('none', 'None'),
    ('d4', '-1d4 avg −2.5 (Mind Sliver / Bane)'),
    ('d6', '-1d6 avg −3.5 (Synaptic Static)'),
    ('d8', '-1d8 avg −4.5'),
]


class AnalysisContext(models.Model):
    """
    Stores parameters for a spell analysis run.
    Used for comparison, efficiency analysis, etc.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Combat context
    target_ac = models.IntegerField(default=15)
    target_save_bonus = models.IntegerField(default=0)
    spell_save_dc = models.IntegerField(default=15)
    caster_attack_bonus = models.IntegerField(default=5)
    
    # Tactical context
    number_of_targets = models.IntegerField(default=1)
    advantage = models.BooleanField(default=False)
    disadvantage = models.BooleanField(default=False)
    spell_slot_level = models.IntegerField(default=1)
    
    # Special conditions
    crit_enabled = models.BooleanField(default=True)
    half_damage_on_save = models.BooleanField(default=True)
    evasion_enabled = models.BooleanField(default=False)
    resistance = models.BooleanField(default=False)

    # Advanced combat modifiers
    crit_type = models.CharField(
        max_length=20, choices=CRIT_TYPE_CHOICES, default='double_dice',
        help_text='How crit damage is calculated (table-specific house rules).',
    )
    lucky = models.CharField(
        max_length=20, choices=LUCKY_CHOICES, default='none',
        help_text='Re-roll mechanic granted by a feat or racial trait.',
    )
    elemental_adept_type = models.CharField(
        max_length=50, blank=True, null=True,
        help_text='Damage type for Elemental Adept (ignores resistance for this type).',
    )
    save_penalty_die = models.CharField(
        max_length=10, choices=SAVE_PENALTY_DIE_CHOICES, default='none',
        help_text='Die the target subtracts from saving throws (Mind Sliver, Bane, Synaptic Static).',
    )
    
    # Metadata
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='analysis_contexts',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'analysis_contexts'
        verbose_name = 'Analysis Context'
        verbose_name_plural = 'Analysis Contexts'

    def __str__(self):
        return f"Analysis (AC:{self.target_ac}, Save DC:{self.spell_save_dc}, Targets:{self.number_of_targets})"

    # Context field names shared by all create helpers
    _CONTEXT_FIELDS = (
        'target_ac', 'target_save_bonus', 'spell_save_dc', 'caster_attack_bonus',
        'number_of_targets', 'advantage', 'disadvantage', 'spell_slot_level',
        'crit_enabled', 'crit_type', 'half_damage_on_save', 'evasion_enabled', 'resistance',
        'lucky', 'elemental_adept_type', 'save_penalty_die',
    )

    @classmethod
    def create_from_data(cls, data: dict, user=None) -> 'AnalysisContext':
        """Create and persist an AnalysisContext from validated serializer data."""
        return cls.objects.create(
            **{k: data[k] for k in cls._CONTEXT_FIELDS},
            created_by=user,
        )

    @classmethod
    def from_data(cls, data: dict, slot_override: int | None = None) -> 'AnalysisContext':
        """Build an unsaved AnalysisContext for in-memory use (e.g. efficiency loop)."""
        fields = {k: data[k] for k in cls._CONTEXT_FIELDS if k != 'spell_slot_level'}
        fields['spell_slot_level'] = slot_override if slot_override is not None else data.get('spell_slot_level', 1)
        return cls(**fields)


class SpellComparison(models.Model):
    """
    Stores results of a spell comparison analysis.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    spell_a = models.ForeignKey(
        'spells.Spell',
        on_delete=models.CASCADE,
        related_name='comparisons_as_a'
    )
    spell_b = models.ForeignKey(
        'spells.Spell',
        on_delete=models.CASCADE,
        related_name='comparisons_as_b'
    )
    context = models.ForeignKey(
        AnalysisContext,
        on_delete=models.CASCADE,
        related_name='comparisons'
    )
    
    # Results
    results = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'spell_comparisons'
        verbose_name = 'Spell Comparison'
        verbose_name_plural = 'Spell Comparisons'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.spell_a.name} vs {self.spell_b.name}"
