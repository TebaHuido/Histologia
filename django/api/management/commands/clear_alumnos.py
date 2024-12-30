from django.core.management.base import BaseCommand
from api.models import Alumno, CustomUser

class Command(BaseCommand):
    help = 'Clear all students (Alumnos) and their associated users from the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirm the deletion without prompting',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            confirm = input('Are you sure you want to delete all students? This action cannot be undone. [y/N]: ')
            if confirm.lower() != 'y':
                self.stdout.write(self.style.WARNING('Operation cancelled'))
                return

        try:
            # Get all student users
            student_users = CustomUser.objects.filter(is_alumno=True)
            num_users = student_users.count()
            
            # Delete all students and their associated users
            student_users.delete()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully deleted {num_users} students and their associated users'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error deleting students: {str(e)}')
            )
