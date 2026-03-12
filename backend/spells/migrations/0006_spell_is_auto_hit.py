from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spells', '0005_add_upcast_attacks_increment'),
    ]

    operations = [
        migrations.AddField(
            model_name='spell',
            name='is_auto_hit',
            field=models.BooleanField(
                default=False,
                help_text='Spell automatically hits with no attack roll or saving throw (e.g. Magic Missile).',
            ),
        ),
    ]
