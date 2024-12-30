from rest_framework import permissions

class IsProfesor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_profesor)

class IsProfesorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        # Permitir solicitudes GET, HEAD u OPTIONS
        if request.method in permissions.SAFE_METHODS:
            return True

        # Requerir que sea profesor para DELETE, PUT, POST
        return bool(request.user and request.user.is_authenticated and request.user.is_profesor)