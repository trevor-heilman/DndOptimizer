from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spells', '0003_spell_classes_spell_tags'),
    ]

    operations = [
        migrations.AddField(
            model_name='spell',
            name='components_v',
            field=models.BooleanField(default=False, help_text='Verbal component required.'),
        ),
        migrations.AddField(
            model_name='spell',
            name='components_s',
            field=models.BooleanField(default=False, help_text='Somatic component required.'),
        ),
        migrations.AddField(
            model_name='spell',
            name='components_m',
            field=models.BooleanField(default=False, help_text='Material component required.'),
        ),
        migrations.AddField(
            model_name='spell',
            name='material',
            field=models.CharField(blank=True, help_text='Material component description.', max_length=500),
        ),
    ]
