import uuid
import os
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.contrib.auth.models import User, AbstractUser
from django.conf import settings  # Import settings
from django.utils import timezone  # Import timezone

def generate_filename(instance, filename):
    extension = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4()}.{extension}"
    return new_filename


def default_name():
    return "Captura"  # Placeholder name, will be updated in the Captura model's save method

class CustomUser(AbstractUser):
    is_alumno = models.BooleanField(default=False)
    is_profesor = models.BooleanField(default=False)
    is_ayudante = models.BooleanField(default=False)
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='customuser_set',  # Agrega related_name
        blank=True,
        help_text='The groups this user belongs to.',
        verbose_name='groups',
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='customuser_set',  # Agrega related_name
        blank=True,
        help_text='Specific permissions for this user.',
        verbose_name='user permissions',
    )

class Profesor(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, verbose_name="Nombre")
    # Elimina los campos passhash y correo
    # passhash = models.CharField(max_length=100, verbose_name="Hash")
    # correo = models.CharField(max_length=100, verbose_name="Correo")

    def __str__(self):
        return f"Profesor: {self.name} ({self.user.email})"
   
class Curso(models.Model):
    asignatura = models.CharField(max_length=100, verbose_name="Asignatura")
    anio = models.IntegerField()
    semestre = models.BooleanField()
    grupo = models.CharField(max_length=1, verbose_name="Grupo")
    profesor = models.ForeignKey(Profesor, models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Curso: {self.asignatura} ({self.anio} - {'S1' if self.semestre else 'S2'})"
    
class Ayudante(models.Model):
    niveldeacceso = models.CharField(max_length=5, verbose_name="Nivel de acceso")
    name = models.CharField(max_length=100, verbose_name="Nombre")
    passhash = models.CharField(max_length=100, verbose_name="Hash")
    correo = models.CharField(max_length=100, verbose_name="Correo")
    curso = models.ManyToManyField(Curso, blank=True)

    def __str__(self):
        return f"Ayudante: {self.name} ({self.correo})"
 
class Categoria(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre")

    def __str__(self):
        return f"Categoría: {self.name}"
    
class Sistema(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre del sistema")

    def __str__(self):
        return f"Sistema: {self.name}"
    
class Organo(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre del organo")
    sistema = models.ManyToManyField(Sistema, blank=True)

    def __str__(self):
        return f"Órgano: {self.name}"

class Captura(models.Model):
    aumento = models.FloatField(default=0.0, null=True, blank=True)
    name = models.CharField(max_length=100, default=default_name, blank=True)
    image = models.ImageField(upload_to=generate_filename, null=False, blank=False, verbose_name="Captura")
    muestra = models.ForeignKey('Muestra', models.SET_NULL, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.name or self.name == "Captura":
            count = Captura.objects.filter(muestra=self.muestra).count() + 1
            self.name = f"Captura {count}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Imagen {self.id}: {self.name} x {self.aumento}"

    class Meta:
        verbose_name = "Captura"
        verbose_name_plural = "Capturas"

    def get_filename(self):
        return os.path.basename(self.image.name)

class Tincion(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre")
    descripcion = models.CharField(max_length=1000, verbose_name="Descripcion")

    def __str__(self):
        return f"Tinción: {self.name} ({self.descripcion})"

class Tag(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre")
    public = models.BooleanField(default=False)
    alumno = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                              null=True, blank=True, related_name='alumno_tags')
    profesor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, 
                               null=True, blank=True, related_name='profesor_tags')
    ayudante = models.ForeignKey(Ayudante, on_delete=models.SET_NULL, 
                                null=True, blank=True, related_name='ayudante_tags')
    created_at = models.DateTimeField(default=timezone.now)  # Cambiado a default=timezone.now

    def __str__(self):
        return f"Tag: {self.name} ({'Público' if self.public else 'Privado'})"

class Muestra(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre")
    Categoria = models.ManyToManyField(Categoria)
    curso = models.ManyToManyField(Curso, through='Lote')
    organo = models.ManyToManyField(Organo, blank=True)
    tincion = models.ManyToManyField('Tincion', blank=True)
    def __str__(self):
        return f"Muestra: {self.name}"

class Lote(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre")
    curso = models.ForeignKey(Curso, models.SET_NULL, null=True, blank=True)
    muestra = models.ForeignKey(Muestra, models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"Lote: {self.name}"
    
class Alumno(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    name = models.CharField(max_length=100, verbose_name="Nombre")
    curso = models.ManyToManyField(Curso, blank=True)
    permiso = models.ManyToManyField(Muestra, blank=True)

    def __str__(self):
        return f"Alumno: {self.name} ({self.user.email})"

@receiver(pre_delete, sender=Captura)
def delete_image(sender, instance, **kwargs):
    if instance.image:
        image_path = instance.image.path
        if os.path.isfile(image_path):
            try:
                os.remove(image_path)
                print(f"Imagen {image_path} eliminada con éxito.")
            except Exception as e:
                print(f"Error al eliminar la imagen {image_path}: {e}")

class Notas(models.Model):
    titulo = models.CharField(max_length=255, verbose_name="Título")  # Nuevo campo
    cuerpo = models.TextField(verbose_name="Cuerpo")  # Nuevo campo
    alumno = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='alumno_notas')
    profesor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='profesor_notas')
    ayudante = models.ForeignKey(Ayudante, on_delete=models.SET_NULL, null=True, blank=True)
    public = models.BooleanField(default=False)
    muestra = models.ForeignKey(Muestra, blank=True, on_delete=models.SET_NULL, null=True)
    tags = models.ManyToManyField(Tag, blank=True)

    def __str__(self):
        return f"Nota: {self.titulo} ({self.alumno or self.profesor} - {self.muestra})"

    class Meta:
        verbose_name = "Nota"
        verbose_name_plural = "Notas"

class Label(models.Model):
    nota = models.CharField(max_length=1500, verbose_name="Nota")
    tag = models.ForeignKey(
        Tag, 
        on_delete=models.CASCADE, 
        related_name='labels',
        null=True,
        blank=True
    )
    coordenadas = models.JSONField(verbose_name="Coordenadas")
    captura = models.ForeignKey(
        Captura, 
        on_delete=models.SET_NULL,
        related_name='labels',
        null=True,
        blank=True
    )
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, 
                                 on_delete=models.SET_NULL, 
                                 null=True,
                                 related_name='created_labels')
    creator_name = models.CharField(max_length=255, blank=True, null=True)  # Nuevo campo
    created_at = models.DateTimeField(default=timezone.now)
    public = models.BooleanField(default=False)  # Add public field for labels
    is_temporary = models.BooleanField(default=False)  # Agregar este campo

    def save(self, *args, **kwargs):
        # Guardar el nombre del creador antes de guardar el modelo
        if self.created_by and not self.creator_name:
            self.creator_name = f"{self.created_by.get_full_name() or self.created_by.username}"
        super().save(*args, **kwargs)

    def __str__(self):
        creator_info = self.creator_name or "Usuario desconocido"
        return f"Label: {self.nota[:50]} (Creado por: {creator_info})"
