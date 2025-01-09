from rest_framework import serializers
from .models import *
class ProfesorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profesor
        fields = '__all__'

class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = '__all__'

class AyudanteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ayudante
        fields = '__all__'

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

class SistemaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Sistema
        fields = '__all__'

class OrganoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organo
        fields = '__all__'

class MuestraSerializer(serializers.ModelSerializer):
    imagenUrl = serializers.SerializerMethodField()
    sistema = serializers.SerializerMethodField()

    class Meta:
        model = Muestra
        fields = ['id', 'name', 'imagenUrl', 'sistema']  # Campos que deseas mostrar

    def get_imagenUrl(self, obj):
        first_image = obj.captura_set.first()
        if first_image:
            # Obtener la URL relativa de la imagen
            relative_url = first_image.image.url  # Ejemplo: 'muestras/a9e929b1-5acb-404d-8798-329166b222d4.gif'
            
            # Eliminar la parte '/muestras' de la URL relativa
            if relative_url.startswith('/muestras/'):
                relative_url = relative_url[len('/muestras/'):]  # Elimina 'muestras/' del inicio
            
            # Construir manualmente la URL completa
            server_url = 'http://localhost:8011/images'  # Ajusta el dominio y puerto según tu configuración
            full_url = f"{server_url}/{relative_url}"  # Combina el dominio con la URL relativa corregida
            return full_url
        return None

    def get_sistema(self, obj):
        sistemas = obj.organo.all().values_list('sistema__sisname', flat=True)
        if sistemas:
            return sistemas[0]  # Solo devuelve el primer sistema por ahora, ajusta según necesites
        return None

class LoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lote
        fields = '__all__'

class AlumnoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alumno
        fields = '__all__'

class CapturaSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Captura
        fields = ('id', 'name', 'image')  # Ajusta según tus necesidades

    def get_image(self, obj):
        relative_url = obj.image.url
        if relative_url.startswith('/muestras/'):
            relative_url = relative_url[len('/muestras/'):]
        server_url = 'http://localhost:8011/images'
        full_url = f"{server_url}/{relative_url}"
        return full_url

class NotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notas
        fields = ('id', 'nota',)  # Ajusta según tus necesidades

class MuestraSerializer2(serializers.ModelSerializer):
    capturas = serializers.SerializerMethodField()
    notas = serializers.SerializerMethodField()
    sistemas = serializers.SerializerMethodField()

    class Meta:
        model = Muestra
        fields = ['id', 'name', 'capturas', 'notas', 'sistemas']

    def get_capturas(self, obj):
        capturas = obj.captura_set.all()
        return CapturaSerializer(capturas, many=True, context=self.context).data

    def get_notas(self, obj):
        notas = obj.notas_set.all()
        return NotaSerializer(notas, many=True).data

    def get_sistemas(self, obj):
        sistemas = obj.organo.all().values_list('sistema__sisname', flat=True)
        return list(sistemas) if sistemas else []

class TincionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tincion
        fields = '__all__'