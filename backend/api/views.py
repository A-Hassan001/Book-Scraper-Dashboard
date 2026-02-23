from collections import defaultdict

from django.shortcuts import render
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.db.models import Avg, Min, Max, Count

from .services import get_details
from .models import Source, Detail
from .serializers import DetailSerializer



def dashboard_view(request):
    return render(request, 'dashboard.html')


@api_view(['GET'])
def market_place_names(request):
    groups = defaultdict(list)
    for name in Source.objects.all().values_list('spider_name', flat=True):
        base = next(iter(name.split('_')))  # wallapop
        groups[base].append(name.replace(base + '_', ''))

    return Response(groups)


@api_view(['GET'])
def price_range_of_books(request):
    detail, history = get_details(request=request)

    return Response({
        'min_price': detail.order_by('price').first().price,
        'max_price': detail.order_by('-price').first().price
    })


@api_view(['GET'])
def conditions_of_books(request):
    detail, history = get_details(request=request)

    conditions = list(detail.values_list('condition', flat=True).distinct())
    conditions.append('All')
    conditions.sort()
    return Response(conditions)


@api_view(['GET'])
def main_stats(request):
    try:
        detail, history = get_details(request=request)

        return Response({
            'Total Books': detail.count(),  # Total number of book entries
            'Unique Sellers': detail.values_list('seller', flat=True).distinct().count(), # Count of unique sellers
            'Average Price': round((detail.aggregate(avg_price=Avg('price')).get('avg_price') or 0), 2),
            'Rotation Rate': f'{round((detail.filter(availability=False).count() / (detail.count() or 1)) * 100, 2)} %',
            'Hot Books': detail.filter(availability=True).count(),  # Count of available books
            'Sold Books': detail.filter(availability=False).count()  # Count of sold books
        })
    except:
        return Response({
            'Total Books': 0,
            'Unique Sellers': 0,
            'Average Price': 0,
            'Rotation Rate': '0 %',
            'Hot Books': 0,
            'Sold Books': 0
        })

@api_view(['GET'])
def all_filtered_results(request):
    # Group by seller or isbn (default is isbn)
    group_by = request.GET.get('group_by', 'isbn')
    detail, history = get_details(request=request)

    # Only available books for 'results'
    available_detail = detail.filter(availability=True)

    if group_by in ('seller', 'isbn'):
        grouped_data = defaultdict(list)
        for obj in available_detail:
            key = getattr(obj, group_by) or 'unknown'
            grouped_data[key].append(obj)

        # Get sold counts from the same filtered queryset
        sold_map = detail.filter(availability=False).values(group_by).annotate(sold_count=Count('detail_id'))
        sold_dict = {entry[group_by]: entry['sold_count'] for entry in sold_map}

        response = []
        for key, items in grouped_data.items():
            agg = Detail.objects.filter(detail_id__in=[obj.detail_id for obj in items]).aggregate(avg_price=Avg(
                'price'), min_price=Min('price'), max_price=Max('price'))

            total_available = len(items)
            sold_count = sold_dict.get(key, 0)
            avg_active = total_available if total_available else 1

            response.append({
                group_by.capitalize(): key,  # Seller or ISBN
                'Available Books': total_available,
                'Books Sold': sold_count,
                'Average Rotation (%)': f'{round((sold_count / avg_active) * 100, 2)}%',
                'Average Price': round(agg.get('avg_price') or 0, 2),
                'Minimum Price':  round(agg.get('min_price') or 0, 2),
                'Maximum Price': round(agg.get('max_price') or 0, 2),
                'results': DetailSerializer(items, many=True).data
            })

        return Response(response)
    # No need of this line
    return Response(DetailSerializer(detail, many=True).data)
