from django.contrib import admin
from django.urls import path, include
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_root(request):
    """
    API root endpoint with available endpoints.
    """
    return Response({
        'message': 'Welcome to DndOptimizer API',
        'version': '1.0.0',
        'endpoints': {
            'admin': '/admin/',
            'docs': '/api/docs/',
            'schema': '/api/schema/',
            'users': '/api/users/',
            'auth': {
                'register': '/api/users/register/',
                'login': '/api/users/login/',
                'refresh': '/api/users/token/refresh/',
                'me': '/api/users/me/',
            },
            'spells': '/api/spells/spells/',
            'spellbooks': '/api/spellbooks/',
            'analysis': {
                'compare': '/api/analysis/compare/',
                'analyze': '/api/analysis/analyze/',
                'efficiency': '/api/analysis/efficiency/',
            }
        }
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', api_root, name='api-root'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/users/', include('users.urls')),
    path('api/spells/', include('spells.urls')),
    path('api/spellbooks/', include('spellbooks.urls')),
    path('api/analysis/', include('analysis.urls')),
]
