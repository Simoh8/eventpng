from rest_framework import authentication

class ContactFormAuthentication(authentication.BaseAuthentication):
    """
    Authentication class that allows unauthenticated access to the contact form.
    """
    def authenticate(self, request):
        # Always return None to indicate no authentication was performed
        # This allows the view to be accessed without authentication
        return None

    def authenticate_header(self, request):
        # This is required for the browsable API
        return 'ContactFormAuthentication'
