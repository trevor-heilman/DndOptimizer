import uuid
from django.db import models
from django.conf import settings


class Spell(models.Model):
    """
    Canonical spell model for the analysis engine.
    Stores both normalized fields and flexible JSON data.
    """
    SCHOOL_CHOICES = [
        ('abjuration', 'Abjuration'),
        ('conjuration', 'Conjuration'),
        ('divination', 'Divination'),
        ('enchantment', 'Enchantment'),
        ('evocation', 'Evocation'),
        ('illusion', 'Illusion'),
        ('necromancy', 'Necromancy'),
        ('transmutation', 'Transmutation'),
    ]

    SAVE_TYPE_CHOICES = [
        ('STR', 'Strength'),
        ('DEX', 'Dexterity'),
        ('CON', 'Constitution'),
        ('INT', 'Intelligence'),
        ('WIS', 'Wisdom'),
        ('CHA', 'Charisma'),
    ]

    # Primary fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, db_index=True)
    level = models.IntegerField(db_index=True)
    school = models.CharField(max_length=50, choices=SCHOOL_CHOICES, db_index=True)
    
    # Casting properties
    casting_time = models.CharField(max_length=255, blank=True)
    range = models.CharField(max_length=255, blank=True)
    duration = models.CharField(max_length=255, blank=True)
    concentration = models.BooleanField(default=False)
    ritual = models.BooleanField(default=False)
    
    # Combat properties
    is_attack_roll = models.BooleanField(default=False)
    is_saving_throw = models.BooleanField(default=False)
    is_auto_hit = models.BooleanField(
        default=False,
        help_text='Spell automatically hits with no attack roll or saving throw (e.g. Magic Missile).'
    )
    save_type = models.CharField(max_length=3, choices=SAVE_TYPE_CHOICES, blank=True, null=True)
    half_damage_on_save = models.BooleanField(default=False)
    
    # Damage properties
    number_of_attacks = models.IntegerField(default=1)
    crit_enabled = models.BooleanField(default=True)
    aoe_radius = models.FloatField(null=True, blank=True)
    damage_type = models.CharField(max_length=50, blank=True)
    
    # Upcast properties
    upcast_base_level = models.IntegerField(null=True, blank=True)
    upcast_dice_increment = models.IntegerField(null=True, blank=True)
    upcast_die_size = models.IntegerField(null=True, blank=True)
    upcast_attacks_increment = models.IntegerField(
        null=True, blank=True,
        help_text='Additional attack rolls per slot level above upcast_base_level (e.g. Scorching Ray +1 ray/slot).'
    )
    
    # Spell components
    components_v = models.BooleanField(default=False, help_text='Verbal component required.')
    components_s = models.BooleanField(default=False, help_text='Somatic component required.')
    components_m = models.BooleanField(default=False, help_text='Material component required.')
    material = models.CharField(max_length=500, blank=True, help_text='Material component description.')

    # Metadata
    source = models.CharField(max_length=255, blank=True)
    is_custom = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    higher_level = models.TextField(blank=True)

    # Class associations — list of class names (e.g. ["wizard", "sorcerer"])
    classes = models.JSONField(
        default=list,
        blank=True,
        help_text='List of class names that can learn this spell.'
    )

    # Gameplay tags — e.g. ["damage", "aoe", "utility", "crowd_control"]
    tags = models.JSONField(
        default=list,
        blank=True,
        help_text='Gameplay category tags for filtering and analysis.'
    )
    
    # Flexible storage
    raw_data = models.JSONField(default=dict, blank=True)
    
    # Ownership
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='spells',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'spells'
        verbose_name = 'Spell'
        verbose_name_plural = 'Spells'
        ordering = ['level', 'name']
        indexes = [
            models.Index(fields=['level', 'school']),
            models.Index(fields=['created_by', 'level']),
        ]

    def __str__(self):
        return f"{self.name} (Level {self.level})"


class DamageComponent(models.Model):
    """
    Represents a single damage component of a spell.
    Supports multi-phase damage (initial, delayed, DoT, etc.)
    """
    TIMING_CHOICES = [
        ('on_hit', 'On Hit'),
        ('on_fail', 'On Failed Save'),
        ('on_success', 'On Successful Save'),
        ('end_of_turn', 'End of Turn'),
        ('per_round', 'Per Round'),
        ('delayed', 'Delayed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    spell = models.ForeignKey(Spell, on_delete=models.CASCADE, related_name='damage_components')
    
    dice_count = models.IntegerField()
    die_size = models.IntegerField()
    flat_modifier = models.IntegerField(default=0)
    damage_type = models.CharField(max_length=50)
    
    timing = models.CharField(max_length=20, choices=TIMING_CHOICES, default='on_hit')
    on_crit_extra = models.BooleanField(default=True)
    scales_with_slot = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'damage_components'
        verbose_name = 'Damage Component'
        verbose_name_plural = 'Damage Components'
        ordering = ['timing', 'damage_type']

    def __str__(self):
        return f"{self.dice_count}d{self.die_size} {self.damage_type} ({self.timing})"

    def average_damage(self) -> float:
        """Calculate average damage for this component."""
        return (self.dice_count * (self.die_size + 1) / 2) + self.flat_modifier


class SpellParsingMetadata(models.Model):
    """
    Metadata about automated spell parsing.
    Tracks confidence and verification status.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    spell = models.OneToOneField(Spell, on_delete=models.CASCADE, related_name='parsing_metadata')
    
    parsing_confidence = models.FloatField(default=0.0)
    requires_review = models.BooleanField(default=False)
    parsing_notes = models.JSONField(default=dict, blank=True)
    auto_extracted_components = models.JSONField(default=dict, blank=True)
    
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_spells'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'spell_parsing_metadata'
        verbose_name = 'Spell Parsing Metadata'
        verbose_name_plural = 'Spell Parsing Metadata'

    def __str__(self):
        return f"Parsing metadata for {self.spell.name}"
