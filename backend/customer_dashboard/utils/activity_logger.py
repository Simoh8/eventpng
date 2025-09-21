from django.contrib.contenttypes.models import ContentType
from ..models.activity import UserActivity

def log_user_activity(user, activity_type, obj=None, **metadata):
    """
    Log a user activity
    
    Args:
        user: The user performing the action
        activity_type: Type of activity (from UserActivity.ActivityType)
        obj: Optional related object (e.g., a Photo or Gallery instance)
        **metadata: Additional data to store with the activity
    """
    content_type = None
    object_id = None
    
    if obj is not None:
        content_type = ContentType.objects.get_for_model(obj)
        object_id = str(obj.id)
    
    # Add IP address if available from the request
    request = getattr(user, '_request', None)
    if request and 'ip_address' not in metadata:
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            metadata['ip_address'] = x_forwarded_for.split(',')[0]
        else:
            metadata['ip_address'] = request.META.get('REMOTE_ADDR')
    
    # Record the activity
    return UserActivity.record_activity(
        user=user,
        activity_type=activity_type,
        content_type=content_type,
        object_id=object_id,
        **metadata
    )
