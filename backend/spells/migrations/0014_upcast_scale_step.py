from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spells', '0013_damagecomponent_condition_label'),
    ]

    operations = [
        migrations.AddField(
            model_name='spell',
            name='upcast_scale_step',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text=(
                    'Number of slot levels required to gain one increment of upcast dice/attacks. '
                    'Defaults to 1 (every level). Set to 2 for spells that scale every other level '
                    '(e.g. Hex +1d6 per 2 levels, Shatter +1d8 per 2 levels).'
                ),
            ),
        ),
        migrations.AddField(
            model_name='damagecomponent',
            name='upcast_scale_step',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text=(
                    'Per-component override for the slot-level step size. '
                    'When set, overrides the spell-level upcast_scale_step for this component only.'
                ),
            ),
        ),
    ]
