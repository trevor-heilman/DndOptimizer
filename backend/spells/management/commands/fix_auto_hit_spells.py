"""
Management command to correct auto-hit spells that were mis-classified
as non-damage by the parser (e.g. Magic Missile).
"""

from django.core.management.base import BaseCommand
from django.db import transaction

# Each entry: (name, number_of_attacks, upcast_attacks_increment, upcast_base_level,
#               dart_flat_modifier)
# dart_flat_modifier: added to *every* DamageComponent on the spell.
# default_component: created only if the spell has zero DamageComponent rows.
AUTO_HIT_CORRECTIONS = [
    {
        "name": "Magic Missile",
        "is_auto_hit": True,
        "number_of_attacks": 3,
        "upcast_attacks_increment": 1,
        "upcast_base_level": 1,
        "upcast_dice_increment": None,  # scaling is via extra darts, not extra dice
        "component_flat_modifier": 1,  # each dart: 1d4+1
        # Created if the spell has no DamageComponent rows (e.g. PHB 2024 text has no
        # standard dice pattern so the parser extracts nothing).
        "default_component": {
            "dice_count": 1,
            "die_size": 4,
            "flat_modifier": 1,
            "damage_type": "force",
            "timing": "on_hit",
        },
    },
]


class Command(BaseCommand):
    help = "Correct is_auto_hit and related fields on spells that the parser misclassified."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would be changed without saving.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        from spells.models import Spell

        dry_run = options["dry_run"]

        for cfg in AUTO_HIT_CORRECTIONS:
            name = cfg["name"]
            try:
                spell = Spell.objects.get(name=name)
            except Spell.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"  Spell not found: {name}"))
                continue
            except Spell.MultipleObjectsReturned:
                spells = Spell.objects.filter(name=name)
                self.stdout.write(
                    self.style.WARNING(f'  Multiple spells named "{name}" — updating all {spells.count()}.')
                )
                for s in spells:
                    self._apply(s, cfg, dry_run)
                continue

            self._apply(spell, cfg, dry_run)

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run — no changes saved."))
        else:
            self.stdout.write(self.style.SUCCESS("Auto-hit spell corrections applied."))

    def _apply(self, spell, cfg, dry_run):
        fields_changed = []

        for field in (
            "is_auto_hit",
            "number_of_attacks",
            "upcast_attacks_increment",
            "upcast_base_level",
            "upcast_dice_increment",
        ):
            desired = cfg.get(field)
            if desired is not None and getattr(spell, field) != desired:
                fields_changed.append(f"{field}: {getattr(spell, field)} → {desired}")
                if not dry_run:
                    setattr(spell, field, desired)

        flat_mod = cfg.get("component_flat_modifier")
        default_comp_spec = cfg.get("default_component")

        if default_comp_spec is not None and spell.damage_components.count() == 0:
            # Parser produced no DamageComponent rows — create one from the spec.
            from spells.models import DamageComponent

            fields_changed.append(
                f"  created default DamageComponent: "
                f"{default_comp_spec['dice_count']}d{default_comp_spec['die_size']}"
                f"+{default_comp_spec['flat_modifier']} {default_comp_spec['damage_type']}"
            )
            if not dry_run:
                DamageComponent.objects.create(spell=spell, **default_comp_spec)

        if flat_mod is not None:
            for comp in spell.damage_components.all():
                if comp.flat_modifier != flat_mod:
                    fields_changed.append(f"  component {comp.id} flat_modifier: {comp.flat_modifier} → {flat_mod}")
                    if not dry_run:
                        comp.flat_modifier = flat_mod
                        comp.save()

        if not dry_run and fields_changed:
            spell.save()

        if fields_changed:
            self.stdout.write(self.style.SUCCESS(f"[{spell.name}]"))
            for change in fields_changed:
                self.stdout.write(f"  {change}")
        else:
            self.stdout.write(f"[{spell.name}] — already correct, no changes needed.")
