# Importa herramientas de Django para manejar vistas y recuperar objetos
from django.shortcuts import render, get_object_or_404

# Importa módulos de DRF (Django Rest Framework) para crear API y vistas
from rest_framework import viewsets, generics ,status
from rest_framework.decorators import action
from rest_framework.response import Response

# Importa los modelos que serán utilizados en las vistas
from .models import (
    Profesor, Curso, Ayudante, Categoria, Sistema, Organo, 
    Muestra, Lote, Alumno, Captura, Notas
)

# Importa los serializers para transformar los datos en formatos adecuados para la API
from .serializer import (
    MuestraSerializer2, NotaSerializer, CapturaSerializer, ProfesorSerializer, 
    CursoSerializer, AyudanteSerializer, CategoriaSerializer, SistemaSerializer, 
    OrganoSerializer, MuestraSerializer, LoteSerializer, AlumnoSerializer,TincionSerializer, TincionSerializer
)

# Vista genérica para recuperar el detalle de una muestra específica por ID
class MuestraDetailAPIView(generics.RetrieveAPIView):
    # Define el conjunto de datos que consulta
    queryset = Muestra.objects.all()
    # Usa el serializer correspondiente para estructurar los datos
    serializer_class = MuestraSerializer2
    # Indica que el parámetro usado para buscar es el ID
    lookup_field = 'id'

# Vista para manejar capturas (solo lectura)
class CapturaViewSet(viewsets.ReadOnlyModelViewSet):
    # Define el conjunto de datos y el serializer para el modelo Captura
    queryset = Captura.objects.all()
    serializer_class = CapturaSerializer

# Vista para manejar muestras con operaciones CRUD completas
class MuestraViewSet(viewsets.ModelViewSet):
    # Define el conjunto de datos y el serializer para el modelo Muestra
    queryset = Muestra.objects.all()
    serializer_class = MuestraSerializer

    # Método adicional para filtrar muestras por categoría
    @action(detail=False, methods=['get'])
    def por_categoria(self, request):
        # Recupera el parámetro de categoría desde la solicitud
        categoria_name = request.query_params.get('category', None)

        # Maneja los distintos casos posibles
        if categoria_name == 'all':
            muestras = self.queryset.all()  # Recupera todas las muestras
        elif categoria_name is not None:
            # Filtra las muestras por el nombre de la categoría (insensible a mayúsculas)
            muestras = self.queryset.filter(Categoria__name__icontains=categoria_name)
        else:
            # Devuelve un error si no se proporciona una categoría válida
            return Response({"error": "No se ha proporcionado una categoría"}, status=status.HTTP_400_BAD_REQUEST)

        # Serializa las muestras filtradas y las devuelve como respuesta
        serializer = self.get_serializer(muestras, many=True)
        return Response(serializer.data)

# Función para listar capturas asociadas a una muestra específica
def lista_capturas_muestra(request, muestra_id):
    # Recupera la muestra o lanza un error si no existe
    muestra = get_object_or_404(Muestra, id=muestra_id)
    # Recupera las capturas asociadas a la muestra
    capturas = Captura.objects.filter(muestra=muestra)
    # Recupera los sistemas y órganos relacionados con la muestra
    sistemas = muestra.organo.all().values_list('sistema__sisname', flat=True).distinct()
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
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

# Vista para manejar sistemas (solo lectura)
class SistemaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sistema.objects.all()
    serializer_class = SistemaSerializer

# Vista para manejar órganos (solo lectura)
class OrganoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Organo.objects.all()
    serializer_class = OrganoSerializer

# Vista alternativa para manejar muestras (solo lectura)
class MuestraViewSet2(viewsets.ReadOnlyModelViewSet):
    queryset = Muestra.objects.all()
    serializer_class = MuestraSerializer

# Vista para manejar lotes (solo lectura)
class LoteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Lote.objects.all()
    serializer_class = LoteSerializer

# Vista para manejar alumnos (solo lectura)
class AlumnoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Alumno.objects.all()
    serializer_class = AlumnoSerializer

# Vista para manejar capturas (solo lectura, duplicada para énfasis)
class CapturaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Captura.objects.all()
    serializer_class = CapturaSerializer

# Vista para manejar notas (CRUD completo)
class NotasViewSet(viewsets.ModelViewSet):
    queryset = Notas.objects.all()
    serializer_class = NotaSerializer

class TincionViewSet(viewsets.ModelViewSet):
    queryset = Notas.objects.all()
    serializer_class = TincionSerializer

class MuestraFilterAPIView(generics.ListAPIView):
    queryset = Muestra.objects.all()
    serializer_class = MuestraSerializer

    def get_queryset(self):
        """
        Filtra las muestras según los parámetros de la URL.
        """
        queryset = super().get_queryset()
        categoria_id = self.request.query_params.get('categoria')
        sistema_id = self.request.query_params.get('sistema')
        organo_id = self.request.query_params.get('organo')
        tincion_id = self.request.query_params.get('tincion')
        tag_id = self.request.query_params.get('tag')

        # Construcción dinámica de los filtros
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