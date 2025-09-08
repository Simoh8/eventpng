from django import template
from django.db.models import Count, Q
from ..models import ContactSubmission

register = template.Library()

@register.inclusion_tag('admin/contact/contact_count_badge.html', takes_context=True)
def contact_count_badge(context):
    if 'request' not in context:
        return {}
        
    # Count unread contacts (you can customize this query based on your needs)
    unread_count = ContactSubmission.objects.filter(status='new').count()
    
    return {
        'unread_count': unread_count,
    }
