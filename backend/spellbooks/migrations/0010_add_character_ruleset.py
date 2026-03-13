from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spellbooks', '0009_add_sort_order_label_color'),
    ]

    operations = [
        migrations.AddField(
            model_name='character',
            name='ruleset',
            field=models.CharField(
                choices=[('2014', 'D&D 5e 2014'), ('2024', 'D&D 5e 2024')],
                default='2014',
                help_text="Rules edition this character uses (2014 or 2024).",
                max_length=10,
            ),
        ),
    ]
