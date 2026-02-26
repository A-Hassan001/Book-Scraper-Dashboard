from django.urls import path
from django.contrib import admin
from django.shortcuts import redirect

from .views import market_place_names, conditions_of_books, main_stats, price_range_of_books, all_filtered_results, dashboard_view


def home(request):
    return redirect('dashboard/')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('market_place_names/', market_place_names, name='market_place_names'),#
    path('price_range_of_books/', price_range_of_books, name='price_range_of_books'),#
    path('conditions_of_books/', conditions_of_books, name='conditions_of_books'),#
    path('main_stats/', main_stats, name='main_stats'),
    path('all_filtered_results/', all_filtered_results, name='all_filtered_results'),
    path('dashboard/', dashboard_view, name='dashboard_view')
]
