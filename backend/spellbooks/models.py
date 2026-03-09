import uuid
from django.db import models
from django.conf import settings


class Spellbook(models.Model):
    """
    User-defined collection of prepared spells.
    """
    CLASS_CHOICES = [
        ('artificer', 'Artificer'),
        ('bard', 'Bard'),
        ('cleric', 'Cleric'),
        ('druid', 'Druid'),
        ('paladin', 'Paladin'),
        ('ranger', 'Ranger'),
        ('sorcerer', 'Sorcerer'),
        ('warlock', 'Warlock'),
        ('wizard', 'Wizard'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    character_class = models.CharField(
        max_length=50,
        choices=CLASS_CHOICES,
        blank=True,
        help_text="Primary class — used to filter the Add Spells picker by default."
    )
    
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='spellbooks'
    )
    
    spells = models.ManyToManyField(
        'spells.Spell',
        through='PreparedSpell',
        related_name='spellbooks'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'spellbooks'
        verbose_name = 'Spellbook'
        verbose_name_plural = 'Spellbooks'
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['owner', '-updated_at']),
        ]

    def __str__(self):
        return f"{self.name} ({self.owner.username})"

    @property
    def spell_count(self):
        """Return the total number of spells in this spellbook."""
        return self.spells.count()

    @property
    def prepared_spell_count(self):
        """Return the number of prepared spells."""
        return self.prepared_spells.filter(prepared=True).count()


class PreparedSpell(models.Model):
    """
    Through model for Spellbook-Spell relationship.
    Tracks whether a spell is prepared.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    spellbook = models.ForeignKey(
        Spellbook,
        on_delete=models.CASCADE,
        related_name='prepared_spells'
    )
    spell = models.ForeignKey(
        'spells.Spell',
        on_delete=models.CASCADE,
        related_name='prepared_in'
    )
    prepared = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    
    added_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'prepared_spells'
        verbose_name = 'Prepared Spell'
        verbose_name_plural = 'Prepared Spells'
        unique_together = [['spellbook', 'spell']]
        ordering = ['spell__level', 'spell__name']

    def __str__(self):
        status = "Prepared" if self.prepared else "Not Prepared"
        return f"{self.spell.name} in {self.spellbook.name} ({status})"
