"""Temporary diagnostic script."""
from django.core.management.base import BaseCommand
from spells.models import Spell


class Command(BaseCommand):
    help = 'Check upcast data gaps'

    def handle(self, *args, **options):
        no_upcast = Spell.objects.filter(level__gt=0, upcast_dice_increment__isnull=True)
        self.stdout.write(f'Leveled spells without upcast: {no_upcast.count()}')

        has_hl = 0
        for s in no_upcast:
            hl = s.raw_data.get('higher_levels') or s.raw_data.get('higher_level', '')
            if hl:
                has_hl += 1
        self.stdout.write(f'Of those, with higher_levels text: {has_hl}')
        self.stdout.write(f'Genuinely no upcast info: {no_upcast.count() - has_hl}')

        # Show sample with higher_levels text
        self.stdout.write('\n--- Sample spells with higher_levels but no parsed upcast ---')
        shown = 0
        for s in no_upcast:
            hl = s.raw_data.get('higher_levels') or s.raw_data.get('higher_level', '')
            if hl and shown < 8:
                self.stdout.write(f'  {s.name} (L{s.level}): {str(hl)[:120]}')
                shown += 1

        # Also check cantrips
        ct_no = Spell.objects.filter(level=0, upcast_dice_increment__isnull=True)
        self.stdout.write(f'\nCantrips without upcast: {ct_no.count()}')
        for s in ct_no[:8]:
            desc = str(s.raw_data.get('description', s.raw_data.get('desc', '')))[:200]
            self.stdout.write(f'  {s.name}: {desc[:150]}')
