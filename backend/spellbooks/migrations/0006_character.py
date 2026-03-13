from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('spellbooks', '0005_spellbook_character_level'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Character',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(max_length=100)),
                ('character_class', models.CharField(
                    blank=True, max_length=50,
                    choices=[
                        ('artificer', 'Artificer'), ('bard', 'Bard'), ('cleric', 'Cleric'),
                        ('druid', 'Druid'), ('paladin', 'Paladin'), ('ranger', 'Ranger'),
                        ('sorcerer', 'Sorcerer'), ('warlock', 'Warlock'), ('wizard', 'Wizard'),
                    ],
                )),
                ('character_level', models.IntegerField(default=1)),
                ('subclass', models.CharField(
                    blank=True, max_length=100,
                    help_text='Subclass (wizard subclass affects spellbook copy costs).',
                )),
                ('portrait_color', models.CharField(
                    max_length=30, default='violet',
                    choices=[
                        ('violet', 'Violet'), ('crimson', 'Crimson'), ('emerald', 'Emerald'),
                        ('sapphire', 'Sapphire'), ('amber', 'Amber'), ('teal', 'Teal'),
                        ('indigo', 'Indigo'), ('gold', 'Gold'), ('ruby', 'Ruby'),
                        ('forest', 'Forest'), ('slate', 'Slate'), ('rose', 'Rose'),
                        ('copper', 'Copper'), ('midnight', 'Midnight'), ('ivory', 'Ivory'),
                        ('obsidian', 'Obsidian'),
                    ],
                    help_text="Accent color for this character's shelf.",
                )),
                ('spellcasting_ability_modifier', models.IntegerField(
                    default=0,
                    help_text='Spellcasting ability modifier (e.g. +3 for INT 16).',
                )),
                ('dc_bonus', models.IntegerField(
                    default=0,
                    help_text='Bonus to spell save DC from items or boons.',
                )),
                ('attack_bonus_extra', models.IntegerField(
                    default=0,
                    help_text='Bonus to spell attack rolls from items or boons.',
                )),
                ('spell_slots_used', models.JSONField(
                    default=list,
                    help_text='Number of used spell slots per level (9 elements).',
                )),
                ('school_copy_discounts', models.JSONField(
                    default=dict,
                    help_text='School-specific spellbook copy cost discounts (0–100%).',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('owner', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='characters',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Character',
                'verbose_name_plural': 'Characters',
                'db_table': 'characters',
                'ordering': ['-updated_at'],
            },
        ),
    ]
