from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spellbooks', '0004_spellbook_character_class'),
    ]

    operations = [
        migrations.AddField(
            model_name='spellbook',
            name='character_level',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text='Character level (1–20) — used to display available spell slots.',
            ),
        ),
    ]
