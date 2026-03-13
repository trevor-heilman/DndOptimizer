from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('spells', '0007_add_half_damage_on_miss'),
    ]

    operations = [
        migrations.AddField(
            model_name='damagecomponent',
            name='upcast_dice_increment',
            field=models.IntegerField(
                blank=True,
                null=True,
                help_text=(
                    "Per-component upcast dice increment. When set, this component gains this many "
                    "extra dice per slot level above the spell's upcast_base_level, instead of using "
                    "the spell-level upcast_dice_increment."
                ),
            ),
        ),
    ]
