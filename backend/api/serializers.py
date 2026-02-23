from rest_framework import serializers

from .models import Source, History, Detail


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = "__all__"


class HistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = History
        fields = "__all__"


class DetailSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Detail
        fields = ['image', 'isbn', 'name', 'price', 'condition','seller','url', 'date_scraped']

    def get_image(self, obj):
        # Only return the first image URL
        if isinstance(obj.images, list) and obj.images:
            return obj.images[0]
        return ''
