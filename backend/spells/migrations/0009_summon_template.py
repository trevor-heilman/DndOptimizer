import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spells', '0008_damagecomponent_upcast_dice_increment'),
    ]

    operations = [
        migrations.CreateModel(
            name='SummonTemplate',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(help_text='e.g. "Shadow Spirit: Despair"', max_length=255)),
                ('creature_type', models.CharField(blank=True, help_text='e.g. "Medium monstrosity, unaligned"', max_length=255)),
                ('source', models.CharField(default='TCoE', max_length=50)),
                ('base_hp', models.IntegerField(help_text='HP at hp_base_level.')),
                ('hp_per_level', models.IntegerField(default=0, help_text='Additional HP per spell slot level above hp_base_level.')),
                ('hp_base_level', models.IntegerField(help_text='The spell slot level at which base_hp applies (e.g. 3 for "+X above 3rd").')),
                ('base_ac', models.IntegerField(help_text='AC value when ac_per_level == 0, or the additive base.')),
                ('ac_per_level', models.IntegerField(default=0, help_text='1 when AC formula is "base + spell level" (e.g. 11 + spell level).')),
                ('num_attacks_formula', models.CharField(
                    choices=[('floor_half_level', 'floor(spell_level / 2)')],
                    default='floor_half_level',
                    help_text='Formula to compute number of attacks per round.',
                    max_length=50,
                )),
                ('raw_data', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('spell', models.ForeignKey(
                    help_text='The casting spell this creature is summoned by.',
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='summon_templates',
                    to='spells.spell',
                )),
            ],
            options={
                'verbose_name': 'Summon Template',
                'verbose_name_plural': 'Summon Templates',
                'db_table': 'summon_templates',
                'ordering': ['spell__level', 'name'],
            },
        ),
        migrations.CreateModel(
            name='SummonAttack',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('name', models.CharField(help_text='e.g. "Chilling Rend"', max_length=255)),
                ('attack_type', models.CharField(
                    choices=[
                        ('melee_weapon', 'Melee Weapon Attack'),
                        ('ranged_weapon', 'Ranged Weapon Attack'),
                        ('melee_spell', 'Melee Spell Attack'),
                        ('ranged_spell', 'Ranged Spell Attack'),
                    ],
                    max_length=20,
                )),
                ('dice_count', models.IntegerField()),
                ('die_size', models.IntegerField()),
                ('flat_modifier', models.IntegerField(default=0, help_text='Flat bonus added to every hit (e.g. 3 for "+3").')),
                ('flat_per_level', models.IntegerField(default=0, help_text="Additional flat damage per spell slot level (1 for \"+ the spell's level\").")),
                ('damage_type', models.CharField(max_length=50)),
                ('secondary_dice_count', models.IntegerField(default=0, help_text='0 means no secondary damage.')),
                ('secondary_die_size', models.IntegerField(default=0)),
                ('secondary_flat', models.IntegerField(default=0)),
                ('secondary_damage_type', models.CharField(blank=True, max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('summon', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='attacks',
                    to='spells.summontemplate',
                )),
            ],
            options={
                'verbose_name': 'Summon Attack',
                'verbose_name_plural': 'Summon Attacks',
                'db_table': 'summon_attacks',
                'ordering': ['name'],
            },
        ),
    ]
