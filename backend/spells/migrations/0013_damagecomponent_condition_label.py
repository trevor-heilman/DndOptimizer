from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spells', '0012_add_uses_spellcasting_modifier'),
    ]

    operations = [
        migrations.AddField(
            model_name='damagecomponent',
            name='condition_label',
            field=models.CharField(
                blank=True,
                help_text=(
                    'Optional free-text condition that must be met for this damage to apply '
                    '(e.g. "target is grappled", "after shoving prone"). '
                    'Informational/display only — the analysis engine treats this component as '
                    'included by default but it can be toggled off by the user.'
                ),
                max_length=100,
                null=True,
            ),
        ),
    ]
