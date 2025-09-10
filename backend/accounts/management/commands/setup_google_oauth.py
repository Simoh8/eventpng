from django.core.management.base import BaseCommand
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp
from allauth.socialaccount.providers.google.provider import GoogleProvider

class Command(BaseCommand):
    help = 'Set up Google OAuth provider'

    def add_arguments(self, parser):
        parser.add_argument('--client-id', required=True, help='Google OAuth Client ID')
        parser.add_argument('--secret', required=True, help='Google OAuth Client Secret')
        parser.add_argument('--domain', help='Site domain (default: example.com)')

    def handle(self, *args, **options):
        domain = options.get('domain', 'example.com')
        
        # Get or create the site
        site, created = Site.objects.get_or_create(
            domain=domain,
            defaults={'name': domain}
        )
        
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created site: {domain}'))
        else:
            self.stdout.write(f'Using existing site: {domain}')
        
        # Create or update the Google OAuth app
        app, created = SocialApp.objects.update_or_create(
            provider=GoogleProvider.id,
            name='Google',
            defaults={
                'client_id': options['client_id'],
                'secret': options['secret'],
            }
        )
        
        # Clear existing sites and add our site
        app.sites.clear()
        app.sites.add(site)
        app.save()
        
        self.stdout.write(self.style.SUCCESS('Successfully set up Google OAuth provider'))
        self.stdout.write(f'Client ID: {app.client_id}')
        self.stdout.write(f'Site: {site.domain}')
