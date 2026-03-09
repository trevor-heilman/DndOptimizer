"""
Management command: populate classes and tags on all Spell records.

Classes are read from raw_data['classes'] and normalised to lowercase.
Tags are auto-generated from the spell's existing parsed fields:
  damage     — has at least one DamageComponent
  aoe        — aoe_radius is set
  concentration — spell is concentration
  ritual     — spell is a ritual
  healing    — description contains heal / hit points
  crowd_control — enchantment/transmutation + saving throw
  utility    — abjuration, or non-attack/save spells without damage
"""
from django.core.management.base import BaseCommand
from spells.models import Spell


_HEALING_KEYWORDS = ('heal', 'hit point', 'regain')


class Command(BaseCommand):
    help = 'Populate classes and tags on all Spell records from raw_data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would be changed without saving.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        spells = Spell.objects.prefetch_related('damage_components').all()
        updated = 0

        for spell in spells:
            classes = self._extract_classes(spell)
            tags = self._generate_tags(spell)

            if dry_run:
                self.stdout.write(
                    f'{spell.name}: classes={classes}, tags={tags}'
                )
            else:
                spell.classes = classes
                spell.tags = tags
                spell.save(update_fields=['classes', 'tags'])
                updated += 1

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'Updated {updated} spells.')
            )

    # ------------------------------------------------------------------
    def _extract_classes(self, spell: Spell) -> list[str]:
        raw = spell.raw_data or {}
        raw_classes = raw.get('classes', [])
        if isinstance(raw_classes, list):
            return [c.lower().strip() for c in raw_classes if isinstance(c, str) and c.strip()]
        return []

    def _generate_tags(self, spell: Spell) -> list[str]:
        tags: list[str] = []

        has_damage = spell.damage_components.exists()
        desc_lower = (spell.description or '').lower()

        if has_damage:
            tags.append('damage')
        if spell.aoe_radius:
            tags.append('aoe')
        if spell.concentration:
            tags.append('concentration')
        if spell.ritual:
            tags.append('ritual')
        if any(kw in desc_lower for kw in _HEALING_KEYWORDS):
            tags.append('healing')
        if (
            spell.school in ('enchantment', 'transmutation')
            and spell.is_saving_throw
            and not has_damage
        ):
            tags.append('crowd_control')
        if (
            spell.school in ('abjuration', 'divination')
            and not has_damage
            and not spell.is_attack_roll
        ):
            tags.append('utility')

        return tags
