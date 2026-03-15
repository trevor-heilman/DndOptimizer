from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spellbooks', '0010_add_character_ruleset'),
    ]

    operations = [
        migrations.AddField(
            model_name='character',
            name='prepared_spells_bonus',
            field=models.IntegerField(
                default=0,
                help_text='Bonus prepared spells from magic items, feats, or boons.',
            ),
        ),
    ]
