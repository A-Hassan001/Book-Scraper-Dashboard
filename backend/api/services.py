from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework.request import Request

from .models import Source, History, Detail


def get_details(request: Request):
    if domains := request.GET.get('domains', ''):
        query = Q()
        for domain in domains.split(',') if domains else []:
            query |= Q(spider_name=domain)

        ids = Source.objects.filter(query).values_list('spider_id', flat=True)
    else:
        ids = Source.objects.all().values_list('spider_id', flat=True)

    history = History.objects.filter(site_id__in=ids)
    detail = Detail.objects.filter(history_id__in=history.values_list('history_id', flat=True))

    if price := request.GET.get('min_price', None):
        detail = detail.filter(price__gte=float(price))

    if price := request.GET.get('max_price', None):
        detail = detail.filter(price__lte=float(price))

    if conditions := request.GET.get('condition', ''):
        if conditions != 'All':
            query = Q()
            for condition in conditions.split(',') if conditions else []:
                query |= Q(condition=condition)

            detail = detail.filter(query)

    if (days_old := request.GET.get('days_old')) is not None:
        days_old = int(days_old)
        cutoff_date = timezone.now().date() - timedelta(days=days_old)
        if days_old == 1:
            # For "1 day", we want only today's books
            detail = detail.filter(date_scraped=cutoff_date + timedelta(days=1))  # which is today
        else:
            detail = detail.filter(date_scraped__gte=cutoff_date)

    # print("days_old:", request.GET.get('days_old'))
    # print(detail.query)
    # print(f'\nTotal results agsinst filter: {detail.count()} / Date results: {detail}\n\n')
    return detail, history
