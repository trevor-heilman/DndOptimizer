"""
Management command to backfill the classes field for spells that have raw_data
but empty classes (typically system spells seeded before class parsing was added).
"""
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Backfill spell classes from raw_data for spells with empty classes list'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would be updated without making changes',
        )

    def handle(self, *args, **options):
        from spells.models import Spell

        dry_run = options['dry_run']
        updated = 0
        skipped = 0

        # Only process spells where classes is empty but raw_data may have class info
        candidates = Spell.objects.filter(classes=[])

        self.stdout.write(f'Found {candidates.count()} spells with empty classes.')

        for spell in candidates.iterator():
            raw_classes = spell.raw_data.get('classes', [])

            if not raw_classes:
                skipped += 1
                continue

            # Normalise to lowercase strings (raw may be strings or {name: str} dicts)
            if isinstance(raw_classes, list):
                classes = [
                    (c['name'].lower() if isinstance(c, dict) else str(c).lower())
                    for c in raw_classes
                    if c
                ]
            else:
                skipped += 1
                continue

            if not classes:
                skipped += 1
                continue

            if dry_run:
                self.stdout.write(f'  [dry-run] {spell.name}: {classes}')
            else:
                spell.classes = classes
                spell.save(update_fields=['classes'])

            updated += 1

        action = 'Would update' if dry_run else 'Updated'
        self.stdout.write(
            self.style.SUCCESS(
                f'\n{action} {updated} spells. Skipped {skipped} (no class data in raw_data).'
            )
        )
