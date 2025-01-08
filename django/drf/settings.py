"""
Django settings for drf project.

Generated by 'django-admin startproject' using Django 5.0.6.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.0/ref/settings/
"""

from pathlib import Path
import os
# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Add this setting at the top level (not inside any other block)
ROOT_URLCONF = 'drf.urls'

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.0/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get('SECRET_KEY', 'fallback-secret-key-for-dev')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = False

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'histologia.sytes.net']  # Agregar tu dominio

# Configuración de seguridad para producción
SECURE_SSL_REDIRECT = False  # Deshabilitar redirección a HTTPS
SESSION_COOKIE_SECURE = False  # Deshabilitar cookies seguras
CSRF_COOKIE_SECURE = False  # Deshabilitar cookies seguras
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 0  # Deshabilitar HSTS
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False

# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'api',  # Asegúrate de que la app 'api' esté incluida
    'rest_framework',
    'corsheaders'
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be first
    'api.middleware.CORSMiddleware',  # Add this after corsheaders middleware
    'django.middleware.common.CommonMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'api.middleware.AuthenticationMiddleware',  # Asegúrate de agregar este middleware
]

# Update CORS settings - remove duplicates and ensure correct configuration
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:80",
    "http://localhost:4200",
    "http://localhost",
    "http://127.0.0.1:80",
    "http://127.0.0.1:4200",
]

CORS_ALLOW_CREDENTIALS = True

CORS_EXPOSE_HEADERS = [
    'Content-Type',
    'X-CSRFToken',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:80",
    "http://localhost:4200",
    "http://localhost",
    "http://127.0.0.1:80",
    "http://127.0.0.1:4200",
]

CSRF_COOKIE_DOMAIN = None  # Changed from 'localhost'
CSRF_COOKIE_PATH = "/"
CSRF_USE_SESSIONS = False  # Changed to False
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False
CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'
CSRF_COOKIE_NAME = 'csrftoken'

# Configuración de autenticación
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

# Configuración de REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

# Configuración de JWT
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': False,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': '7392b191476217f92eec5ea905324ec1b5bec224a69b96a3a86a71794bc356923c2fd29500c88b9b6a27d842506155ba7455349406c91d460455cc0761e3a3ae565b0bf40987f65d6c226ada730758609c97dc41b40bffdc8dd7da5e9216b2c27f72853f058e005c63397fabc26049c40939734d9c16f06ddeec93a639ea3c6c5ff862a4ca0ed66228ddaa118e04d7940c6bc1e8bc2d4f1e00e93b4dcb1991e680e73eec9e5abeaea0a788120c9df725b89790cec81a7f0499d8c297f58fdb83b90df2192dd5f420395e556b671c5c5b6763ab77303114aa0fdb05729d88e4c3cdce4745631ddcbd2fe94613a6c5163bb3f6193780368badc7fce65cffafc18b',
    'VERIFYING_KEY': '',
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'drf.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.0/ref/settings/#databases

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(BASE_DIR,'db', 'db.sqlite3'),
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.0/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.0/howto/static-files/

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'

# Define la ruta completa a la carpeta donde Nginx almacena los archivos
MEDIA_ROOT = os.path.join(BASE_DIR, '../../../home/minero/histologia/images')
MEDIA_URL = '/images/'

AUTH_USER_MODEL = 'api.CustomUser'

CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = False  # Ensure this is set to False for local development
CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'
CSRF_COOKIE_NAME = 'csrftoken'
CSRF_COOKIE_AGE = 3600  # 1 hour in seconds

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'  # Cambia por tu proveedor de correo
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'histologiautaweb@gmail.com'
EMAIL_HOST_PASSWORD = 'SysadminS3ba7le 1'
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER