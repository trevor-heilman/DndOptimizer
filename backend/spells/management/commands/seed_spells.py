"""
Management command to seed the database with spell data from JSON files.
"""
import json
import os

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from spells.services import SpellParsingService


class Command(BaseCommand):
    help = 'Seeds the database with spell data from JSON files'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            help='Path to a specific spell JSON file to import'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Import all default spell JSON files'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing spells before importing'
        )

    def handle(self, *args, **options):
        from spells.models import Spell

        # Clear existing spells if requested
        if options['clear']:
            self.stdout.write(self.style.WARNING('Clearing existing spells...'))
            Spell.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('Cleared all spells'))

        # Determine which files to import
        files_to_import = []

        if options['file']:
            files_to_import.append(options['file'])
        elif options['all']:
            # Default spell files bundled with the backend at <BASE_DIR>/data/
            data_dir = os.path.join(settings.BASE_DIR, 'data')

            default_files = ['spells.json', 'TCoE_spells.json']
            for filename in default_files:
                filepath = os.path.join(data_dir, filename)
                if os.path.exists(filepath):
                    files_to_import.append(filepath)
                else:
                    self.stdout.write(
                        self.style.WARNING(f'File not found: {filepath}')
                    )
        else:
            raise CommandError(
                'Please specify --file <path> or --all to import default files'
            )

        if not files_to_import:
            raise CommandError('No files to import')

        # Import each file
        total_imported = 0
        total_skipped = 0
        total_errors = 0

        for filepath in files_to_import:
            self.stdout.write(f'Importing from {filepath}...')
            imported, errors, skipped = self._import_file(filepath)
            total_imported += imported
            total_skipped += skipped
            total_errors += errors

            self.stdout.write(
                self.style.SUCCESS(f'  Imported {imported} spells')
            )
            if skipped > 0:
                self.stdout.write(
                    self.style.WARNING(f'  {skipped} spells already exist (name + source match) — skipped')
                )
            if errors > 0:
                self.stdout.write(
                    self.style.WARNING(f'  {errors} spells had errors')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nTotal: {total_imported} imported, {total_skipped} skipped (duplicate), {total_errors} errors'
            )
        )

    def _import_file(self, filepath: str) -> tuple:
        """Import spells from a single file. Returns (imported_count, error_count, skipped_count)."""
        from spells.models import Spell

        imported = 0
        errors = 0
        skipped = 0

        try:
            with open(filepath, encoding='utf-8') as f:
                data = json.load(f)
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to load file: {str(e)}')
            )
            return (0, 1, 0)

        # Handle different JSON structures
        spells = []
        if isinstance(data, list):
            spells = data
        elif isinstance(data, dict):
            # Keyed-dict export (e.g. TCoE: {"Spells.xxx": {...}, "Creatures.xxx": {...}})
            if any(k.startswith('Spells.') for k in data):
                spells = [v for k, v in data.items() if k.startswith('Spells.')]
            # Standard wrapper objects
            elif 'spells' in data:
                spells = data['spells']
            elif 'spell' in data:
                spells = data['spell']
            else:
                # Single spell object
                spells = [data]

        for raw_spell in spells:
            try:
                with transaction.atomic():
                    # Parse spell data
                    parsed = SpellParsingService.parse_spell_data(raw_spell)

                    # Dedup: skip if (name, source) already exists as a non-custom spell.
                    # This lets PHB 2014 and PHB 2024 versions of the same spell coexist,
                    # but prevents re-running an import from creating duplicates.
                    name = parsed['normalized_data'].get('name', '').strip()
                    source = parsed['normalized_data'].get('source', '').strip()
                    if Spell.objects.filter(name__iexact=name, source=source, is_custom=False).exists():
                        skipped += 1
                        continue

                    # Create spell with components
                    spell = SpellParsingService.create_spell_from_parsed_data(
                        parsed,
                        created_by=None  # System import
                    )

                    imported += 1

                    # Log if requires review
                    if parsed['requires_review']:
                        self.stdout.write(
                            self.style.WARNING(
                                f'  {spell.name}: Low confidence ({parsed["confidence"]:.2f}), '
                                f'requires review'
                            )
                        )

            except Exception as e:
                errors += 1
                spell_name = raw_spell.get('name') or raw_spell.get('Name', 'Unknown')
                self.stdout.write(
                    self.style.ERROR(
                        f'  Failed to import {spell_name}: {str(e)}'
                    )
                )

        return (imported, errors, skipped)
