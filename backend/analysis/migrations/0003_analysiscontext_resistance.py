from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analysis', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='analysiscontext',
            name='resistance',
            field=models.BooleanField(default=False),
        ),
    ]
