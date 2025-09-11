import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const GalleryDetail = () => {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const galleryRef = useRef(null);
  
  // Disable right-click and keyboard shortcuts for screenshots
  useEffect(() => {
    const preventDefault = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        return false;
      }
    };

    const preventContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Disable right-click
    document.addEventListener('contextmenu', preventContextMenu);
    
    // Disable print screen, save page, etc.
    document.addEventListener('keydown', (e) => {
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S, Ctrl+P
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.shiftKey && e.key === 'J') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'p')
      ) {
        e.preventDefault();
        return false;
      }
    });

    // Disable drag and drop
    document.addEventListener('dragstart', preventDefault);
    document.addEventListener('selectstart', preventDefault);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventDefault);
      document.removeEventListener('dragstart', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
    };
  }, []);
  
  const addWatermark = (imageUrl, text = '© EventPNG') => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        // Add watermark text
        ctx.font = `${Math.max(img.width * 0.03, 20)}px Arial`;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Add multiple watermarks
        const textWidth = ctx.measureText(text).width;
        const spacing = textWidth * 1.5;
        const angle = -20 * Math.PI / 180;
        
        // Save the context
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        
        // Create a grid of watermarks
        for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
          for (let y = -canvas.height; y < canvas.height * 2; y += spacing * 2) {
            ctx.fillText(text, x, y);
          }
        }
        
        // Restore the context
        ctx.restore();
        
        // Return the watermarked image as data URL
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      
      img.src = imageUrl;
    });
  };
  
  // Download single image with watermark
  const downloadImage = async (photo) => {
    try {
      setIsDownloading(true);
      const watermarkedImage = await addWatermark(photo.image);
      const link = document.createElement('a');
      link.href = watermarkedImage;
      link.download = `eventpix-${gallery.title}-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Image downloaded with watermark');
    } catch (error) {
      // console.error('Error downloading image:', error);
      toast.error('Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  };
  
  // Download all images as zip
  const downloadAllImages = async () => {
    if (!gallery?.photos?.length) return;
    
    try {
      setIsDownloading(true);
      const zip = new JSZip();
      const folder = zip.folder(`eventpix-${gallery.title}`);
      
      // Process each image
      const imagePromises = gallery.photos.map(async (photo, index) => {
        try {
          const watermarkedImage = await addWatermark(photo.image);
          const response = await fetch(watermarkedImage);
          const blob = await response.blob();
          folder.file(`image-${index + 1}.jpg`, blob);
        } catch (error) {
          console.error(`Error processing image ${index + 1}:`, error);
        }
      });
      
      await Promise.all(imagePromises);
      
      // Generate and download the zip file
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `eventpix-${gallery.title}.zip`);
      toast.success('All images downloaded with watermarks');
    } catch (error) {
      console.error('Error creating zip file:', error);
      toast.error('Failed to download images');
    } finally {
      setIsDownloading(false);
    }
  };

  // Fetch gallery details using either ID or slug
  const { data: gallery, isLoading, error } = useQuery({
    queryKey: ['gallery', slug],
    queryFn: async () => {
      // First try to fetch using the ID endpoint if the slug is a number
      let response;
      try {
        // Check if the slug is a number (ID)
        if (!isNaN(slug)) {
          // Use the direct ID-based endpoint
          response = await fetch(`${API_BASE_URL}/api/gallery/public/galleries/by-id/${slug}/`);
        } else {
          // Try with the slug endpoint
          response = await fetch(`${API_BASE_URL}/api/gallery/public/galleries/${slug}/`);
        }
        
        if (!response.ok) {
          throw new Error('Gallery not found');
        }
        
        const data = await response.json();
        
        // If the canonical slug is different from the one in the URL, update the URL
        if (data.slug && data.slug !== slug) {
          window.history.replaceState({}, '', `/gallery/${data.slug}`);
        }
        
        return data;
      } catch (err) {
        console.error('Error fetching gallery:', err);
        throw new Error('Failed to fetch gallery');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to load gallery');
    },
  });

  // Handle photo click - disabled in favor of download
  const handlePhotoClick = (photo) => {
    // Instead of opening in fullscreen, trigger download
    downloadImage(photo);
    // Uncomment below to re-enable fullscreen view
    setSelectedPhoto(photo);
    setIsFullscreen(true);
  };

  // Handle close fullscreen
  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setSelectedPhoto(null);
  };

  // Handle keyboard navigation in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCloseFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error || !gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Gallery Not Found</h2>
          <p className="text-gray-600 mb-4">The gallery you're looking for doesn't exist or is not available.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center text-primary-500 hover:text-primary-700"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to event
        </button>
        
        {/* Gallery Header */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{gallery.title}</h1>
              {gallery.event && (
                <p className="text-gray-600 mt-1">
                  From event: <span className="font-medium">{gallery.event.title}</span>
                </p>
              )}
            </div>
            
            <div className="bg-primary-50 text-primary-800 px-4 py-2 rounded-md">
              <div className="text-sm font-medium">Total Photos</div>
              <div className="text-2xl font-bold">{gallery.photos?.length || 0}</div>
            </div>
          </div>
          
          {gallery.photographer && (
            <div className="flex items-center text-gray-600 mb-3">
              {/* <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg> */}
              {/* <span>Photographer: {gallery.photographer.first_name || gallery.photographer.username}</span> */}
            </div>
          )}
          
          {gallery.created_at && (
            <div className="flex items-center text-gray-600 mb-3">
              <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Created on {new Date(gallery.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
          )}
          
          {gallery.updated_at && (
            <div className="flex items-center text-gray-600 mb-4">
              <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Last updated: {new Date(gallery.updated_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric'
              })}</span>
            </div>
          )}
          
          {gallery.description && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Gallery Description</h3>
              <p className="text-gray-700">{gallery.description}</p>
            </div>
          )}
        </div>

        {/* Photos Grid with Download Buttons */}
        {gallery.photos && gallery.photos.length > 0 ? (
          <>
            <div className="mb-4">
              <button
                onClick={downloadAllImages}
                disabled={isDownloading}
                className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  'Download All Images'
                )}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {gallery.photos.map((photo) => (
                <div 
                  key={photo.id} 
                  className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <div className="relative w-full h-full">
                    <img
                      src={photo.image}
                      alt={photo.caption || 'Gallery photo'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Available';
                      }}
                      onClick={() => handlePhotoClick(photo)}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadImage(photo);
                        }}
                        className="bg-white bg-opacity-90 rounded-full p-2 text-gray-800 hover:bg-opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                        title="Download Image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No photos in this gallery yet.</p>
          </div>
        )}
      </div>

      {/* Fullscreen Photo View */}
      {isFullscreen && selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={handleCloseFullscreen}
        >
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleCloseFullscreen();
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="relative max-w-full max-h-full">
              <img
                src={selectedPhoto.image}
                alt={selectedPhoto.caption || 'Selected photo'}
                className="max-w-full max-h-[80vh] object-contain"
              />
              
              {selectedPhoto.caption && (
                <div className="mt-4 text-white text-center">
                  {selectedPhoto.caption}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryDetail;
