"""
Data migration: fix "Summon Greater Demon" spell level (5 → 4).

The XGtE import incorrectly set level=5 for this spell.  The higher_levels
text ("for each slot level above 4th") confirms it is a 4th-level spell.
"""
from django.db import migrations


def fix_summon_greater_demon(apps, schema_editor):
    Spell = apps.get_model('spells', 'Spell')
    Spell.objects.filter(
        name='Summon Greater Demon',
        level=5,
    ).update(level=4)


class Migration(migrations.Migration):

    dependencies = [
        ('spells', '0010_data_summon_spell_fixes'),
    ]

    operations = [
        migrations.RunPython(fix_summon_greater_demon, migrations.RunPython.noop),
    ]
