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

# Crear estructura en el home del usuario y establecer permisos
echo "Configurando directorios..."
mkdir -p ~/Histologia/{django,angular,images}
sudo chown -R $USER:$USER ~/Histologia
sudo chmod -R 755 ~/Histologia

# Crear directorio para archivos estáticos y establecer permisos
echo "Creando directorio para archivos estáticos..."
sudo mkdir -p /var/www/html
sudo mkdir -p /var/www/Histologia/django/staticfiles
sudo chown -R www-data:www-data /var/www
sudo chmod -R 755 /var/www

# Establecer permisos para los archivos copiados
sudo chown -R $USER:$USER ~/Histologia/django
sudo chown -R $USER:$USER ~/Histologia/angular
sudo chown -R www-data:www-data ~/Histologia/images
sudo chmod -R 755 ~/Histologia

# Instalar dependencias de Angular
echo "Instalando dependencias de Angular..."
cd ~/Histologia/angular
npm install --legacy-peer-deps

# Volver al directorio original para continuar con la instalación
cd -

# Configurar entorno virtual Python
echo "Configurando entorno virtual Python..."
python3 -m venv ~/Histologia/django/venv
sudo chown -R $USER:$USER ~/Histologia/django/venv
source ~/Histologia/django/venv/bin/activate
pip install --upgrade pip
pip install -r django/requirements.txt

# Generar archivo .env con clave secreta
echo "Generando archivo .env con clave secreta..."
echo "SECRET_KEY=$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')" > ~/Histologia/django/.env
sudo chown $USER:$USER ~/Histologia/django/.env
sudo chmod 600 ~/Histologia/django/.env

# Instalar Gunicorn para producción
echo "Instalando Gunicorn..."
pip install gunicorn

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

# Crear directorio para el socket de Gunicorn
sudo mkdir -p /run/gunicorn
sudo chown www-data:www-data /run/gunicorn
sudo chmod 755 /run/gunicorn

# Crear directorio y archivo de registro de Gunicorn
sudo mkdir -p /var/log/gunicorn
sudo touch /var/log/gunicorn/error.log
sudo chown -R www-data:www-data /var/log/gunicorn
sudo chmod -R 755 /var/log/gunicorn

# Establecer permisos para el socket de Gunicorn
sudo mkdir -p $(dirname ~/Histologia/django/gunicorn.sock)
sudo chown www-data:www-data $(dirname ~/Histologia/django/gunicorn.sock)
sudo chmod 755 $(dirname ~/Histologia/django/gunicorn.sock)

# Crear archivos de error
echo "Creando archivos de error..."
sudo mkdir -p /var/www/html
echo "<h1>403 Forbidden</h1>" | sudo tee /var/www/html/403.html
echo "<h1>404 Not Found</h1>" | sudo tee /var/www/html/404.html
echo "<h1>500 Internal Server Error</h1>" | sudo tee /var/www/html/50x.html

# Establecer permisos correctos
echo "Estableciendo permisos..."
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html

sudo chown -R www-data:www-data /home/minero/Histologia/django
sudo chmod -R 755 /home/minero/Histologia/django

# Asegurar que el socket de Gunicorn tenga los permisos correctos
sudo mkdir -p /run/gunicorn
sudo chown www-data:www-data /run/gunicorn
sudo chmod 755 /run/gunicorn

# Reiniciar servicios
echo "Reiniciando servicios..."
sudo systemctl restart django-histologia
sudo service nginx restart

# Ajustar permisos del socket de Gunicorn
sudo chmod 766 /home/minero/Histologia/django/gunicorn.sock

# Dar permisos de ejecución y ejecutar start.sh
echo "Dando permisos de ejecución y ejecutando start.sh..."
chmod +x start.sh
./start.sh

# Borrar registros de Nginx
sudo rm -f /var/log/nginx/*.log

echo "¡Instalación completada!"
