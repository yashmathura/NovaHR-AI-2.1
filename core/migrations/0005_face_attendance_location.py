from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("core", "0004_leave_cancelled_status")]

    operations = [
        migrations.AddField(
            model_name="user", name="face_photo",
            field=models.ImageField(blank=True, null=True, upload_to="employee_faces/"),
        ),
        migrations.AddField(
            model_name="user", name="face_descriptor",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="attendance", name="latitude",
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="attendance", name="longitude",
            field=models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name="attendance", name="location_accuracy",
            field=models.FloatField(blank=True, null=True),
        ),
    ]
