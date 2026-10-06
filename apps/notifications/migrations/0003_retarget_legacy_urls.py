"""
The Django template pages were retired; notifications created earlier
still point at their old paths. Rewrite the ones whose React equivalent
lives somewhere else (order URLs - /orders/<ref>/ - are the same path in
React, so they need no change).
"""
from django.db import migrations

LEGACY_TO_REACT = {
    "/sellers/orders/": "/seller/orders",
}


def forwards(apps, schema_editor):
    Notification = apps.get_model("notifications", "Notification")
    for old, new in LEGACY_TO_REACT.items():
        Notification.objects.filter(url=old).update(url=new)


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0002_rename_notifications_user_read_idx_notificatio_user_id_8a7c6b_idx_and_more"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
