from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analysis', '0003_analysiscontext_resistance'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysiscontext',
            name='crit_type',
            field=models.CharField(
                choices=[
                    ('double_dice', 'Double Dice (standard 5e)'),
                    ('double_damage', 'Double Total Damage'),
                    ('max_plus_roll', 'Max Dice + Roll Again'),
                ],
                default='double_dice',
                max_length=20,
                help_text='How crit damage is calculated (table-specific house rules).',
            ),
        ),
        migrations.AddField(
            model_name='analysiscontext',
            name='lucky',
            field=models.CharField(
                choices=[
                    ('none', 'None'),
                    ('halfling', 'Halfling Lucky (reroll 1s)'),
                    ('lucky_feat', 'Lucky Feat (reroll misses)'),
                ],
                default='none',
                max_length=20,
                help_text='Re-roll mechanic granted by a feat or racial trait.',
            ),
        ),
        migrations.AddField(
            model_name='analysiscontext',
            name='elemental_adept_type',
            field=models.CharField(
                blank=True,
                null=True,
                max_length=50,
                help_text='Damage type for Elemental Adept (ignores resistance for this type).',
            ),
        ),
    ]
