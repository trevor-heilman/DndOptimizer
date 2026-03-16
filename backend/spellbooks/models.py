import uuid
from typing import Any

from django.conf import settings
from django.db import models

CLASS_CHOICES = [
    ("artificer", "Artificer"),
    ("bard", "Bard"),
    ("cleric", "Cleric"),
    ("druid", "Druid"),
    ("paladin", "Paladin"),
    ("ranger", "Ranger"),
    ("sorcerer", "Sorcerer"),
    ("warlock", "Warlock"),
    ("wizard", "Wizard"),
]

RULESET_CHOICES = [
    ("2014", "D&D 5e 2014"),
    ("2024", "D&D 5e 2024"),
]

# 2024 Wizard prepared spells lookup (fixed per level, no modifier involved)
WIZARD_2024_PREPARED = {
    1: 4,
    2: 5,
    3: 6,
    4: 7,
    5: 9,
    6: 10,
    7: 11,
    8: 12,
    9: 14,
    10: 15,
    11: 16,
    12: 16,
    13: 17,
    14: 18,
    15: 19,
    16: 21,
    17: 22,
    18: 23,
    19: 24,
    20: 25,
}

BOOK_COLOR_CHOICES = [
    ("violet", "Violet"),
    ("crimson", "Crimson"),
    ("emerald", "Emerald"),
    ("sapphire", "Sapphire"),
    ("amber", "Amber"),
    ("teal", "Teal"),
    ("indigo", "Indigo"),
    ("gold", "Gold"),
    ("ruby", "Ruby"),
    ("forest", "Forest"),
    ("slate", "Slate"),
    ("rose", "Rose"),
    ("copper", "Copper"),
    ("midnight", "Midnight"),
    ("ivory", "Ivory"),
    ("obsidian", "Obsidian"),
    ("white", "White"),
]


class Character(models.Model):
    """
    A player character who owns one or more spellbooks.
    Tracks spellcasting stats, spell slot usage, and spellbook copy costs.
    """

    WIZARD_SUBCLASS_CHOICES = [
        ("", "— None / Not a Wizard —"),
        ("order_of_scribes", "Order of Scribes"),
        ("bladesinging", "Bladesinging"),
        ("school_of_abjuration", "School of Abjuration"),
        ("school_of_conjuration", "School of Conjuration"),
        ("school_of_divination", "School of Divination"),
        ("school_of_enchantment", "School of Enchantment"),
        ("school_of_evocation", "School of Evocation"),
        ("school_of_illusion", "School of Illusion"),
        ("school_of_necromancy", "School of Necromancy"),
        ("school_of_transmutation", "School of Transmutation"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    character_class = models.CharField(max_length=50, choices=CLASS_CHOICES, blank=True)
    character_level = models.IntegerField(default=1)
    subclass = models.CharField(
        max_length=100,
        blank=True,
        help_text="Subclass (wizard subclass affects spellbook copy costs).",
    )
    portrait_color = models.CharField(
        max_length=30,
        choices=BOOK_COLOR_CHOICES,
        default="violet",
        help_text="Accent color for this character's shelf.",
    )

    # Spellcasting stats
    spellcasting_ability_modifier = models.IntegerField(
        default=0,
        help_text="Spellcasting ability modifier (e.g. +3 for INT 16).",
    )
    dc_bonus = models.IntegerField(
        default=0,
        help_text="Bonus to spell save DC from items or boons.",
    )
    attack_bonus_extra = models.IntegerField(
        default=0,
        help_text="Bonus to spell attack rolls from items or boons.",
    )

    # Spell slot usage — 9-element list [used_1, ..., used_9]; populated lazily
    spell_slots_used = models.JSONField(
        default=list,
        help_text="Number of used spell slots per level (9 elements).",
    )

    # Per-school copy-cost discount (%), e.g. {"evocation": 50}
    school_copy_discounts = models.JSONField(
        default=dict,
        help_text="School-specific spellbook copy cost discounts (0–100%).",
    )

    prepared_spells_bonus = models.IntegerField(
        default=0,
        help_text="Bonus prepared spells from magic items, feats, or boons.",
    )

    ruleset = models.CharField(
        max_length=10,
        choices=RULESET_CHOICES,
        default="2014",
        help_text="Rules edition this character uses (2014 or 2024).",
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="characters",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "characters"
        verbose_name = "Character"
        verbose_name_plural = "Characters"
        ordering = ["-updated_at"]

    def __str__(self) -> str:
        return f"{self.name} ({self.owner.username})"

    @property
    def proficiency_bonus(self) -> int:
        level = max(1, self.character_level or 1)
        return (level - 1) // 4 + 2

    @property
    def spell_save_dc(self) -> int:
        return 8 + self.proficiency_bonus + self.spellcasting_ability_modifier + self.dc_bonus

    @property
    def spell_attack_bonus(self) -> int:
        return self.proficiency_bonus + self.spellcasting_ability_modifier + self.attack_bonus_extra

    @property
    def max_prepared_spells(self) -> int | None:
        """
        Number of spells this character can have prepared at once.
        Returns None for classes that use a 'spells known' model.
        Branches on self.ruleset ('2014' or '2024').
        prepared_spells_bonus is always added on top of the base calculation.
        """
        mod = self.spellcasting_ability_modifier
        level = max(1, self.character_level or 1)
        cls = self.character_class
        is_2024 = self.ruleset == "2024"
        bonus = self.prepared_spells_bonus

        if cls == "wizard":
            base = WIZARD_2024_PREPARED.get(level, max(1, mod + level)) if is_2024 else max(1, mod + level)
            return base + bonus
        if cls in ("cleric", "druid"):
            return max(1, mod + level) + bonus
        if cls == "paladin":
            base = max(1, mod + level) if is_2024 else max(1, mod + level // 2)
            return base + bonus
        if cls == "artificer":
            return max(1, mod + level // 2) + bonus
        if cls == "bard" and is_2024:
            return max(1, mod + level) + bonus
        if cls == "ranger" and is_2024:
            return max(1, mod + level // 2) + bonus
        return None  # spells-known model


class Spellbook(models.Model):
    """
    User-defined collection of prepared spells belonging to a character.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    character_class = models.CharField(
        max_length=50,
        choices=CLASS_CHOICES,
        blank=True,
        help_text="Primary class — used to filter the Add Spells picker by default.",
    )
    character_level = models.IntegerField(
        null=True,
        blank=True,
        help_text="Character level (1–20) — used to display available spell slots.",
    )
    sort_order = models.IntegerField(
        default=0,
        help_text="Display position within a character's shelf (lower = further left).",
    )
    label_color = models.CharField(
        max_length=20,
        blank=True,
        help_text="Optional spine text color override (empty = use palette default).",
    )
    character = models.ForeignKey(
        Character,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="spellbooks",
        help_text="Character this spellbook belongs to (optional).",
    )
    book_color = models.CharField(
        max_length=30,
        choices=BOOK_COLOR_CHOICES,
        default="violet",
        help_text="Spine color displayed on the library shelf.",
    )

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="spellbooks",
    )

    spells: Any = models.ManyToManyField("spells.Spell", through="PreparedSpell", related_name="spellbooks")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "spellbooks"
        verbose_name = "Spellbook"
        verbose_name_plural = "Spellbooks"
        ordering = ["sort_order", "-updated_at"]
        indexes = [
            models.Index(fields=["owner", "sort_order"]),
            models.Index(fields=["owner", "-updated_at"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.username})"


class PreparedSpell(models.Model):
    """
    Through model for Spellbook-Spell relationship.
    Tracks whether a spell is prepared.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    spellbook = models.ForeignKey(Spellbook, on_delete=models.CASCADE, related_name="prepared_spells")
    spell = models.ForeignKey("spells.Spell", on_delete=models.CASCADE, related_name="prepared_in")
    prepared = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "prepared_spells"
        verbose_name = "Prepared Spell"
        verbose_name_plural = "Prepared Spells"
        unique_together = [["spellbook", "spell"]]
        ordering = ["spell__level", "spell__name"]

    def __str__(self):
        status = "Prepared" if self.prepared else "Not Prepared"
        return f"{self.spell.name} in {self.spellbook.name} ({status})"
