# from django.db import models
#
# class Source(models.Model):
#     spider_id = models.AutoField(primary_key=True)
#     spider_name = models.CharField(max_length=255, unique=True)
#     spider_domain = models.CharField(max_length=255)
#
#     class Meta:
#         db_table = "source_table"
#
#     def __str__(self):
#         return self.spider_name
#
#
# class History(models.Model):
#     history_id = models.AutoField(primary_key=True)
#     site_id = models.ForeignKey(Source, on_delete=models.CASCADE, db_column="site_id", related_name="histories")
#     isbn = models.CharField(max_length=255)
#     available_books = models.IntegerField(default=0)
#     sold_books = models.IntegerField(default=0)
#
#     class Meta:
#         db_table = "history_table"
#         constraints = [models.UniqueConstraint(fields=["site_id", "isbn"], name="uq_siteid_isbn")]
#
#     def __str__(self):
#         return f"{self.isbn} - {self.site_id}"
#
#
# class Detail(models.Model):
#     detail_id = models.AutoField(primary_key=True)
#     history = models.ForeignKey(History, on_delete=models.CASCADE, db_column='history_id', related_name='details')
#     isbn = models.CharField(max_length=255)
#     date_scraped = models.DateField(auto_now_add=True)
#     name = models.TextField()
#     price = models.FloatField()
#     seller = models.TextField()
#     condition = models.TextField()
#     editorial = models.TextField()
#     images = models.JSONField()
#     url = models.TextField()
#     availability = models.BooleanField(default=True)
#
#     class Meta:
#         db_table = "details_table"
#
#     def __str__(self):
#         return self.name
import json
from django.db import models


class SafeJSONField(models.JSONField):
    """
    JSONField that safely handles both string and already-deserialized values
    from the database.
    """
    def from_db_value(self, value, expression, connection):
        if value is None:
            return None
        # If the database driver already gave us a Python object, use it directly.
        if not isinstance(value, (str, bytes)):
            return value
        # Otherwise, parse the JSON string.
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            # Fallback to an empty list if the string is not valid JSON.
            # Adjust as needed for your data (maybe return [] or {}).
            return []

class Source(models.Model):
    spider_id = models.AutoField(primary_key=True)
    spider_name = models.CharField(max_length=255, unique=True)
    spider_domain = models.CharField(max_length=255)

    class Meta:
        db_table = "source_table"

    def __str__(self):
        return self.spider_name


class History(models.Model):
    history_id = models.AutoField(primary_key=True)
    site_id = models.ForeignKey(
        Source,
        on_delete=models.CASCADE,
        db_column="site_id",
        related_name="histories"
    )
    isbn = models.CharField(max_length=255)
    available_books = models.IntegerField(default=0)
    sold_books = models.IntegerField(default=0)

    class Meta:
        db_table = "history_table"
        constraints = [
            models.UniqueConstraint(fields=["site_id", "isbn"], name="uq_siteid_isbn")
        ]

    def __str__(self):
        return f"{self.isbn} - {self.site_id}"


class Detail(models.Model):
    detail_id = models.AutoField(primary_key=True)
    history = models.ForeignKey(
        History,
        on_delete=models.CASCADE,
        db_column='history_id',
        related_name='details'
    )
    isbn = models.CharField(max_length=255)
    date_scraped = models.DateField(auto_now_add=True)
    first_seen = models.DateField(auto_now_add=True)
    site_id = models.IntegerField(null=True, blank=True)  # optional
    name = models.TextField()
    price = models.FloatField()
    seller = models.TextField()
    condition = models.TextField()
    editorial = models.TextField()
    images = SafeJSONField()
    url = models.TextField(unique=True)
    availability = models.BooleanField(default=True)

    class Meta:
        db_table = "details_table"

    def __str__(self):
        return self.name

        return self.name
