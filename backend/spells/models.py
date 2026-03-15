import uuid

from django.conf import settings
from django.db import models


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
    half_damage_on_miss = models.BooleanField(
        default=False,
        help_text='Spell deals half damage on a missed attack roll (e.g. Acid Arrow).',
    )

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
    upcast_scale_step = models.IntegerField(
        null=True, blank=True,
        help_text=(
            'Number of slot levels required to gain one increment of upcast dice/attacks. '
            'Defaults to 1 (every level). Set to 2 for spells that scale every other level '
            '(e.g. Hex +1d6 per 2 levels, Shatter +1d8 per 2 levels).'
        ),
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

    # Character-level scaling breakpoints (e.g. Green-Flame Blade, Booming Blade).
    # Keys are character-level thresholds (strings); values are bonus dice totals at that tier.
    # Example: {"5": {"die_count": 1, "die_size": 8}, "11": {"die_count": 2, "die_size": 8}}
    # The engine picks the highest threshold <= context.character_level.
    char_level_breakpoints = models.JSONField(
        default=dict,
        blank=True,
        help_text=(
            'Character-level scaling breakpoints for spells that add bonus damage at '
            'certain character levels (e.g. GFB, Booming Blade). Keys are character-level '
            'thresholds as strings; values are {"die_count": N, "die_size": N, "flat": N}. '
            'The highest applicable threshold is used.'
        ),
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
    condition_label = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=(
            'Optional free-text condition that must be met for this damage to apply '
            '(e.g. "target is grappled", "after shoving prone"). '
            'Informational/display only — the analysis engine treats this component as '
            'included by default but it can be toggled off by the user.'
        ),
    )
    on_crit_extra = models.BooleanField(default=True)
    scales_with_slot = models.BooleanField(default=False)
    upcast_dice_increment = models.IntegerField(
        null=True, blank=True,
        help_text=(
            'Per-component upcast dice increment. When set, this component gains this many '
            'extra dice per slot level above the spell\'s upcast_base_level, instead of using '
            'the spell-level upcast_dice_increment.'
        ),
    )
    upcast_scale_step = models.IntegerField(
        null=True, blank=True,
        help_text=(
            'Per-component override for the slot-level step size. '
            'When set, overrides the spell-level upcast_scale_step for this component only.'
        ),
    )
    uses_spellcasting_modifier = models.BooleanField(
        default=False,
        help_text='When True, the caster\'s spellcasting ability modifier is added to this component\'s damage (e.g. Cure Wounds 1d8 + mod).'
    )
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


class SummonTemplate(models.Model):
    """
    Summoned creature stat block for a TCoE-style summoning spell.

    HP and AC scale with the spell slot used to cast the parent spell.
    All TCE summon creatures use the attack formula floor(spell_level / 2).
    """

    NUM_ATTACKS_CHOICES = [
        ('floor_half_level', 'floor(spell_level / 2)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    spell = models.ForeignKey(
        Spell,
        on_delete=models.CASCADE,
        related_name='summon_templates',
        help_text='The casting spell this creature is summoned by.',
    )
    name = models.CharField(max_length=255, help_text='e.g. "Shadow Spirit: Despair"')
    creature_type = models.CharField(max_length=255, blank=True, help_text='e.g. "Medium monstrosity, unaligned"')
    source = models.CharField(max_length=50, default='TCoE')

    # ── HP scaling formula ────────────────────────────────────────────────────
    base_hp = models.IntegerField(help_text='HP at hp_base_level.')
    hp_per_level = models.IntegerField(
        default=0,
        help_text='Additional HP per spell slot level above hp_base_level.',
    )
    hp_base_level = models.IntegerField(
        help_text='The spell slot level at which base_hp applies (e.g. 3 for "+X above 3rd").',
    )

    # ── AC scaling formula ────────────────────────────────────────────────────
    base_ac = models.IntegerField(help_text='AC value when ac_per_level == 0, or the additive base.')
    ac_per_level = models.IntegerField(
        default=0,
        help_text='1 when AC formula is "base + spell level" (e.g. 11 + spell level).',
    )

    # ── Multiattack ───────────────────────────────────────────────────────────
    num_attacks_formula = models.CharField(
        max_length=50,
        choices=NUM_ATTACKS_CHOICES,
        default='floor_half_level',
        help_text='Formula to compute number of attacks per round.',
    )

    raw_data = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'summon_templates'
        verbose_name = 'Summon Template'
        verbose_name_plural = 'Summon Templates'
        ordering = ['spell__level', 'name']

    def __str__(self) -> str:
        return f"{self.name} (via {self.spell.name})"

    def hp_at_level(self, slot_level: int) -> int:
        """Compute HP when the parent spell is cast at slot_level."""
        return self.base_hp + self.hp_per_level * max(0, slot_level - self.hp_base_level)

    def ac_at_level(self, slot_level: int) -> int:
        """Compute AC when the parent spell is cast at slot_level."""
        return self.base_ac + self.ac_per_level * slot_level

    def num_attacks_at_level(self, slot_level: int) -> int:
        """Number of attacks per round at the given slot level."""
        if self.num_attacks_formula == 'floor_half_level':
            return slot_level // 2
        return 1


class SummonAttack(models.Model):
    """
    A single attack action available to a summoned creature.

    Primary damage is stored directly; an optional secondary damage component
    handles cases like Fey spirits (piercing + force on every hit).
    """

    ATTACK_TYPE_CHOICES = [
        ('melee_weapon', 'Melee Weapon Attack'),
        ('ranged_weapon', 'Ranged Weapon Attack'),
        ('melee_spell', 'Melee Spell Attack'),
        ('ranged_spell', 'Ranged Spell Attack'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    summon = models.ForeignKey(SummonTemplate, on_delete=models.CASCADE, related_name='attacks')
    name = models.CharField(max_length=255, help_text='e.g. "Chilling Rend"')
    attack_type = models.CharField(max_length=20, choices=ATTACK_TYPE_CHOICES)

    # Primary damage ──────────────────────────────────────────────────────────
    dice_count = models.IntegerField()
    die_size = models.IntegerField()
    flat_modifier = models.IntegerField(
        default=0,
        help_text='Flat bonus added to every hit (e.g. 3 for "+3").',
    )
    flat_per_level = models.IntegerField(
        default=0,
        help_text='Additional flat damage per spell slot level (1 for "+ the spell\'s level").',
    )
    damage_type = models.CharField(max_length=50)

    # Optional secondary damage (e.g. Fey spirits: +1d6 force) ───────────────
    secondary_dice_count = models.IntegerField(
        default=0,
        help_text='0 means no secondary damage.',
    )
    secondary_die_size = models.IntegerField(default=0)
    secondary_flat = models.IntegerField(default=0)
    secondary_damage_type = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'summon_attacks'
        verbose_name = 'Summon Attack'
        verbose_name_plural = 'Summon Attacks'
        ordering = ['name']

    def __str__(self) -> str:
        return f"{self.name} ({self.summon.name})"

    def average_damage_at_level(self, slot_level: int) -> float:
        """Average damage for one hit at the given slot level."""
        primary = (
            self.dice_count * (self.die_size + 1) / 2
            + self.flat_modifier
            + self.flat_per_level * slot_level
        )
        secondary = (
            self.secondary_dice_count * (self.secondary_die_size + 1) / 2
            + self.secondary_flat
            if self.secondary_dice_count > 0
            else 0
        )
        return primary + secondary
