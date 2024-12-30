import pandas as pd
from .models import Alumno, Curso, CustomUser
from io import BytesIO

def create_alumnos_from_xls(file, curso_data):
    try:
        # Read the file content into a BytesIO object
        file_content = BytesIO(file.read())
        
        # Debugging: Print the first few bytes of the file content
        print("First few bytes of the file content:", file_content.getvalue()[:100])
        
        # Specify the engine based on the file extension and skip the first row
        if file.name.endswith('.xls'):
            df = pd.read_excel(file_content, engine='xlrd', skiprows=1)
        else:
            df = pd.read_excel(file_content, engine='openpyxl', skiprows=1)
        
        # Debugging: Print the columns of the DataFrame
        print("Columns in the uploaded file:", df.columns)
        
        # Check if the required columns are present
        required_columns = ['RUT', 'NOMBRE', 'CARRERA', 'EMAIL']
        for column in required_columns:
            if column not in df.columns:
                raise ValueError(f"Missing required column: {column}")
    except Exception as e:
        raise ValueError(f"Error reading the Excel file: {e}")

    # Create or get the curso
    curso, created = Curso.objects.get_or_create(
        asignatura=curso_data['asignatura'],
        anio=curso_data['anio'],
        semestre=curso_data['semestre'],
        grupo=curso_data['grupo']
    )

    created_alumnos = []
    existing_alumnos = []

    for _, row in df.iterrows():
        # Generar una contraseña inicial basada en el RUT
        initial_password = f"{row['RUT']}123"  # Se puede cambiar esta lógica
        
        user, created = CustomUser.objects.get_or_create(
            username=row['RUT'],
            defaults={
                'email': row['EMAIL'],
                'is_profesor': False,
                'is_alumno': True,
            }
        )
        
        # Establecer la contraseña solo si el usuario es nuevo
        if created:
            user.set_password(initial_password)
            user.save()
            print(f"Created user {user.username} with password {initial_password}")
        
        alumno, created = Alumno.objects.get_or_create(
            user=user,
            defaults={
                'name': row['NOMBRE'],
            }
        )
        alumno.curso.add(curso)
        
        if created:
            created_alumnos.append({
                'name': alumno.name,
                'username': user.username,
                'password': initial_password if created else 'already_exists'
            })
        else:
            existing_alumnos.append(alumno.name)

    return {
        "curso": curso,  # Retorna el objeto curso en lugar de serializarlo
        "curso_created": created,
        "created_alumnos": created_alumnos,
        "existing_alumnos": existing_alumnos
    }

