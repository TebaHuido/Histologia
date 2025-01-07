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
pip install -r django/requirements.txt

# Configurar Nginx
echo "Configurando Nginx..."
sudo cp nginx/conf.d/default.conf /etc/nginx/sites-available/histologia
sudo ln -sf /etc/nginx/sites-available/histologia /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Reiniciar Nginx
sudo service nginx restart

echo "¡Instalación completada!"
