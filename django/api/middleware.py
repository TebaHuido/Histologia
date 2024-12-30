from django.utils.deprecation import MiddlewareMixin
from django.middleware.csrf import CsrfViewMiddleware
from django.utils.decorators import decorator_from_middleware
from django.contrib.auth import get_user_model
from django.conf import settings
import jwt

class CORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        origin = request.headers.get('Origin')

        allowed_origins = [
            "http://localhost:80",
            "http://localhost:4200",
            "http://localhost",
            "http://127.0.0.1:80",
        ]

        if origin in allowed_origins:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = (
                "Origin, X-Requested-With, Content-Type, Accept, Authorization, "
                "X-CSRFToken"
            )
            response["Access-Control-Expose-Headers"] = "Content-Type, X-CSRFToken"
            
            if request.method == "OPTIONS":
                response["Access-Control-Max-Age"] = "1728000"
                response.status_code = 204

        return response

class AuthenticationMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Ignorar la ruta de inicio de sesión
        if request.path == '/api/login/':
            return

        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            if token:
                try:
                    payload = jwt.decode(token, settings.SIMPLE_JWT['SIGNING_KEY'], algorithms=['HS256'])
                    user = get_user_model().objects.get(id=payload['user_id'])
                    request.user = user
                    print(f"User {user.username} is authenticated")
                except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, get_user_model().DoesNotExist):
                    print("Invalid token")
                    request.user = None
            else:
                print("No token provided")
                request.user = None
        else:
            print("Invalid authorization header")
            request.user = None

# Agrega este middleware a la configuración de MIDDLEWARE en settings.py