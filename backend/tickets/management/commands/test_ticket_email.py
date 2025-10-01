import logging
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from gallery.models import Event
from tickets.models import TicketType, TicketPurchase
from tickets.utils.email_utils import send_ticket_email

logger = logging.getLogger(__name__)
User = get_user_model()

class Command(BaseCommand):
    help = 'Test the ticket email sending functionality'
    
    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email address to send the test email to')
        parser.add_argument('--event', type=str, help='Event ID to use for the test')
        parser.add_argument('--ticket-type', type=str, help='Ticket Type ID to use for the test')
        parser.add_argument('--cancellation', action='store_true', help='Send a cancellation email instead of a confirmation')
        parser.add_argument('--refund-amount', type=float, default=0, help='Refund amount for cancellation email')
    
    def handle(self, *args, **options):
        email = options['email']
        is_cancellation = options['cancellation']
        refund_amount = options['refund_amount']
        
        self.stdout.write(self.style.SUCCESS(f"Sending test {'cancellation' if is_cancellation else 'confirmation'} email to {email}"))
        
        try:
            # Get or create a test user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0],
                    'first_name': 'Test',
                    'last_name': 'User',
                    'is_active': True,
                }
            )
            
            if created:
                self.stdout.write(self.style.SUCCESS(f'Created test user with email {email}'))
            
            # Get or create a test event
            event = None
            if options['event']:
                try:
                    event = Event.objects.get(id=options['event'])
                except Event.DoesNotExist:
                    self.stderr.write(self.style.ERROR(f'Event with ID {options["event"]} not found'))
                    return
            
            if not event:
                event = Event.objects.order_by('?').first()
                if not event:
                    self.stderr.write(self.style.ERROR('No events found. Please create an event first.'))
                    return
            
            # Get or create a ticket type
            ticket_type = None
            if options['ticket_type']:
                try:
                    ticket_type = TicketType.objects.get(id=options['ticket_type'])
                except TicketType.DoesNotExist:
                    self.stderr.write(self.style.ERROR(f'Ticket type with ID {options["ticket_type"]} not found'))
                    return
            
            if not ticket_type:
                ticket_type = TicketType.objects.filter(event=event).first()
                if not ticket_type:
                    # Create a test ticket type if none exists
                    ticket_type = TicketType.objects.create(
                        name='Test Ticket',
                        description='Test ticket type',
                        price=50.00,
                        quantity_available=100,
                        is_active=True,
                        event=event
                    )
            
            # Create a test ticket purchase
            ticket = TicketPurchase.objects.create(
                ticket_type=ticket_type,
                user=user,
                quantity=1,
                status='confirmed',
                payment_method='card',
                total_price=ticket_type.price
            )
            
            # Generate QR code for the ticket
            ticket._generate_qr_code()
            
            # Send the test email
            if is_cancellation:
                success = ticket.send_cancellation_email(refund_amount=refund_amount)
                email_type = 'cancellation'
            else:
                success = ticket.send_confirmation_email()
                email_type = 'confirmation'
            
            if success:
                self.stdout.write(self.style.SUCCESS(f'Successfully sent {email_type} email to {email}'))
                self.stdout.write(self.style.SUCCESS(f'Ticket ID: {ticket.id}'))
                self.stdout.write(self.style.SUCCESS(f'Verification Code: {ticket.verification_code}'))
            else:
                self.stderr.write(self.style.ERROR(f'Failed to send {email_type} email'))
            
        except Exception as e:
            logger.error(f'Error sending test email: {str(e)}', exc_info=True)
            self.stderr.write(self.style.ERROR(f'An error occurred: {str(e)}'))
