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

# Crear estructura de directorios
echo "Configurando directorios..."
sudo mkdir -p /var/www/histologia/{django,angular,images}
sudo chown -R $USER:www-data /var/www/histologia
sudo chmod -R 755 /var/www/histologia

# Configurar entorno virtual Python
echo "Configurando entorno virtual Python..."
python3 -m venv /var/www/histologia/django/venv
source /var/www/histologia/django/venv/bin/activate
pip install -r django/requirements.txt

# Configurar servicios systemd
echo "Configurando servicios systemd..."
sudo cp django-histologia.service /etc/systemd/system/
sudo cp angular-histologia.service /etc/systemd/system/

# Configurar Nginx
echo "Configurando Nginx..."
sudo cp nginx/conf.d/default.conf /etc/nginx/sites-available/histologia
sudo ln -s /etc/nginx/sites-available/histologia /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Iniciar servicios
echo "Iniciando servicios..."
sudo systemctl daemon-reload
sudo systemctl enable django-histologia
sudo systemctl enable angular-histologia
sudo systemctl enable nginx

sudo systemctl start django-histologia
sudo systemctl start angular-histologia
sudo systemctl restart nginx

echo "¡Instalación completada!"
echo "Verifica los servicios con:"
echo "sudo systemctl status django-histologia"
echo "sudo systemctl status angular-histologia"
echo "sudo systemctl status nginx"
