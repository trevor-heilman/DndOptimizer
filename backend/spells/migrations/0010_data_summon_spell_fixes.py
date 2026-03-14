"""
Data migration: fix tags and combat flags for the 9 TCE summoning spells.

Previously these were imported with get_or_create whose defaults were not applied
because the spells already existed with tags=['utility'].  This migration:
  1. Sets tags=['summoning'] on all 9 Summon-X spells.
  2. Sets is_attack_roll=True so the analysis engine and UI treat them correctly
     (summon creatures make weapon/spell attacks using the caster's spell attack modifier).
"""
from django.db import migrations

SUMMON_SPELL_NAMES = [
    'Summon Beast',
    'Summon Fey',
    'Summon Shadowspawn',
    'Summon Undead',
    'Summon Aberration',
    'Summon Construct',
    'Summon Elemental',
    'Summon Celestial',
    'Summon Fiend',
]


def fix_summon_spells(apps, schema_editor):
    Spell = apps.get_model('spells', 'Spell')
    Spell.objects.filter(name__in=SUMMON_SPELL_NAMES).update(
        tags=['summoning'],
        is_attack_roll=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ('spells', '0009_summon_template'),
    ]

    operations = [
        migrations.RunPython(fix_summon_spells, migrations.RunPython.noop),
    ]
