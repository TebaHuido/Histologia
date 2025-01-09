from django.urls import path, include
from rest_framework.routers import DefaultRouter
from api import views

# Instancia única del DefaultRouter
router = DefaultRouter()
router.register(r'notas', views.NotasViewSet, basename='notas')
router.register(r'profesores', views.ProfesorViewSet, basename='profesores')
router.register(r'cursos', views.CursoViewSet, basename='cursos')
router.register(r'ayudantes', views.AyudanteViewSet, basename='ayudantes')
router.register(r'categorias', views.CategoriaViewSet, basename='categorias')
router.register(r'sistemas', views.SistemaViewSet, basename='sistemas')
router.register(r'organos', views.OrganoViewSet, basename='organos')
router.register(r'muestras', views.MuestraViewSet, basename='muestras')  # basename único
router.register(r'muestra_alt', views.MuestraViewSet2, basename='muestra2')  # Nombre claro
router.register(r'lotes', views.LoteViewSet, basename='lotes')
router.register(r'alumnos', views.AlumnoViewSet, basename='alumnos')
router.register(r'capturas', views.CapturaViewSet, basename='capturas')
router.register(r'tinciones', views.TincionViewSet, basename='tinciones')  # Evitar duplicados

# URLs adicionales
urlpatterns = [
    # Rutas personalizadas
    path('muestra3/<int:id>/', views.MuestraDetailAPIView.as_view(), name='muestra-detail'),
    path('imagenes/', views.lista_imagenes, name='lista_imagenes'),
    path('muestras/por_categoria/', views.MuestraViewSet.as_view({'get': 'por_categoria'}), name='muestras_por_categoria'),
    path('lista_capturas_muestra/<int:muestra_id>/', views.lista_capturas_muestra, name='lista_capturas_muestra'),
    
    # Incluir rutas generadas por el router
    path('', include(router.urls)),
]
