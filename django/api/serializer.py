from rest_framework import serializers
from django.contrib.auth.models import User
from .models import *

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'is_alumno', 'is_profesor', 'password']

class ProfesorSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Profesor
        fields = '__all__'

class ProfesorCreateSerializer(serializers.ModelSerializer):
    user = UserSerializer()

    class Meta:
        model = Profesor
        fields = ['user', 'name']

    def create(self, validated_data):
        user_data = validated_data.pop('user')
        password = user_data.pop('password')
        user = CustomUser(**user_data)
        user.set_password(password)
        user.is_profesor = True
        user.save()
        profesor = Profesor.objects.create(user=user, **validated_data)
        print(f"Created user: {user.username} with password: {password}")  # Mensaje de depuración
        return profesor

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
        
class CapturaSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Captura
        fields = ('id', 'name', 'image')  # Ajusta según tus necesidades

    def get_image(self, obj):
        return obj.image.url

class MuestraSerializer(serializers.ModelSerializer):
    imagenUrl = serializers.SerializerMethodField()
    sistemas = serializers.SerializerMethodField()

    class Meta:
        model = Muestra
        fields = ['id', 'name', 'Categoria', 'organo', 'tincion', 'imagenUrl', 'sistemas']

    def get_imagenUrl(self, obj):
        captura = obj.captura_set.first()
        if captura:
            return captura.image.url
        return None

    def get_sistemas(self, obj):
        sistemas = []
        for organo in obj.organo.all():
            for sistema in organo.sistema.all():
                sistemas.append({
                    'sistema': sistema.name,
                    'organo': organo.name
                })
        return sistemas if sistemas else []

class MuestraSerializer2(serializers.ModelSerializer):
    imagenUrl = serializers.SerializerMethodField()  # Para incluir la URL de la imagen
    categoria = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True  # Solo se usará para crear
    )
    organo = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True  # Solo se usará para crear
    )
    sistema = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True,  # Solo se usará para crear
        required=False  # Permitir que el campo sea opcional
    )
    tincion = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True  # Solo se usará para crear
    )
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True  # Solo para crear
    )
    capturas = CapturaSerializer(many=True, read_only=True)
    sistemas = serializers.SerializerMethodField()

    class Meta:
        model = Muestra
        fields = ['id', 'name', 'categoria', 'organo', 'sistema', 'tincion', 'images', 'imagenUrl', 'capturas', 'sistemas']

    def validate_categoria(self, value):
        categorias = []
        for name in value:
            name_normalized = name.strip().lower()
            categoria, _ = Categoria.objects.get_or_create(name=name_normalized)
            categorias.append(categoria)
        return categorias

    def validate_organo(self, value):
        organos = []
        for name in value:
            if name.isdigit():
                organo = Organo.objects.get(id=name)
            else:
                name_normalized = name.strip().lower()
                organo, _ = Organo.objects.get_or_create(name=name_normalized)
            organos.append(organo)
        return organos

    def validate_sistema(self, value):
        sistemas = []
        for name in value:
            if name.isdigit():
                sistema = Sistema.objects.get(id=name)
            else:
                name_normalized = name.strip().lower()
                sistema, _ = Sistema.objects.get_or_create(name=name_normalized)
            sistemas.append(sistema)
        return sistemas

    def validate_tincion(self, value):
        tinciones = []
        for name in value:
            name_normalized = name.strip().lower()
            tincion, _ = Tincion.objects.get_or_create(name=name_normalized)
            tinciones.append(tincion)
        return tinciones

    def create(self, validated_data):
        categoria_instances = validated_data.pop('categoria')
        organo_instances = validated_data.pop('organo')
        sistema_instances = validated_data.pop('sistema', [])
        tincion_instances = validated_data.pop('tincion')
        images = validated_data.pop('images')

        # Debugging: Log validated data
        logger.debug(f"Validated data: {validated_data}")
        logger.debug(f"Images: {images}")

        # Creamos la muestra
        muestra = Muestra.objects.create(**validated_data)

        # Asociamos categorías, órganos, sistemas y tinciones
        muestra.Categoria.set(categoria_instances)
        muestra.organo.set(organo_instances)
        muestra.tincion.set(tincion_instances)

        # Solo asociamos sistemas si se han proporcionado
        if sistema_instances:
            for organo in organo_instances:
                if isinstance(organo, Organo):
                    organo.sistema.set(sistema_instances)
                else:
                    organo_obj = Organo.objects.get(name=organo.name)
                    organo_obj.sistema.set(sistema_instances)

        # Asociamos las imágenes a las capturas
        for image in images:
            Captura.objects.create(image=image, muestra=muestra)

        return muestra

    def get_imagenUrl(self, obj):
        """
        Obtenemos la URL de la primera captura asociada a la muestra.
        """
        captura = obj.captura_set.first()  # Obtiene la primera captura asociada
        if captura:
            return captura.image.url
        return None

    def get_sistemas(self, obj):
        organos = obj.organo.all()
        sistemas = []
        for organo in organos:
            for sistema in organo.sistema.all():
                sistemas.append({'sistema': sistema.name, 'organo': organo.name})
        return sistemas if sistemas else []

class LoteSerializer(serializers.ModelSerializer):
    cursos_details = CursoSerializer(source='cursos', many=True, read_only=True)
    muestras_details = MuestraSerializer(source='muestras', many=True, read_only=True)
    curso_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
        allow_empty=True
    )
    muestra_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
        allow_empty=True
    )
    cursos = CursoSerializer(many=True, read_only=True)
    muestras = MuestraSerializer(many=True, read_only=True)

    class Meta:
        model = Lote
        fields = ['id', 'name', 'cursos', 'muestras', 'cursos_details', 
                 'muestras_details', 'curso_ids', 'muestra_ids']
    
    def create(self, validated_data):
        curso_ids = validated_data.pop('curso_ids', [])
        muestra_ids = validated_data.pop('muestra_ids', [])
        lote = Lote.objects.create(**validated_data)
        if curso_ids:
            lote.cursos.set(Curso.objects.filter(id__in=curso_ids))
        if muestra_ids:
            lote.muestras.set(Muestra.objects.filter(id__in=muestra_ids))
        return lote
    
    def update(self, instance, validated_data):
        curso_ids = validated_data.pop('curso_ids', None)
        muestra_ids = validated_data.pop('muestra_ids', None)
        
        instance.name = validated_data.get('name', instance.name)
        instance.save()

        # Only update relations if IDs were provided
        if curso_ids is not None:
            curso_ids = [int(id) for id in curso_ids if id]
            instance.cursos.set(curso_ids)
            
        if muestra_ids is not None:
            muestra_ids = [int(id) for id in muestra_ids if id]
            instance.muestras.set(muestra_ids)
            
        return instance

class NotaSerializer(serializers.ModelSerializer):
    profesor_nombre = serializers.SerializerMethodField()
    alumno_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Notas
        fields = ['id', 'titulo', 'cuerpo', 'muestra', 'alumno', 'profesor', 
                 'public', 'profesor_nombre', 'alumno_nombre']

    def get_profesor_nombre(self, obj):
        if obj.profesor:
            try:
                profesor = Profesor.objects.get(user=obj.profesor)
                return profesor.name
            except Profesor.DoesNotExist:
                return None
        return None

    def get_alumno_nombre(self, obj):
        if obj.alumno:
            try:
                alumno = Alumno.objects.get(user=obj.alumno)
                return alumno.name
            except Alumno.DoesNotExist:
                return None
        return None

class MuestraSerializer2(serializers.ModelSerializer):
    capturas = serializers.SerializerMethodField()
    notas = serializers.SerializerMethodField()
    sistemas = serializers.SerializerMethodField()
    public = serializers.BooleanField(default=False)  # Add this line

    class Meta:
        model = Muestra
        fields = ['id', 'name', 'capturas', 'notas', 'sistemas', 'public']

    def get_capturas(self, obj):
        capturas = obj.captura_set.all()
        return [{
            'id': captura.id,
            'name': captura.name,
            'image': captura.image.url,
            'labels': LabelSerializer(
                Label.objects.filter(captura=captura),
                many=True,
                context=self.context
            ).data
        } for captura in capturas]

    def get_notas(self, obj):
        user = self.context.get('request').user if 'request' in self.context else None
        if not user:
            return []

        # Filtrar notas según permisos
        notas = obj.notas_set.filter(
            models.Q(public=True) |
            models.Q(alumno=user) |
            models.Q(profesor=user)
        ).distinct()
        
        return NotaSerializer(notas, many=True).data

    def get_sistemas(self, obj):
        organos = obj.organo.all()
        sistemas = []
        for organo in organos:
            for sistema in organo.sistema.all():
                sistemas.append({
                    'sistema': sistema.name,
                    'organo': organo.name,
                    'display': f"{sistema.name} - {organo.name}"  # Add a formatted display string
                })
        return sistemas

class TincionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tincion
        fields = '__all__'

class TagsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'

class LabelSerializer(serializers.ModelSerializer):
    is_owner = serializers.SerializerMethodField()
    tag_details = TagsSerializer(source='tag', read_only=True)
    creator_display_name = serializers.SerializerMethodField()

    class Meta:
        model = Label
        fields = ['id', 'nota', 'tag', 'tag_details', 'coordenadas', 'captura', 
                 'created_by', 'creator_name', 'creator_display_name', 'created_at', 
                 'public', 'is_owner']
        read_only_fields = ['creator_name', 'creator_display_name', 'is_owner', 
                          'created_by', 'tag_details']

    def validate_tag(self, value):
        if isinstance(value, (int, str)):
            try:
                return Tag.objects.get(id=int(value))
            except (Tag.DoesNotExist, ValueError):
                raise serializers.ValidationError("Invalid tag ID")
        return value

    def create(self, validated_data):
        user = self.context['request'].user if 'request' in self.context else None
        if user:
            validated_data['created_by'] = user
            if not user.is_profesor and not user.is_ayudante:
                validated_data['public'] = False  # Ensure labels created by non-professors are private
        return super().create(validated_data)

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return obj.created_by == request.user
        return False

    def get_creator_display_name(self, obj):
        if obj.created_by:
            try:
                if obj.created_by.is_profesor:
                    profesor = Profesor.objects.get(user=obj.created_by)
                    return f"Prof. {profesor.name}"
                elif obj.created_by.is_alumno:
                    alumno = Alumno.objects.get(user=obj.created_by)
                    return alumno.name
            except (Profesor.DoesNotExist, Alumno.DoesNotExist):
                pass
        return obj.creator_name or "Usuario desconocido"

class TagSerializer(serializers.ModelSerializer):
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Tag
        fields = ['id', 'name', 'public', 'alumno', 'profesor', 'ayudante', 
                 'created_at', 'is_owner']

    def get_is_owner(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            return (obj.alumno == request.user or 
                    obj.profesor == request.user)
        return False

class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = '__all__'

class UplImageMuestraSerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.FileField(
            max_length=100000,
            allow_empty_file=False,
            use_url=False
        ),
        write_only=True,
        required=True
    )
    categoria_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )
    organo_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )
    tincion_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True
    )
    capturas = CapturaSerializer(many=True, read_only=True)

    class Meta:
        model = Muestra
        fields = ['id', 'name', 'categoria_ids', 'organo_ids', 'tincion_ids', 'images', 'capturas']

    def to_representation(self, instance):
        """
        Override to_representation to ensure we only return specific fields
        and no unexpected relationships
        """
        ret = super().to_representation(instance)
        # Only include specific fields we want to return
        ret = {
            'id': instance.id,
            'name': instance.name,
            'capturas': ret['capturas']
        }
        return ret

    def create(self, validated_data):
        try:
            images = validated_data.pop('images', [])
            categoria_ids = validated_data.pop('categoria_ids', [])
            organo_ids = validated_data.pop('organo_ids', [])
            tincion_ids = validated_data.pop('tincion_ids', [])

            # Create fresh muestra with no previous relationships
            muestra = Muestra.objects.create(name=validated_data['name'])
            
            # Set only the relationships we want
            if categoria_ids:
                muestra.Categoria.set(Categoria.objects.filter(id__in=categoria_ids))
            if organo_ids:
                muestra.organo.set(Organo.objects.filter(id__in=organo_ids))
            if tincion_ids:
                muestra.tincion.set(Tincion.objects.filter(id__in=tincion_ids))

            # Create captures with clean names
            for i, image in enumerate(images, 1):
                Captura.objects.create(
                    image=image,
                    muestra=muestra,
                    name=f"Captura {i}"
                )

            return muestra
        except Exception as e:
            print(f"Error in create: {str(e)}")
            raise

class AlumnoSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)  # Usamos el UserSerializer completo
    curso = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Curso.objects.all()
    )

    class Meta:
        model = Alumno
        fields = ['id', 'user', 'name', 'curso', 'permiso']

    def update(self, instance, validated_data):
        # Remove user data from update if present
        user_data = validated_data.pop('user', None)
        
        # Update only email if provided in user_data
        if user_data and 'email' in user_data:
            instance.user.email = user_data['email']
            instance.user.save()

        # Update alumno fields
        instance.name = validated_data.get('name', instance.name)
        if 'curso' in validated_data:
            instance.curso.set(validated_data['curso'])
        if 'permiso' in validated_data:
            instance.permiso.set(validated_data['permiso'])
        
        instance.save()
        return instance