# Generated by Django 5.0.6 on 2024-12-31 11:36

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0018_muestra_public'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lote',
            name='active',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='lote',
            name='cursos',
            field=models.ManyToManyField(to='api.curso'),
        ),
        migrations.AlterField(
            model_name='lote',
            name='muestras',
            field=models.ManyToManyField(related_name='lotes', to='api.muestra'),
        ),
        migrations.AlterField(
            model_name='lote',
            name='name',
            field=models.CharField(max_length=100),
        ),
        migrations.AlterField(
            model_name='lote',
            name='public',
            field=models.BooleanField(default=False),
        ),
    ]
