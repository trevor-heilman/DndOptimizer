from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('spellbooks', '0006_character'),
    ]

    operations = [
        migrations.AddField(
            model_name='spellbook',
            name='character',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='spellbooks',
                to='spellbooks.character',
                help_text='Character this spellbook belongs to (optional).',
            ),
        ),
        migrations.AddField(
            model_name='spellbook',
            name='book_color',
            field=models.CharField(
                max_length=30,
                default='violet',
                choices=[
                    ('violet', 'Violet'), ('crimson', 'Crimson'), ('emerald', 'Emerald'),
                    ('sapphire', 'Sapphire'), ('amber', 'Amber'), ('teal', 'Teal'),
                    ('indigo', 'Indigo'), ('gold', 'Gold'), ('ruby', 'Ruby'),
                    ('forest', 'Forest'), ('slate', 'Slate'), ('rose', 'Rose'),
                    ('copper', 'Copper'), ('midnight', 'Midnight'), ('ivory', 'Ivory'),
                    ('obsidian', 'Obsidian'),
                ],
                help_text='Spine color displayed on the library shelf.',
            ),
        ),
    ]
