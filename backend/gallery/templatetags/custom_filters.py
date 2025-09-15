from django import template

register = template.Library()

@register.filter(name='repeat')
def repeat(value, arg):
    """Repeat the given string arg times."""
    try:
        return value * int(arg)
    except (ValueError, TypeError):
        return value
