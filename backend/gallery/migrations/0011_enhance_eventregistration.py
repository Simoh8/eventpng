from django.db import migrations, models
import uuid

class Migration(migrations.Migration):

    dependencies = [
        ('gallery', '0010_add_ticket_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='eventregistration',
            name='phone',
            field=models.CharField(blank=True, max_length=20, verbose_name='Phone Number'),
        ),
        migrations.AddField(
            model_name='eventregistration',
            name='quantity',
            field=models.PositiveIntegerField(default=1, help_text='Number of tickets'),
        ),
        migrations.AddField(
            model_name='eventregistration',
            name='payment_reference',
            field=models.CharField(blank=True, max_length=100, null=True, verbose_name='Payment Reference'),
        ),
        migrations.AddField(
            model_name='eventregistration',
            name='is_paid',
            field=models.BooleanField(default=False, help_text='Whether the ticket has been paid for'),
        ),
        migrations.AlterField(
            model_name='eventregistration',
            name='status',
            field=models.CharField(choices=[('pending', 'Pending'), ('confirmed', 'Confirmed'), ('cancelled', 'Cancelled'), ('attended', 'Attended'), ('no_show', 'No Show')], default='pending', max_length=20),
        ),
    ]
