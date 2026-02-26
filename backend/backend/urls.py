# from django.contrib import admin
# from django.urls import path, include


# urlpatterns = [
#     path("admin/", admin.site.urls),
#     path('api/', include('api.urls'))
# ]

from django.contrib import admin
from django.urls import path, include
from django.shortcuts import redirect

def home(request):
    return redirect('/api/dashboard/')  # adjust if needed

urlpatterns = [
    path('', home),                     # ✅ ROOT redirect (VERY IMPORTANT)
    path("admin/", admin.site.urls),
    path('api/', include('api.urls')),
]
