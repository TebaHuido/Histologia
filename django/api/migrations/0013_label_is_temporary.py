# Generated by Django 5.0.6 on 2024-12-24 14:40

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0012_label_creator_name_alter_label_created_by'),
    ]

    operations = [
        migrations.AddField(
            model_name='label',
            name='is_temporary',
            field=models.BooleanField(default=False),
        ),
    ]
