# Importa herramientas de Django para manejar vistas y recuperar objetos
from django.shortcuts import render, get_object_or_404
import json
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser  # Add this import
# Importa módulos de DRF (Django Rest Framework) para crear API y vistas
from rest_framework import viewsets, generics ,status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
# Importa los modelos que serán utilizados en las vistas
from .models import (
    Profesor, Curso, Ayudante, Categoria, Sistema, Organo, 
    Muestra, Lote, Alumno, Captura, Notas, Tag, Tincion, CustomUser,
    Label  # Agregar Label a las importaciones
)

# Importa los serializers para transformar los datos en formatos adecuados para la API
from .serializer import (
    MuestraSerializer2, NotaSerializer, CapturaSerializer, ProfesorSerializer, 
    CursoSerializer, AyudanteSerializer, CategoriaSerializer, SistemaSerializer, 
    OrganoSerializer, MuestraSerializer, LoteSerializer, AlumnoSerializer,  # Asegúrate de que AlumnoSerializer esté aquí
    TincionSerializer, TagsSerializer, UserSerializer, ProfesorCreateSerializer,
    LabelSerializer,  # Agregar esta línea
    UplImageMuestraSerializer  # Agregar esta línea
)

from rest_framework.permissions import IsAuthenticated, AllowAny
from .permissions import IsProfesor, IsProfesorOrReadOnly

import logging
import sys
import jwt
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from django.middleware.csrf import get_token
from django.http import JsonResponse
from .utils import create_alumnos_from_xls  # Ensure this import is present
from django.db import models  # Agregar esta línea para importar models

from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from django.http import JsonResponse
from rest_framework.exceptions import NotFound, ValidationError  # Add these imports
from django.core.exceptions import ObjectDoesNotExist  # Add this import

logger = logging.getLogger(__name__)

# Redirige los mensajes print a stdout
sys.stdout = sys.stderr

# Vista genérica para recuperar el detalle de una muestra específica por ID
class FilterView(APIView):
    permission_classes = [IsAuthenticated]  # Asegúrate de que solo los usuarios autenticados puedan acceder

    def get(self, request, *args, **kwargs):
        categorias_serializadas = CategoriaSerializer(Categoria.objects.all(), many=True).data
        organos_serializados = OrganoSerializer(Organo.objects.all(), many=True).data
        sistemas_serializados = SistemaSerializer(Sistema.objects.all(), many=True).data
        tinciones_serializadas = TincionSerializer(Tincion.objects.all(), many=True).data
        tags_serializados = TagsSerializer(Tag.objects.all(), many=True).data

        return Response({
            "categorias": categorias_serializadas,
            "organos": organos_serializados,
            "sistemas": sistemas_serializados,
            "tinciones": tinciones_serializadas,
            "tags": tags_serializados
        })

class MuestraDetailAPIView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]  # Asegúrate de que solo los usuarios autenticados puedan acceder
    # Define el conjunto de datos que consulta
    queryset = Muestra.objects.all()
    # Usa el serializer correspondiente para estructurar los datos
    serializer_class = MuestraSerializer2
    # Indica que el parámetro usado para buscar es el ID
    lookup_field = 'id'

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

# Vista para manejar capturas (solo lectura)
class CapturaViewSet(viewsets.ReadOnlyModelViewSet):
    # Define el conjunto de datos y el serializer para el modelo Captura
    queryset = Captura.objects.all()
    serializer_class = CapturaSerializer


class MuestraViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = MuestraSerializer2  # Using the serializer with capturas, notas, sistemas

    def get_queryset(self):
        user = self.request.user
        if user.is_alumno:
            # Obtener los cursos del alumno
            cursos = user.alumno.curso.all()
            # Obtener los lotes asociados a esos cursos
            lotes = Lote.objects.filter(cursos__in=cursos).distinct()
            # Obtener las muestras asociadas a esos lotes
            queryset = Muestra.objects.filter(lotes_relacionados__in=lotes).distinct()
        else:
            queryset = Muestra.objects.all()
        
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(Categoria__name=category)
            
        return queryset.distinct()

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data['categoria'] = json.loads(data.get('categoria', '[]'))
        data['organo'] = json.loads(data.get('organo', '[]'))
        data['sistema'] = json.loads(data.get('sistema', '[]'))
        data['tincion'] = json.loads(data.get('tincion', '[]'))
        
        # Ensure images are handled correctly
        images = request.FILES.getlist('images')
        data['images'] = images

        # Debugging: Log request data and files
        logger.debug(f"Request data: {data}")
        logger.debug(f"Request files: {request.FILES}")

        # Debugging: Log each file's details
        for image in images:
            logger.debug(f"Image file: {image.name}, size: {image.size}, content_type: {image.content_type}")

        serializer = self.get_serializer(data=data, context={'request': request})
        if not serializer.is_valid():
            logger.error(f"Serializer errors: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        self.perform_create(serializer)

        # Devolver la respuesta con los datos creados
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get', 'post'])
    def Filtrado(self, request, *args, **kwargs):
        categories = request.query_params.getlist('category')
        organos = request.query_params.getlist('organ')
        sistemas = request.query_params.getlist('system')
        tinciones = request.query_params.getlist('tincion')

        muestras = Muestra.objects.all()

        if categories:
            muestras = muestras.filter(Categoria__name__in=categories)
        if organos:
            muestras = muestras.filter(organo__name__in=organos)
        if sistemas:
            muestras = muestras.filter(organo__sistema__name__in=sistemas)
        if tinciones:
            muestras = muestras.filter(tincion__name__in=tinciones)

        serializer = MuestraSerializer(muestras, many=True)
        return Response(serializer.data)

# Función para listar capturas asociadas a una muestra específica
def lista_capturas_muestra(request, muestra_id):
    # Recupera la muestra o lanza un error si no existe
    muestra = get_object_or_404(Muestra, id=muestra_id)
    # Recupera las capturas asociadas a la muestra
    capturas = Captura.objects.filter(muestra=muestra)
    # Recupera los sistemas y órganos relacionados con la muestra
    sistemas = muestra.organo.all().values_list('sistema__name', flat=True).distinct()
    organos = muestra.organo.all()
    categorias = muestra.Categoria.all()

    # Renderiza la plantilla HTML con los datos
    return render(request, 'lista_capturas_muestra.html', {
        'muestra': muestra,
        'capturas': capturas,
        'sistemas': sistemas,
        'organos': organos,
        'categorias': categorias
    })

# Función para listar todas las imágenes disponibles (primera captura de cada muestra)
def lista_imagenes(request):
    # Recupera todas las muestras
    muestras = Muestra.objects.all()
    primeras_capturas = []

    # Busca la primera captura de cada muestra
    for muestra in muestras:
        primera_captura = Captura.objects.filter(muestra=muestra).order_by('id').first()
        if primera_captura:
            primeras_capturas.append(primera_captura)

    # Renderiza la plantilla HTML con las imágenes destacadas
    return render(request, 'lista_imagenes.html', {
        'imagenes': primeras_capturas,
        'muestras': muestras
    })

# Vista para manejar profesores (solo lectura)
class ProfesorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Profesor.objects.all()
    serializer_class = ProfesorSerializer

# Vista para manejar cursos (solo lectura)
class CursoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer

# Vista para manejar ayudantes (solo lectura)
class AyudanteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Ayudante.objects.all()
    serializer_class = AyudanteSerializer

# Vista para manejar categorías (solo lectura)
class CategoriaViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]  # Asegúrate de que solo los usuarios autenticados puedan acceder
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

# Vista para manejar sistemas (solo lectura)
class SistemaViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]  # Asegúrate de que solo los usuarios autenticados puedan acceder
    queryset = Sistema.objects.all()
    serializer_class = SistemaSerializer

# Vista para manejar órganos (solo lectura)
class OrganoViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]  # Asegúrate de que solo los usuarios autenticados puedan acceder
    queryset = Organo.objects.all()
    serializer_class = OrganoSerializer

# Vista alternativa para manejar muestras (solo lectura)
class MuestraViewSet2(viewsets.ReadOnlyModelViewSet):
    serializer_class = MuestraSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_alumno:
            # Get student's courses
            cursos = user.alumno.curso.all()
            print(f"Cursos del alumno {user.username}: {cursos}")
            
            # Get lotes associated with those courses
            lotes = Lote.objects.filter(cursos__in=cursos)
            print(f"Lotes asociados: {lotes}")
            
            # Get muestras from those lotes - using 'lotes' instead of 'lotes_relacionados'
            queryset = Muestra.objects.filter(lotes__in=lotes).distinct()
            print(f"Muestras encontradas: {queryset.count()}")
            
            # Debug log the actual SQL query
            print("SQL Query:", queryset.query)
            
            return queryset
        else:
            # For non-students (professors, etc.), show all muestras
            return Muestra.objects.all()

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(
                queryset, 
                many=True, 
                context={'request': request}
            )
            return Response(serializer.data)
        except Exception as e:
            print(f"Error in list view: {str(e)}")
            raise

class LoteViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsProfesorOrReadOnly]
    serializer_class = LoteSerializer
    
    def get_queryset(self):
        queryset = Lote.objects.all()
        
        # Filter by curso if specified
        curso_id = self.request.query_params.get('curso', None)
        if curso_id:
            queryset = queryset.filter(cursos__id=curso_id)
            
        # Filter by muestra if specified
        muestra_id = self.request.query_params.get('muestra', None)
        if muestra_id:
            queryset = queryset.filter(muestras__id=muestra_id)
            
        return queryset.distinct()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response(serializer.data)

    def perform_create(self, serializer):
        instance = serializer.save()
        cursos = self.request.data.get('curso_ids', [])
        muestras = self.request.data.get('muestra_ids', [])
        
        # Filter out None values
        cursos = [curso for curso in cursos if curso is not None]
        muestras = [muestra for muestra in muestras if muestra is not None]

        if cursos:
            instance.cursos.set(cursos)
        if muestras:
            instance.muestras.set(muestras)
    
    def perform_update(self, serializer):
        instance = serializer.save()
        cursos = self.request.data.get('curso_ids', None)
        muestras = self.request.data.get('muestra_ids', None)
        
        # Filter out None values
        if cursos is not None:
            cursos = [curso for curso in cursos if curso is not None]
            instance.cursos.set(cursos)
        if muestras is not None:
            muestras = [muestra for muestra in muestras if muestra is not None]
            instance.muestras.set(muestras)

# Vista para manejar alumnos (solo lectura)
class AlumnoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Alumno.objects.all()
    serializer_class = AlumnoSerializer

# Vista para manejar capturas (solo lectura, duplicada para énfasis)
class CapturaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Captura.objects.all()
    serializer_class = CapturaSerializer

# Vista para manejar notas (CRUD completo)
class NotaViewSet(viewsets.ModelViewSet):
    queryset = Notas.objects.all().select_related('alumno', 'profesor', 'muestra').prefetch_related('tags')
    serializer_class = NotaSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.is_alumno:
            serializer.save(alumno=user, public=False)  # Ensure notes created by students are private
        elif user.is_profesor:
            serializer.save(profesor=user)
        else:
            raise serializers.ValidationError("User must be either an alumno or a profesor")

    def create(self, request, *args, **kwargs):
        data = request.data.get('nota', {})  # Ensure the data is wrapped in a 'nota' key
        user = request.user

        if user.is_alumno:
            data['alumno'] = user.id
            data['public'] = False  # Ensure notes created by students are private
        elif user.is_profesor:
            data['profesor'] = user.id
        else:
            return Response({'error': 'User must be either an alumno or a profesor'}, status=status.HTTP_400_BAD_REQUEST)

        # Desempaqueta los datos de la nota
        nota_data = {
            'titulo': data.get('titulo', ''),
            'cuerpo': data.get('cuerpo', ''),
            'alumno': data.get('alumno'),
            'profesor': data.get('profesor'),
            'muestra': data.get('muestra'),
            'public': data.get('public', False)  # Add public field
        }

        serializer = self.get_serializer(data=nota_data)
        if serializer.is_valid():
            self.perform_create(serializer)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = request.data.get('nota', {})  # Ensure the data is wrapped in a 'nota' key

        # Desempaqueta los datos de la nota
        nota_data = {
            'titulo': data.get('titulo', ''),
            'cuerpo': data.get('cuerpo', ''),
            'alumno': data.get('alumno'),
            'profesor': data.get('profesor'),
            'muestra': data.get('muestra'),
            'public': data.get('public', instance.public)  # Add public field
        }

        serializer = self.get_serializer(instance, data=nota_data, partial=partial)
        if serializer.is_valid():
            self.perform_update(serializer)
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        user = self.request.user
        if user.is_alumno:
            return Notas.objects.filter(alumno=user).select_related('alumno', 'profesor', 'muestra').prefetch_related('tags')
        elif user.is_profesor:
            return Notas.objects.filter(profesor=user).select_related('alumno', 'profesor', 'muestra').prefetch_related('tags')
        return Notas.objects.none()

class TincionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]  # Asegúrate de que solo los usuarios autenticados puedan acceder
    queryset = Tincion.objects.all()
    serializer_class = TincionSerializer

class MuestraFilterAPIView(generics.ListAPIView):
    serializer_class = MuestraSerializer

    def get_queryset(self):
        user = self.request.user
        base_queryset = None

        # First get the base queryset according to user permissions
        if user.is_alumno:
            cursos = user.alumno.curso.all()
            lotes = Lote.objects.filter(cursos__in=cursos)
            base_queryset = Muestra.objects.filter(lotes__in=lotes)
        else:
            base_queryset = Muestra.objects.all()

        # Then apply any additional filters
        queryset = base_queryset
        categoria_id = self.request.query_params.get('categoria')
        sistema_id = self.request.query_params.get('sistema')
        organo_id = self.request.query_params.get('organo')
        tincion_id = self.request.query_params.get('tincion')
        tag_id = self.request.query_params.get('tag')

        if categoria_id:
            queryset = queryset.filter(Categoria__id=categoria_id)
        if sistema_id:
            queryset = queryset.filter(organo__sistema__id=sistema_id)
        if organo_id:
            queryset = queryset.filter(organo__id=organo_id)
        if tincion_id:
            queryset = queryset.filter(tincion__id=tincion_id)
        if tag_id:
            queryset = queryset.filter(notas__tags__id=tag_id)

        return queryset.distinct()

class TagViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = TagsSerializer

    def get_queryset(self):
        user = self.request.user
        # Obtener tags públicos y los creados por el usuario
        return Tag.objects.filter(
            models.Q(public=True) |       # Tags públicos
            models.Q(alumno=user) |       # Tags creados por el alumno
            models.Q(profesor=user)       # Tags creados por el profesor
        ).distinct()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        origin = request.headers.get('Origin')
        if origin in ["http://localhost:80", "http://localhost:4200", "http://localhost"]:
            response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Credentials"] = "true"
        return response

    def options(self, request, *args, **kwargs):
        response = Response()
        origin = request.headers.get('Origin')
        if origin in ["http://localhost:80", "http://localhost:4200", "http://localhost"]:
            response["Access-Control-Allow-Origin"] = origin
        response["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-CSRFToken"
        response["Access-Control-Allow-Credentials"] = "true"
        response["Access-Control-Max-Age"] = "1728000"
        return response

from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.utils.decorators import method_decorator

@method_decorator(ensure_csrf_cookie, name='dispatch')
class GetCSRFToken(APIView):
    permission_classes = []
    authentication_classes = []

    def options(self, request, *args, **kwargs):
        response = JsonResponse({'message': 'OK'})
        origin = request.headers.get('Origin')
        if origin in ["http://localhost:80", "http://localhost:4200", "http://localhost"]:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Allow-Methods"] = "GET, OPTIONS"
            response["Access-Control-Allow-Headers"] = "Content-Type, X-CSRFToken, Authorization"
        return response

    def get(self, request):
        csrf_token = get_token(request)
        response = JsonResponse({'csrfToken': csrf_token})
        origin = request.headers.get('Origin')
        if origin in ["http://localhost:80", "http://localhost:4200", "http://localhost"]:
            response["Access-Control-Allow-Origin"] = origin
            response["Access-Control-Allow-Credentials"] = "true"
            response["Access-Control-Expose-Headers"] = "X-CSRFToken"
        
        response.set_cookie(
            'csrftoken',
            csrf_token,
            samesite='Lax',
            secure=False,
            httponly=False,
            path='/',
            domain='localhost' if 'localhost' in request.get_host() else None,
            max_age=3600
        )
        return response

@method_decorator(ensure_csrf_cookie, name='dispatch')
class LoginView(APIView):
    permission_classes = []
    authentication_classes = []

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        
        if not username or not password:
            return Response({'error': 'Username and password are required'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Verificar si el usuario existe
        try:
            user = CustomUser.objects.get(username=username)
        except CustomUser.DoesNotExist:
            return Response({'error': 'User does not exist'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Intentar autenticar
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            if user.is_active:
                login(request, user)
                refresh = RefreshToken.for_user(user)
                user_data = UserSerializer(user).data
                csrf_token = get_token(request)
                response = JsonResponse({
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                    'user': user_data,
                    'csrfToken': csrf_token  # Include CSRF token in response
                })
                response["Access-Control-Allow-Origin"] = "http://localhost:4200"
                response["Access-Control-Allow-Credentials"] = "true"
                response.set_cookie(
                    'csrftoken',
                    csrf_token,
                    max_age=3600,
                    samesite='Lax',
                    secure=False,
                    httponly=False,
                    domain='localhost'
                )
                return response
            else:
                return Response({'error': 'User account is disabled'}, 
                              status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({
                'error': 'Invalid credentials',
                'detail': 'Authentication failed. Please check username and password.'
            }, status=status.HTTP_400_BAD_REQUEST)

class ProfesorCreateView(generics.CreateAPIView):
    queryset = Profesor.objects.all()
    serializer_class = ProfesorCreateSerializer

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CursoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsProfesorOrReadOnly]
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer

    @method_decorator(ensure_csrf_cookie)
    def destroy(self, request, *args, **kwargs):
        try:
            if not request.user.is_profesor:
                return Response(
                    {"error": "Solo los profesores pueden eliminar cursos"},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            print(f"Usuario intentando eliminar: {request.user.username} (Es profesor: {request.user.is_profesor})")
            instance = self.get_object()
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @method_decorator(ensure_csrf_cookie)
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return response

    @method_decorator(ensure_csrf_cookie)
    def create(self, request, *args, **kwargs):
        response = super().create(request, *args, **kwargs)
        return response

class AlumnoViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    queryset = Alumno.objects.all()
    serializer_class = AlumnoSerializer

    @method_decorator(ensure_csrf_cookie)
    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = self.get_serializer(
                instance,
                data=request.data,
                partial=True,
                context={'request': request}
            )
            
            if serializer.is_valid():
                self.perform_update(serializer)
                return Response(serializer.data)
            else:
                return Response(
                    {"error": str(serializer.errors)},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_queryset(self):
        queryset = super().get_queryset()
        curso = self.request.query_params.get('curso', None)
        if curso is not None:
            queryset = queryset.filter(curso__id=curso)
        return queryset

    @action(detail=False, methods=['get'])
    def sin_curso(self, request):
        alumnos = Alumno.objects.filter(curso=None)
        serializer = self.get_serializer(alumnos, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def remove_from_curso(self, request, pk=None):
        try:
            alumno = self.get_object()
            curso_id = request.query_params.get('curso')
            
            if not curso_id:
                return Response(
                    {"error": "Se requiere especificar un curso"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            curso = Curso.objects.get(id=curso_id)
            alumno.curso.remove(curso)

            # Si el alumno ya no tiene cursos, verificar si queremos eliminarlo
            if not alumno.curso.exists():
                # Opcional: Eliminar el alumno si no tiene más cursos
                # alumno.delete()
                pass

            return Response(status=status.HTTP_204_NO_CONTENT)
        except Curso.DoesNotExist:
            return Response(
                {"error": "Curso no encontrado"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class UploadXlsView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        file = request.FILES.get('file')
        asignatura = request.POST.get('asignatura')
        anio = request.POST.get('anio')
        semestre = request.POST.get('semestre').lower() == 'true'  # Convert string to boolean
        grupo = request.POST.get('grupo')

        if not all([file, asignatura, anio, grupo]):
            return Response({
                "error": "Faltan datos requeridos"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            curso_data = {
                'asignatura': asignatura,
                'anio': int(anio),
                'semestre': semestre,
                'grupo': grupo
            }
            
            result = create_alumnos_from_xls(file, curso_data)
            response_data = {
                "message": "File processed successfully",
                "curso": CursoSerializer(result["curso"]).data,
                "curso_created": result["curso_created"],
                "created_alumnos": result["created_alumnos"],
                "existing_alumnos": result["existing_alumnos"]
            }
            csrf_token = get_token(request)
            response = Response(response_data, status=status.HTTP_200_OK)
            response.set_cookie('csrftoken', csrf_token, httponly=True)
            return response
        except ValueError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class LabelViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = LabelSerializer

    def get_queryset(self):
        """
        Filtra las etiquetas por captura y permisos de usuario
        """
        queryset = Label.objects.all()
        user = self.request.user
        captura_id = self.request.query_params.get('captura')
        
        # Si estamos haciendo una operación de actualización o eliminación,
        # no filtramos por captura para permitir encontrar la etiqueta
        if self.action in ['update', 'partial_update', 'destroy']:
            return queryset.filter(
                models.Q(public=True) |
                models.Q(created_by=user)
            )
        
        # Para otras operaciones, filtramos por captura
        if captura_id and captura_id.isdigit():
            queryset = queryset.filter(captura_id=captura_id)
        
        return queryset.filter(
            models.Q(public=True) |
            models.Q(created_by=user)
        ).distinct()

    def create(self, request, *args, **kwargs):
        if not request.data.get('captura'):
            raise ValidationError("Captura ID is required")
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            # Asegurarse de que el usuario es el propietario
            if instance.created_by != request.user:
                return Response(
                    {"error": "No tienes permiso para modificar esta etiqueta"},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            partial = kwargs.pop('partial', False)
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        except Label.DoesNotExist:
            return Response(
                {"error": "La etiqueta no existe"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def perform_update(self, serializer):
        serializer.save()

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        obj = queryset.filter(pk=self.kwargs['pk']).first()
        if not obj:
            raise NotFound("No Label matches the given query.")
        return obj

from rest_framework.parsers import MultiPartParser, FormParser

class UplImageViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = UplImageMuestraSerializer
    parser_classes = [MultiPartParser, FormParser]
    queryset = Muestra.objects.all()
    
    def create(self, request, *args, **kwargs):
        try:
            print("Raw request data:", request.data)

            # Initialize data
            data = {
                'name': request.data.get('name'),
                'images': request.FILES.getlist('images'),
                'categoria_ids': [],
                'organo_ids': [],
                'tincion_ids': []
            }
            
            # Create and handle new category
            if 'new_category' in request.data:
                categoria = Categoria.objects.create(name=request.data['new_category'])
                data['categoria_ids'].append(categoria.id)
            elif 'categoria_ids' in request.data:
                try:
                    data['categoria_ids'] = json.loads(request.data.get('categoria_ids'))
                except json.JSONDecodeError:
                    pass

            # Create and handle new organo and sistema
            if 'new_organo' in request.data:
                organo = Organo.objects.create(name=request.data['new_organo'])
                if 'new_sistema' in request.data:
                    sistema = Sistema.objects.create(name=request.data['new_sistema'])
                    organo.sistema.add(sistema)
                data['organo_ids'].append(organo.id)
            elif 'organo_ids' in request.data:
                try:
                    data['organo_ids'] = json.loads(request.data.get('organo_ids'))
                except json.JSONDecodeError:
                    pass

            # Create and handle new tincion
            if 'new_tincion' in request.data:
                tincion = Tincion.objects.create(
                    name=request.data['new_tincion'],
                    descripcion="Descripción pendiente"
                )
                data['tincion_ids'].append(tincion.id)
            elif 'tincion_ids' in request.data:
                try:
                    data['tincion_ids'] = json.loads(request.data.get('tincion_ids'))
                except json.JSONDecodeError:
                    pass

            print("Processed data:", data)

            # Create muestra
            muestra = Muestra.objects.create(name=data['name'])

            # Create capturas
            for idx, image in enumerate(data['images'], 1):
                Captura.objects.create(
                    muestra=muestra,
                    image=image,
                    name=f"Captura {idx}"
                )

            # Set relationships
            if data['categoria_ids']:
                muestra.Categoria.set(data['categoria_ids'])
            if data['organo_ids']:
                muestra.organo.set(data['organo_ids'])
            if data['tincion_ids']:
                muestra.tincion.set(data['tincion_ids'])

            # Refresh to ensure we have latest data
            muestra.refresh_from_db()

            response_data = {
                'id': muestra.id,
                'name': muestra.name,
                'message': 'Muestra creada exitosamente',
                'Categoria': [{'id': c.id, 'name': c.name} for c in muestra.Categoria.all()],
                'organo': [{'id': o.id, 'name': o.name} for o in muestra.organo.all()],
                'tincion': [{'id': t.id, 'name': t.name} for t in muestra.tincion.all()],
                'sistemas': [
                    {'sistema': s.name, 'organo': o.name}
                    for o in muestra.organo.all()
                    for s in o.sistema.all()
                ],
                'capturas': CapturaSerializer(muestra.captura_set.all(), many=True).data
            }

            return Response(response_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Error in create: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        return Muestra.objects.all()