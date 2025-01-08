#!/bin/bash

# Actualizar el sistema
echo "Actualizando el sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependencias necesarias
echo "Instalando dependencias..."
sudo apt install -y python3 python3-pip python3-venv nginx curl

# Instalar Node.js y npm
echo "Instalando Node.js y npm..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Angular CLI globalmente
echo "Instalando Angular CLI..."
sudo npm install -g @angular/cli

# Crear estructura en el home del usuario
echo "Configurando directorios..."
mkdir -p ~/histologia/{django,angular,images}

# Copiar archivos del proyecto
echo "Copiando archivos del proyecto..."
cp -r django/* ~/histologia/django/
cp -r angular/* ~/histologia/angular/
cp -r images/* ~/histologia/images/

# Instalar dependencias de Angular
echo "Instalando dependencias de Angular..."
cd ~/histologia/angular
npm install --legacy-peer-deps

# Volver al directorio original para continuar con la instalación
cd -

# Configurar entorno virtual Python
echo "Configurando entorno virtual Python..."
python3 -m venv ~/histologia/django/venv
source ~/histologia/django/venv/bin/activate
pip install --upgrade pip
pip install -r django/requirements.txt

# Generar archivo .env con clave secreta
echo "Generando archivo .env con clave secreta..."
echo "SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')" > ~/histologia/django/.env

# Instalar Gunicorn para producción
echo "Instalando Gunicorn..."
pip install gunicorn

# Crear directorio para archivos estáticos
echo "Creando directorio para archivos estáticos..."
sudo mkdir -p /var/www/html
sudo chown -R $USER:www-data /var/www/html
sudo chmod -R 755 /var/www/html

# Configurar Nginx
echo "Configurando Nginx..."
sudo cp nginx/conf.d/default.conf /etc/nginx/sites-available/histologia
sudo ln -sf /etc/nginx/sites-available/histologia /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Configurar y habilitar el servicio de Gunicorn
echo "Configurando y habilitando el servicio de Gunicorn..."
sudo cp django-histologia.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable django-histologia
sudo systemctl start django-histologia

# Reiniciar Nginx
echo "Reiniciando Nginx..."
sudo service nginx restart

# Dar permisos de ejecución y ejecutar start.sh
echo "Dando permisos de ejecución y ejecutando start.sh..."
chmod +x start.sh
./start.sh

echo "¡Instalación completada!"
