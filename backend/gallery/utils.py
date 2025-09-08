from PIL import Image, ImageDraw, ImageFont
import os
from django.conf import settings
from io import BytesIO
from django.core.files.base import ContentFile

def add_watermark(image_field, text, position=(10, 10), opacity=0.5):
    """
    Add a watermark to an image.
    
    Args:
        image_field: The ImageFieldFile object from the model
        text: The watermark text
        position: Tuple of (x, y) coordinates for the watermark
        opacity: Opacity of the watermark (0.0 to 1.0)
        
    Returns:
        ContentFile: The watermarked image as a ContentFile
    """
    # Open the original image
    image = Image.open(image_field)
    
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')
    
    # Create a transparent layer for the watermark
    watermark = Image.new('RGBA', image.size, (0, 0, 0, 0))
    
    # Create a drawing context
    draw = ImageDraw.Draw(watermark)
    
    # Get a font (using default font for now, you might want to use a custom font)
    try:
        font_size = int(min(image.size) / 20)  # Dynamic font size based on image size
        font = ImageFont.truetype("arial.ttf", font_size)
    except IOError:
        # Fallback to default font
        font = ImageFont.load_default()
    
    # Calculate text size and position
    text_width, text_height = draw.textsize(text, font=font)
    x = position[0]
    y = position[1]
    
    # Draw the text with the specified opacity
    draw.text((x, y), text, font=font, fill=(255, 255, 255, int(255 * opacity)))
    
    # Combine the original image with the watermark
    watermarked = Image.alpha_composite(image, watermark)
    
    # Convert back to RGB (removes alpha channel for JPEG compatibility)
    if image.format == 'JPEG' or image.format == 'JPG':
        watermarked = watermarked.convert('RGB')
    
    # Save the watermarked image to a BytesIO object
    buffer = BytesIO()
    watermarked.save(buffer, format=image.format or 'PNG')
    
    # Create a new ContentFile from the buffer
    return ContentFile(buffer.getvalue(), name=os.path.basename(image_field.name))

def process_image(photo):
    """
    Process an image by adding a watermark and optimizing it.
    
    Args:
        photo: The Photo model instance
    """
    if not photo.image:
        return
        
    try:
        # Create watermark text (e.g., username + date)
        watermark_text = f"© {photo.uploaded_by.username if photo.uploaded_by else 'EventPix'}"
        
        # Add watermark
        watermarked_image = add_watermark(
            photo.image,
            text=watermark_text,
            position=(30, 30),
            opacity=0.7
        )
        
        # Save the watermarked image back to the field
        photo.image.save(
            os.path.basename(photo.image.name),
            watermarked_image,
            save=False
        )
        
        # Save the model to update the image field
        photo.save()
        
    except Exception as e:
        # Log the error but don't fail the request
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error processing image {photo.id}: {str(e)}")
