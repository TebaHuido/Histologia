#!/bin/bash

# Función para manejar señales
cleanup() {
    echo "Apagando servicios..."
    kill -TERM "$DJANGO_PID" 2>/dev/null
    kill -TERM "$ANGULAR_PID" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Configurar autocompletado de Angular de manera silenciosa antes de iniciar servicios
if ! grep -q "ng completion" ~/.bashrc; then
    echo "Configurando autocompletado de Angular..."
    ng completion > /tmp/ng_completion
    cat /tmp/ng_completion >> ~/.bashrc
    source ~/.bashrc
    rm /tmp/ng_completion
fi

# Activar entorno virtual e iniciar Django
cd "$HOME/histologia/django"
source "$HOME/histologia/django/venv/bin/activate"
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!

# Iniciar Angular verificando la instalación
cd "$HOME/histologia/angular"
if [ ! -f "package.json" ]; then
    echo "Error: No se encontró package.json en el directorio de Angular"
    exit 1
fi

echo "Iniciando servidor Angular..."
export NODE_OPTIONS=--max_old_space_size=4096
ng serve --host 0.0.0.0 --port 4200 --disable-host-check &
ANGULAR_PID=$!

# Esperar por los procesos
wait "$DJANGO_PID" "$ANGULAR_PID"