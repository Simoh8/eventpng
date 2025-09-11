import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaShoppingCart, FaTimes, FaChevronLeft, FaChevronRight, FaExpand, FaCompress, FaSpinner } from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Helper function to get protected image URL
const getProtectedImageUrl = (imageUrl, width = 800) => {
  if (!imageUrl) return '';
  // If the URL is already absolute, return it as is
  if (imageUrl.startsWith('http')) return imageUrl;
  // Otherwise, construct the full URL
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  return `${baseUrl}${imageUrl}${imageUrl.includes('?') ? '&' : '?'}w=${width}`;
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper function to fetch event details by slug
const fetchEvent = async (slug) => {
  // First get the event ID from the slug
  const eventsResponse = await axios.get(`${API_URL}/api/gallery/public/events/`);
  const events = Array.isArray(eventsResponse.data) ? eventsResponse.data : eventsResponse.data.results || [];
  const event = events.find(event => event.slug === slug);
  
  if (!event) {
    throw new Error(`Event with slug '${slug}' not found`);
  }
  
  // Now fetch the full event details with galleries and photos
  const eventDetailResponse = await axios.get(`${API_URL}/api/gallery/public/events/${event.id}/`);
  
  if (!eventDetailResponse.data) {
    throw new Error('Event details not found');
  }
  
  // Process the response to match the expected format
  const eventData = eventDetailResponse.data;
  
  // Flatten all photos from all galleries
  const allPhotos = [];
  if (eventData.galleries && Array.isArray(eventData.galleries)) {
    eventData.galleries.forEach(gallery => {
      if (gallery.photos && Array.isArray(gallery.photos)) {
        gallery.photos.forEach(photo => {
          allPhotos.push({
            ...photo,
            gallery_title: gallery.title,
            gallery_id: gallery.id
          });
        });
      }
    });
  }
  
  // Return the combined data
  return {
    ...eventData,
    photos: {
      results: allPhotos,
      count: allPhotos.length,
      next: null,  // Pagination would need to be handled differently if needed
      previous: null
    }
  };
};

const EventDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryGroups, setGalleryGroups] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lightboxRef = useRef();
  const observer = useRef();

  // Fetch event details
  const {
    data: event,
    isLoading: isLoadingEvent,
    error: eventError 
  } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => slug ? fetchEvent(slug) : Promise.reject('No event slug provided'),
    enabled: !!slug, // Only run the query if we have a valid slug
    onSuccess: (data) => {
      if (data && data.galleries) {
        // Initialize gallery groups with empty arrays
        const groups = {};
        data.galleries.forEach(gallery => {
          groups[gallery.id] = {
            ...gallery,
            photos: []
          };
        });
        setGalleryGroups(groups);
      }
    }
  });

  // Process event data when it's loaded
  useEffect(() => {
    if (event?.galleries) {
      // Initialize gallery groups with photos
      const groups = {};
      const allPhotos = [];
      
      event.galleries.forEach(gallery => {
        if (gallery) {
          // Process photos for this gallery
          const galleryPhotos = (gallery.photos || []).map(photo => ({
            ...photo,
            gallery_title: gallery.title,
            gallery_id: gallery.id
          }));
          
          // Add to gallery groups
          groups[gallery.id] = {
            ...gallery,
            photos: galleryPhotos
          };
          
          // Add to all photos
          allPhotos.push(...galleryPhotos);
        }
      });
      
      setGalleryGroups(groups);
      setImages(allPhotos);
    }
  }, [event]);

  const loading = isLoadingEvent;
  const hasMore = false; // We load all data at once now

  // Reset images and page when event changes
  useEffect(() => {
    setImages([]);
    setPage(1);
  }, [event?.id]);

  // Infinite scroll observer
  const lastImageRef = useCallback(node => {
    if (loading || !hasMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setPage(prev => prev + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // Open lightbox with selected image
  const openLightbox = useCallback((index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  }, []);

  const handleGalleryClick = useCallback((gallery) => {
    if (gallery.slug) {
      navigate(`/gallery/${gallery.slug}`);
    } else {
      // Fallback to ID if slug is not available
      navigate(`/gallery/${gallery.id}`);
    }
  }, [navigate]);

  // Close lightbox
  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = 'auto';
  }, []);

  // Navigate to previous/next image in lightbox
  const navigateImage = useCallback((direction) => {
    setCurrentImageIndex(prev => {
      const newIndex = prev + direction;
      if (newIndex < 0) return images.length - 1;
      if (newIndex >= images.length) return 0;
      return newIndex;
    });
  }, [images.length]);

  // Handle keyboard navigation in lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          navigateImage(-1);
          break;
        case 'ArrowRight':
          navigateImage(1);
          break;
        case 'f':
          toggleFullscreen();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, navigateImage, closeLightbox]);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      lightboxRef.current?.requestFullscreen?.().catch(err => {
        console.error('Error enabling fullscreen:', err);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  // Toggle image selection
  const toggleImageSelection = useCallback((e, imageId) => {
    e.stopPropagation();
    setSelectedImages(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(imageId)) {
        newSelection.delete(imageId);
      } else {
        newSelection.add(imageId);
      }
      return newSelection;
    });
  }, []);

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    console.log('Added to cart:', Array.from(selectedImages));
    alert(`${selectedImages.size} images added to cart!`);
    setSelectedImages(new Set());
  }, [selectedImages]);

  // Lightbox component
  const Lightbox = useCallback(() => {
    if (!lightboxOpen) return null;

    return (
      <div 
        ref={lightboxRef}
        className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
        onClick={closeLightbox}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            closeLightbox();
          }}
          className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 transition-colors"
          aria-label="Close lightbox"
        >
          <FaTimes />
        </button>
        <div className="relative w-full h-full max-w-6xl flex items-center">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigateImage(-1);
            }}
            className="absolute left-4 p-2 text-white text-2xl hover:bg-black/30 rounded-full transition-colors"
            aria-label="Previous image"
          >
            <FaChevronLeft />
          </button>
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="max-h-full max-w-full">
              <img 
                src={images[currentImageIndex]?.url || ''} 
                alt={`Event image ${currentImageIndex + 1}`}
                className="max-h-[90vh] max-w-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <div className="text-white text-center mt-2">
                {currentImageIndex + 1} / {images.length}
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigateImage(1);
            }}
            className="absolute right-4 p-2 text-white text-2xl hover:bg-black/30 rounded-full transition-colors"
            aria-label="Next image"
          >
            <FaChevronRight />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="absolute bottom-4 right-4 p-2 text-white text-xl hover:bg-black/30 rounded-full transition-colors"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>
    );
  }, [lightboxOpen, currentImageIndex, images, closeLightbox, navigateImage, toggleFullscreen, isFullscreen]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <FaArrowLeft className="mr-2" /> Back to Events
          </button>
          
          <div className="flex items-center justify-center py-12">
            <FaSpinner className="animate-spin text-4xl text-blue-500 mr-3" />
            <span className="text-lg">Loading event...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (eventError) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <FaArrowLeft className="mr-2" /> Back to Events
          </button>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Event</h2>
            <p className="text-gray-600 mb-6">We couldn't load the event. Please try again later.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching event data
  if (isLoadingEvent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  // Show error state if event failed to load
  if (eventError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Error Loading Event</h2>
          <p className="text-gray-600 mb-6">We couldn't load the event. Please try again later.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Ensure we have event data before rendering
  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading event data...</p>
        </div>
      </div>
    );
  }

  // Check if we have any galleries
  const hasGalleries = Object.keys(galleryGroups).length > 0;
  const allPhotos = Object.values(galleryGroups).reduce((acc, gallery) => {
    return [...acc, ...(gallery.photos || [])];
  }, []);
  
  // Loading state for the entire component
  const isLoading = isLoadingEvent || (hasGalleries && allPhotos.length === 0);
  
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <FaArrowLeft className="mr-2" /> Back to Events
        </button>
        
        {/* Event Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-8">
          <div className="md:flex">
            <div className="md:w-1/2">
              {event?.cover_image?.image ? (
                <img 
                  src={getProtectedImageUrl(event.cover_image.image)} 
                  alt={event.name || 'Event cover'}
                  className="w-full h-64 md:h-auto object-cover"
                  onError={(e) => {
                    e.target.onerror = null; 
                    e.target.src = 'https://via.placeholder.com/800x600?text=No+Image+Available';
                  }}
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">No cover image available</span>
                </div>
              )}
            </div>
            <div className="p-6 md:w-1/2">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
              {event.date && (
                <p className="text-gray-600 mb-4">
                  {new Date(event.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              )}
              {event.location && (
                <p className="text-gray-600 mb-4">{event.location}</p>
              )}
              {event.description && (
                <div className="prose max-w-none text-gray-600">
                  {event.description}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Galleries</h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <FaSpinner className="animate-spin text-blue-500 mr-2" />
              <span>Loading galleries...</span>
            </div>
          ) : Object.values(galleryGroups).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(galleryGroups).map(gallery => (
                <div 
                  key={gallery.id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/gallery/${gallery.slug || gallery.id}`)}
                >
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{gallery.title || 'Untitled Gallery'}</h3>
                    {gallery.description && (
                      <p className="text-gray-600 mb-4">{gallery.description}</p>
                    )}
                    
                    {gallery.photos && gallery.photos.length > 0 ? (
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {gallery.photos.slice(0, 4).map((photo, index) => (
                          <div key={photo.id || index} className="aspect-square overflow-hidden">
                            <img 
                              src={getProtectedImageUrl(photo.image, 300)} 
                              alt={photo.caption || `Photo ${index + 1}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                        No photos in this gallery
                      </div>
                    )}
                    
                    <button 
                      onClick={() => handleGalleryClick(gallery)}
                      className="w-full bg-primary-500 text-white py-2 px-4 rounded hover:bg-primary-600 transition-colors"
                    >
                      View Gallery ({gallery.photos?.length || 0} photos)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 text-gray-500">
              No galleries found for this event.
            </div>
          )}
        </div>

        {/* All Photos Section */}
        {allPhotos.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">All Photos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {allPhotos.map((photo, index) => (
                <div 
                  key={photo.id || index}
                  className="aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  ref={index === allPhotos.length - 1 ? lastImageRef : null}
                  onClick={() => openLightbox(index)}
                >
                  <img 
                    src={getProtectedImageUrl(photo.image, 300)} 
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover hover:opacity-90 transition-opacity cursor-pointer"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                    }}
                  />
                </div>
              ))}
            </div>
            {loading && (
              <div className="flex justify-center mt-8">
                <FaSpinner className="animate-spin text-2xl text-blue-500 mr-2" />
                <span>Loading photos...</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Lightbox */}
      <Lightbox />
      
      {/* Selection Actions */}
      {selectedImages.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg py-4 px-6 flex justify-between items-center">
          <div className="text-gray-700">
            {selectedImages.size} {selectedImages.size === 1 ? 'photo' : 'photos'} selected
          </div>
          <div className="space-x-4">
            <button 
              onClick={() => setSelectedImages(new Set())}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddToCart}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
            >
              <FaShoppingCart className="mr-2" />
              Add to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetail;
