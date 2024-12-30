# Usar la imagen base personalizada con Node.js, Python y Angular preinstalados
FROM minero420/adnbase:latest

# Instalar dependencias adicionales necesarias para venv
USER root
RUN apt-get update && apt-get install -y python3.11-venv

# Configurar directorio de trabajo para Django
WORKDIR /usr/src/app/django

# Copiar solo requirements.txt para cachear dependencias de Python
COPY ./django/requirements.txt /usr/src/app/django/requirements.txt

# Crear y activar un ambiente virtual para Python e instalar las dependencias
RUN python3 -m venv /usr/src/app/venv && \
    /usr/src/app/venv/bin/pip install --upgrade pip && \
    /usr/src/app/venv/bin/pip install -r /usr/src/app/django/requirements.txt

# Copiar el resto de los archivos de Django
COPY ./django /usr/src/app/django

# Configurar el entorno virtual como predeterminado
ENV PATH="/usr/src/app/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Configurar directorio de trabajo para Angular
WORKDIR /usr/src/app/angular

# Copiar solo package.json y package-lock.json para cachear dependencias de Angular
COPY ./angular/package*.json /usr/src/app/angular/

# Instalar las dependencias de Angular
RUN npm install --legacy-peer-deps --verbose

# Copiar el resto de los archivos de Angular
COPY ./angular /usr/src/app/angular

# Construir la aplicación Angular para producción
RUN ng build

# Crear el directorio 'images' dentro de Nginx y asignar los permisos adecuados
RUN mkdir -p /usr/share/nginx/html/images && \
    chown -R www-data:www-data /usr/share/nginx/html/images

# Exponer puertos para Nginx, que manejará tanto el frontend como el backend
EXPOSE 80
EXPOSE 8000
EXPOSE 4200

# Copiar configuración de Nginx para servir Angular y hacer proxy hacia Django
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY ./nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Copiar el script de inicio y hacerlo ejecutable
COPY ./start.sh /start.sh
RUN chmod +x /start.sh

# Comando para iniciar Django, Angular y Nginx
CMD ["/bin/bash", "/start.sh"]
