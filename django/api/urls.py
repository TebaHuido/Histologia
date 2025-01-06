from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .views import (
    LoginView, NotaViewSet, UploadXlsView, TagViewSet, 
    LabelViewSet, MuestraViewSet, MuestraViewSet2
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register(r'notas', views.NotaViewSet, basename='notas')
router.register(r'profesores', views.ProfesorViewSet, basename='profesores')
router.register(r'cursos', views.CursoViewSet, basename='curso')
router.register(r'ayudantes', views.AyudanteViewSet, basename='ayudantes')
router.register(r'categorias', views.CategoriaViewSet, basename='categorias')
router.register(r'sistemas', views.SistemaViewSet, basename='sistemas')
router.register(r'organos', views.OrganoViewSet, basename='organos')
router.register(r'muestras', MuestraViewSet, basename='muestras')
router.register(r'lotes', views.LoteViewSet, basename='lotes')
router.register(r'alumnos', views.AlumnoViewSet, basename='alumnos')
router.register(r'tinciones', views.TincionViewSet, basename='tinciones')
router.register(r'tags', TagViewSet, basename='tags')
router.register(r'labels', LabelViewSet, basename='labels')
router.register(r'tejidos', MuestraViewSet2, basename='tejidos')  # Update this line
router.register(r'uplimage', views.UplImageViewSet, basename='uplimage')

urlpatterns = [
    path('filters/', views.FilterView.as_view(), name='filters'),
    path('tejidos/<int:id>/', views.MuestraDetailAPIView.as_view(), name='tejido-detail'),
    path('muestras/filtrado/', views.MuestraViewSet.as_view({'get': 'Filtrado'}), name='muestras_filtrado'),
    path('login/', LoginView.as_view(), name='login'),
    path('profesores/create/', views.ProfesorCreateView.as_view(), name='profesor-create'),
    path('uplimage/', views.UplimageView.as_view(), name='uplimage'),
    path('cursos/', views.CursoViewSet.as_view({'get': 'list', 'post': 'create'}), name='cursos'),
    path('upload-xls/', UploadXlsView.as_view(), name='upload-xls'),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('csrf/', views.GetCSRFToken.as_view(), name='csrf'),
    path('alumnos/sin-curso/', views.AlumnoViewSet.as_view({'get': 'sin_curso'}), name='alumnos-sin-curso'),
    path('alumnos/<int:pk>/remove-from-curso/', 
         views.AlumnoViewSet.as_view({'delete': 'remove_from_curso'}), 
         name='alumno-remove-from-curso'),
    path('tejidos/', views.MuestraViewSet2.as_view({'get': 'list'}), name='tejido-list'),  # Update this line
    path('', include(router.urls)),
]
