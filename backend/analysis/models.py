import uuid
from django.db import models
from django.conf import settings


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
