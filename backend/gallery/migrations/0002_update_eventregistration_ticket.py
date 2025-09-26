from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('gallery', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventregistration',
            name='event_ticket',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='registrations',
                to='gallery.eventticket',
                help_text='The specific event ticket this registration is for'
            ),
        ),
        migrations.AlterField(
            model_name='eventregistration',
            name='ticket',
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='legacy_registrations',
                to='gallery.ticket',
                help_text='Legacy ticket reference. Use event_ticket instead.'
            ),
        ),
    ]
