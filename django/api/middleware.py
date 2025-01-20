from django.utils.deprecation import MiddlewareMixin
from django.middleware.csrf import CsrfViewMiddleware
from django.utils.decorators import decorator_from_middleware
from django.contrib.auth import get_user_model
from django.conf import settings
import jwt
from django.http import JsonResponse

class CORSMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Process the request first
        if request.method == "OPTIONS":
            response = JsonResponse({'message': 'OK'})
            response.status_code = 200
        else:
            response = self.get_response(request)

        # Get the origin and handle CORS headers
        origin = request.headers.get('Origin')
        if origin in ["http://localhost:80", "http://localhost:4200", "http://localhost"]:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, X-Requested-With, Accept, Authorization, X-CSRFToken"
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Expose-Headers"] = "X-CSRFToken"

            # Add CSRF token to response if it exists
            csrf_token = request.META.get('CSRF_COOKIE')
            if csrf_token:
                response["X-CSRFToken"] = csrf_token

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