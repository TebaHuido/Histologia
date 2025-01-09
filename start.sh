#!/bin/bash

# Función para manejar señales (SIGINT y SIGTERM)
cleanup() {
    echo "Apagando servicios..."
    kill -TERM "$DJANGO_PID" 2>/dev/null
    kill -TERM "$ANGULAR_PID" 2>/dev/null
    exit 0
}

# Atrapar señales
trap cleanup SIGINT SIGTERM

# Función para esperar que un servicio esté disponible
wait_for_service() {
    local host=$1
    local port=$2
    local service=$3
    local retries=30
    local wait=1

    for i in $(seq 1 $retries); do
        echo "Esperando que el servicio $service esté disponible... (intento $i/$retries)"
        if nc -z "$host" "$port"; then
            echo "Servicio $service está disponible"
            return 0
        fi
        sleep $wait
    done
    return 1
}

# Iniciar el servidor de Django
cd /usr/src/app/django
python manage.py runserver 0.0.0.0:8000 &
DJANGO_PID=$!

# Esperar a que Django esté disponible
wait_for_service 127.0.0.1 8000 "Django"

# Iniciar el servidor Angular con redirección de logs
cd /usr/src/app/angular
ng serve --host 127.0.0.1 --port 4200 --disable-host-check &
ANGULAR_PID=$!

# Iniciar Nginx en modo no daemon
nginx -g "daemon off;" &
NGINX_PID=$!

# Manejar el cierre de los procesos de Django y Angular
trap 'kill %1; kill %2' SIGINT SIGTERM

# Esperar por los procesos hijo
wait "$DJANGO_PID"
wait "$ANGULAR_PID"
wait "$NGINX_PID"
