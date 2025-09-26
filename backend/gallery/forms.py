from django import forms
from django.utils.translation import gettext_lazy as _
from .models import Event, EventCoverImage, Gallery, Photo, Ticket, EventRegistration

class EventForm(forms.ModelForm):
    class Meta:
        model = Event
        fields = '__all__'
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add any custom form initialization here
        if 'has_tickets' in self.fields:
            self.fields['has_tickets'].help_text = _('Check this if this event requires tickets')
            
        if 'ticket_type' in self.fields:
            self.fields['ticket_type'].help_text = _('Select the type of ticketing for this event')
            
        if 'max_attendees' in self.fields:
            self.fields['max_attendees'].help_text = _('Maximum number of attendees (for RSVP/paid events)')


class EventCoverImageForm(forms.ModelForm):
    class Meta:
        model = EventCoverImage
        fields = '__all__'
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add any custom form initialization here


class GalleryForm(forms.ModelForm):
    class Meta:
        model = Gallery
        fields = '__all__'
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add any custom form initialization here


class PhotoForm(forms.ModelForm):
    class Meta:
        model = Photo
        fields = '__all__'
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add any custom form initialization here


class TicketForm(forms.ModelForm):
    class Meta:
        model = Ticket
        fields = '__all__'
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add any custom form initialization here


class EventRegistrationForm(forms.ModelForm):
    class Meta:
        model = EventRegistration
        fields = '__all__'
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Add any custom form initialization here
