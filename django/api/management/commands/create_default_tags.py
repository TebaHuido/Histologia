from django.core.management.base import BaseCommand
from api.models import Tag

class Command(BaseCommand):
    help = 'Create default tags'

    def handle(self, *args, **kwargs):
        default_tags = [
            {'name': 'Núcleo', 'public': True},
            {'name': 'Membrana', 'public': True},
            {'name': 'Citoplasma', 'public': True},
            {'name': 'Vaso sanguíneo', 'public': True},
            {'name': 'Fibra', 'public': True},
            {'name': 'Célula', 'public': True},
        ]

        for tag_data in default_tags:
            tag, created = Tag.objects.get_or_create(
                name=tag_data['name'],
                defaults={'public': tag_data['public']}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created tag "{tag.name}"'))
            else:
                self.stdout.write(f'Tag "{tag.name}" already exists')
