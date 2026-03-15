"""
Management command to classify imported spells with the correct PHB edition.

Open5e and SRD imports assign source = "Player's Handbook" without a year.
All spells imported from those sources are 2014 edition content.
This command normalises them to "Player's Handbook (2014)".

Also normalises any loose variant strings ("Player's Handbook 2014",
"PHB", "Player's Handbook 2024", etc.) to their canonical forms.

Usage:
    python manage.py classify_phb_editions [--dry-run]
"""
from django.core.management.base import BaseCommand

from spells.models import Spell

# Map existing source strings → canonical form.
# Only keys listed here will be touched; everything else is left unchanged.
SOURCE_REMAP: dict[str, str] = {
    "Player's Handbook":      "Player's Handbook (2014)",
    "Player's Handbook 2014": "Player's Handbook (2014)",
    "PHB":                    "Player's Handbook (2014)",
    "Player's Handbook 2024": "Player's Handbook (2024)",
    "PHB 2024":               "Player's Handbook (2024)",
}

# Spells imported from the SRD seed file arrive with no source.
# Only reclassify non-custom spells (user-created spells that happen to have no
# source are left as-is so the user can set their own value).
EMPTY_SOURCE_TARGET = "Player's Handbook (2014)"


class Command(BaseCommand):
    help = "Normalise spell sources: classify Player's Handbook entries as 2014 or 2024."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Print what would change without writing to the database.',
        )

    def handle(self, *args, **options):
        dry_run: bool = options['dry_run']

        # Show current distinct sources for visibility
        distinct = (
            Spell.objects.values_list('source', flat=True)
            .distinct()
            .order_by('source')
        )
        self.stdout.write('Current distinct sources:')
        for s in distinct:
            self.stdout.write(f'  {s!r}')
        self.stdout.write('')

        total_updated = 0
        for old_source, new_source in SOURCE_REMAP.items():
            qs = Spell.objects.filter(source=old_source)
            count = qs.count()
            if count == 0:
                continue
            self.stdout.write(
                f'  {count:>4} spell(s): {old_source!r}  →  {new_source!r}'
                + (' (dry run)' if dry_run else '')
            )
            if not dry_run:
                qs.update(source=new_source)
            total_updated += count

        # Seed spells that arrived with no source at all → PHB (2014)
        empty_qs = Spell.objects.filter(source='', is_custom=False)
        empty_count = empty_qs.count()
        if empty_count:
            self.stdout.write(
                f'  {empty_count:>4} spell(s): (blank, non-custom)  →  {EMPTY_SOURCE_TARGET!r}'
                + (' (dry run)' if dry_run else '')
            )
            if not dry_run:
                empty_qs.update(source=EMPTY_SOURCE_TARGET)
            total_updated += empty_count

        if total_updated == 0:
            self.stdout.write(self.style.SUCCESS('Nothing to update — sources already canonical.'))
        elif dry_run:
            self.stdout.write(self.style.WARNING(f'Dry run complete. {total_updated} spell(s) would be updated.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Done. {total_updated} spell(s) updated.'))
