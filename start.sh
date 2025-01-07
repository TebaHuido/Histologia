#!/bin/bash

# Función para manejar señales
cleanup() {
    echo "Apagando servicios..."
    kill -TERM "$DJANGO_PID" 2>/dev/null
    kill -TERM "$ANGULAR_PID" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Activar entorno virtual e iniciar Django
cd ~/histologia/django
source venv/bin/activate
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!

# Iniciar Angular
cd ~/histologia/angular
ng serve --host 0.0.0.0 --port 4200 &
ANGULAR_PID=$!

# Esperar por los procesos
wait "$DJANGO_PID" "$ANGULAR_PID"