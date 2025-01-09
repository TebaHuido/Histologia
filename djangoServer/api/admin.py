from django.contrib import admin
from .models import *

""" class MuestraAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'get_filename')
    readonly_fields = ('get_filename',)  # Agrega el campo como de solo lectura

    def get_filename(self, obj):
        return obj.get_filename()
    get_filename.short_description = 'Filename'

    def change_view(self, request, object_id, form_url='', extra_context=None):
        # Asegúrate de que se muestre el campo en la vista de cambio de cada objeto
        self.fields = (__all__,'get_filename')  # Agrega 'get_filename' al formulario de cambio
        return super().change_view(request, object_id, form_url, extra_context) """

admin.site.register(Captura)
admin.site.register(Categoria)
admin.site.register(Muestra)
admin.site.register(Lote)
admin.site.register(Organo)
admin.site.register(Sistema)
admin.site.register(Notas)