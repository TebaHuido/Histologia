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
echo "Construcción de Angular completada."

# Mover archivos de Angular a directorio de Nginx
echo "Moviendo archivos de Angular a Nginx..."
sudo cp -r dist/myapp/* /var/www/html/
echo "Archivos de Angular movidos."

# Verificar que los archivos se hayan copiado correctamente
echo "Verificando que los archivos se hayan copiado correctamente..."
ls /var/www/html

# Recolectar archivos estáticos de Django
cd "$HOME/histologia/django"
source "$HOME/histologia/django/venv/bin/activate"
echo "Recolectando archivos estáticos de Django..."
python manage.py collectstatic --noinput
echo "Archivos estáticos de Django recolectados."

# Cargar variables de entorno
if [ -f .env ]; then
    export $(cat .env | xargs)
    echo "Variables de entorno cargadas."
fi

# Iniciar Gunicorn para Django con variables de entorno
echo "Iniciando Gunicorn para Django..."
gunicorn drf.wsgi:application --bind 0.0.0.0:8000 --workers 3 --daemon --env SECRET_KEY="$SECRET_KEY"
DJANGO_PID=$!
echo "Gunicorn iniciado."

# Detener Nginx si está en ejecución
echo "Deteniendo Nginx si está en ejecución..."
sudo systemctl stop nginx
echo "Nginx detenido."

# Iniciar Nginx
echo "Iniciando Nginx..."
sudo nginx -g "daemon off;" &
NGINX_PID=$!
echo "Nginx iniciado."

# Verificar que Gunicorn esté sirviendo la aplicación Django
echo "Verificando que Gunicorn esté sirviendo la aplicación Django..."
curl -I http://localhost:8000

# Verificar que Nginx esté sirviendo la aplicación Angular y la API de Django
echo "Verificando que Nginx esté sirviendo la aplicación Angular y la API de Django..."
curl -I http://localhost
curl -I http://localhost/api/

# Esperar por los procesos
wait "$NGINX_PID"