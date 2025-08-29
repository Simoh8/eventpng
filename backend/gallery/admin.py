from django.contrib import admin
from django.utils.html import format_html
from .models import Gallery, Photo, Download


class PhotoInline(admin.TabularInline):
    model = Photo
    extra = 1
    fields = ('image', 'title', 'is_public', 'is_featured', 'order')
    readonly_fields = ('preview',)
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height: 100px; max-width: 100px;" />',
                obj.image.url
            )
        return "(No image)"
    preview.short_description = 'Preview'


@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    list_display = ('title', 'photographer', 'is_public', 'photo_count', 'price', 'created_at')
    list_filter = ('is_public', 'is_active', 'created_at')
    search_fields = ('title', 'description', 'photographer__email')
    list_select_related = ('photographer', 'cover_photo')
    readonly_fields = ('created_at', 'updated_at', 'cover_preview')
    fieldsets = (
        (None, {
            'fields': ('title', 'slug', 'description', 'photographer', 'price')
        }),
        ('Visibility', {
            'fields': ('is_public', 'is_active')
        }),
        ('Cover Photo', {
            'fields': ('cover_photo', 'cover_preview')
        }),
        ('Dates', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    inlines = [PhotoInline]
    
    def cover_preview(self, obj):
        if obj.cover_photo and obj.cover_photo.image:
            return format_html(
                '<img src="{}" style="max-height: 200px; max-width: 200px;" />',
                obj.cover_photo.image.url
            )
        return "(No cover photo)"
    cover_preview.short_description = 'Cover Preview'


@admin.register(Photo)
class PhotoAdmin(admin.ModelAdmin):
    list_display = ('title', 'gallery', 'is_public', 'is_featured', 'created_at')
    list_filter = ('is_public', 'is_featured', 'created_at')
    search_fields = ('title', 'description', 'gallery__title')
    list_select_related = ('gallery',)
    readonly_fields = ('preview', 'dimensions', 'file_size_mb', 'created_at', 'updated_at')
    fieldsets = (
        (None, {
            'fields': ('gallery', 'title', 'description')
        }),
        ('Image', {
            'fields': ('image', 'preview', 'dimensions', 'file_size_mb')
        }),
        ('Settings', {
            'fields': ('is_public', 'is_featured', 'order')
        }),
        ('Metadata', {
            'fields': ('mime_type', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def preview(self, obj):
        if obj.image:
            return format_html(
                '<img src="{}" style="max-height: 300px; max-width: 300px;" />',
                obj.image.url
            )
        return "(No image)"
    preview.short_description = 'Preview'
    
    def dimensions(self, obj):
        if obj.width and obj.height:
            return f"{obj.width} × {obj.height} px"
        return "-"
    dimensions.short_description = 'Dimensions'
    
    def file_size_mb(self, obj):
        if obj.file_size:
            return f"{obj.file_size / (1024 * 1024):.2f} MB"
        return "-"
    file_size_mb.short_description = 'File Size'


@admin.register(Download)
class DownloadAdmin(admin.ModelAdmin):
    list_display = ('user', 'photo', 'downloaded_at')
    list_filter = ('downloaded_at',)
    search_fields = ('user__email', 'photo__title')
    list_select_related = ('user', 'photo')
    readonly_fields = ('downloaded_at', 'ip_address', 'user_agent')
    fieldsets = (
        (None, {
            'fields': ('user', 'photo', 'downloaded_at')
        }),
        ('Request Info', {
            'fields': ('ip_address', 'user_agent'),
            'classes': ('collapse',)
        }),
    )
