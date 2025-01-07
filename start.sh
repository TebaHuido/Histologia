#!/bin/bash

# Función para manejar señales
cleanup() {
    echo "Apagando servicios..."
    kill -TERM "$DJANGO_PID" 2>/dev/null
    kill -TERM "$NGINX_PID" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Construir Angular para producción
cd "$HOME/histologia/angular"
echo "Construyendo Angular para producción..."
ng build --configuration production

# Mover archivos de Angular a directorio de Nginx
sudo cp -r dist/myapp/* /var/www/html/

# Recolectar archivos estáticos de Django
cd "$HOME/histologia/django"
source "$HOME/histologia/django/venv/bin/activate"
python manage.py collectstatic --noinput

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | xargs)
fi

# Iniciar Gunicorn para Django con variables de entorno
gunicorn drf.wsgi:application --bind 0.0.0.0:8000 --workers 3 --daemon --env SECRET_KEY="$SECRET_KEY"
DJANGO_PID=$!

# Iniciar Nginx
sudo nginx -g "daemon off;" &
NGINX_PID=$!

# Esperar por los procesos
wait "$NGINX_PID"