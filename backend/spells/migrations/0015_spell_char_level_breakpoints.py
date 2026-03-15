from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spells', '0014_upcast_scale_step'),
    ]

    operations = [
        migrations.AddField(
            model_name='spell',
            name='char_level_breakpoints',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text=(
                    'Character-level scaling breakpoints for spells that add bonus damage at '
                    'certain character levels (e.g. GFB, Booming Blade). Keys are character-level '
                    'thresholds as strings; values are {"die_count": N, "die_size": N, "flat": N}. '
                    'The highest applicable threshold is used.'
                ),
            ),
        ),
    ]
