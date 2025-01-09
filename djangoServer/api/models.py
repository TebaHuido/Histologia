import uuid
import os
from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver





def generate_filename(instance, filename):
    extension = filename.split('.')[-1]
    new_filename = f"{uuid.uuid4()}.{extension}"
    return os.path.join('muestras/', new_filename)

def default_name():
    return f"Captura {Captura.objects.count()+1}"

class Profesor(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre")
    passhash = models.CharField(max_length=100, verbose_name="Hash")
    correo = models.CharField(max_length=100, verbose_name="Correo")

    def __str__(self):
        return f"Profesor: {self.nombre} ({self.correo})"
   
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
        return f"Ayudante: {self.nombre} ({self.correo})"
 
class Categoria(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre")

    def __str__(self):
        return f"Categoría: {self.name}"
    
class Sistema(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre del sistema")

    def __str__(self):
        return f"Sistema: {self.sisname}"
    
class Organo(models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre del organo")
    sistema = models.ManyToManyField(Sistema, blank=True)

    def __str__(self):
        return f"Órgano: {self.orgname}"

class Captura(models.Model):
    aumento = models.FloatField(default=0.0, null=True, blank=True)
    name = models.CharField(default=default_name, max_length=100, verbose_name="Nombre")
    image = models.ImageField(upload_to=generate_filename, null=False, blank=False, verbose_name="Captura")
    muestra = models.ForeignKey('Muestra', models.SET_NULL, null=True, blank=True)

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
    captura = models.ManyToManyField(Captura, blank=True)

    def __str__(self):
        return f"Tinción: {self.name} ({self.descripcion})"

class Tag (models.Model):
    name = models.CharField(max_length=100, verbose_name="Nombre")

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
    name = models.CharField(max_length=100, verbose_name="Nombre")
    passhash = models.CharField(max_length=100, verbose_name="Hash")
    correo = models.CharField(max_length=100, verbose_name="Correo")
    curso = models.ManyToManyField(Curso, blank=True)
    permiso = models.ManyToManyField(Muestra, blank=True)

    def __str__(self):
        return f"Alumno: {self.nombre} ({self.correo})"

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
    nota = models.CharField(max_length=1500, verbose_name="Nota")
    alumno = models.ForeignKey(Alumno, models.SET_NULL, null=True, blank=True)
    ayudante = models.ForeignKey(Ayudante, models.SET_NULL, null=True, blank=True)
    profesor = models.ForeignKey(Profesor, models.SET_NULL, null=True, blank=True)
    public = models.BooleanField(default=False)
    muestra = models.ManyToManyField(Muestra, blank=True)
    tags = models.ManyToManyField(Tag, blank=True)
    def __str__(self):
        return f"Nota: {self.nota} ({self.alumno} - {self.muestra})"

    class Meta:
        verbose_name = "Nota"
        verbose_name_plural = "Notas"

class Label(models.Model):
    nota = models.CharField(max_length=1500, verbose_name="Nota")
    tags = models.ManyToManyField('Tag', related_name='labels', verbose_name="Etiquetas")
    coordenadas = models.JSONField(verbose_name="Coordenadas", help_text="JSON con las coordenadas asociadas")
    
    def __str__(self):
        return self.nota[:50]  # Retorna los primeros 50 caracteres de la nota   
