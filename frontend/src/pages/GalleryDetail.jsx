import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import MainLayout from '../layouts/MainLayout';

const GalleryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fetch gallery details
  const { data: gallery, isLoading, error } = useQuery({
    queryKey: ['gallery', id],
    queryFn: async () => {
      // First try to fetch by slug (if the ID looks like a slug)
      let response = await fetch(`${API_BASE_URL}/api/gallery/public/galleries/${id}/`);
      
      // If 404, try to fetch by ID as a fallback
      if (response.status === 404 && !isNaN(id)) {
        response = await fetch(`${API_BASE_URL}/api/gallery/public/galleries/${id}/`);
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch gallery');
      }
      return response.json();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to load gallery');
    },
  });

  // Handle photo click
  const handlePhotoClick = (photo) => {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{gallery.title}</h1>
          {gallery.photographer && (
            <p className="text-gray-600">
              By {gallery.photographer.first_name || gallery.photographer.username}
            </p>
          )}
          {gallery.description && (
            <p className="text-gray-700 mt-4">{gallery.description}</p>
          )}
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <span>{gallery.photos?.length || 0} photos</span>
            {gallery.created_at && (
              <span className="mx-2">•</span>
            )}
            {gallery.created_at && (
              <span>Created on {new Date(gallery.created_at).toLocaleDateString()}</span>
            )}
          </div>
        </div>

        {/* Photos Grid */}
        {gallery.photos && gallery.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {gallery.photos.map((photo) => (
              <div 
                key={photo.id} 
                className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handlePhotoClick(photo)}
              >
                <img
                  src={photo.image}
                  alt={photo.caption || 'Gallery photo'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Available';
                  }}
                />
              </div>
            ))}
          </div>
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
