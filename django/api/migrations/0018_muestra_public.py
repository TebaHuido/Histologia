# Generated by Django 5.0.6 on 2024-12-31 10:21

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0017_lote_active_lote_public'),
    ]

    operations = [
        migrations.AddField(
            model_name='muestra',
            name='public',
            field=models.BooleanField(default=False),
        ),
    ]
