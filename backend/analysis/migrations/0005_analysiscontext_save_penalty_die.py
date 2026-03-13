from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analysis', '0004_analysiscontext_advanced_params'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysiscontext',
            name='save_penalty_die',
            field=models.CharField(
                choices=[
                    ('none', 'None'),
                    ('d4', '-1d4 avg \u22122.5 (Mind Sliver / Bane)'),
                    ('d6', '-1d6 avg \u22123.5 (Synaptic Static)'),
                    ('d8', '-1d8 avg \u22124.5'),
                ],
                default='none',
                max_length=10,
                help_text='Die the target subtracts from saving throws (Mind Sliver, Bane, Synaptic Static).',
            ),
        ),
    ]
