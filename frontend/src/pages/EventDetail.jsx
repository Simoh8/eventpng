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
  const response = await axios.get(`${API_URL}/api/gallery/public/events/`);
  // The API returns an array of events directly
  const events = Array.isArray(response.data) ? response.data : response.data.results || [];
  const event = events.find(event => event.slug === slug);
  
  if (!event) {
    throw new Error(`Event with slug '${slug}' not found`);
  }
  return event;
};

// Helper function to fetch event images
const fetchEventImages = async (event, page = 1) => {
  if (!event?.id) {
    throw new Error('No event ID provided');
  }

  try {
    const eventResponse = await axios.get(`${API_URL}/api/gallery/public/events/${event.id}/`);
    
    if (!eventResponse.data) {
      throw new Error('Event not found');
    }
    
    // Get all public galleries for this event
    const galleriesResponse = await axios.get(`${API_URL}/api/gallery/public/galleries/`, {
      params: { event: event.id, page, page_size: 12 }
    });
    
    const galleries = galleriesResponse.data?.results || [];
    
    // For each gallery, fetch its photos
    const galleryPhotos = await Promise.all(
      galleries.map(async (gallery) => {
        try {
          const photosResponse = await axios.get(`${API_URL}/api/gallery/public/galleries/${gallery.id}/photos/`);
          // Add gallery info to each photo
          return (photosResponse.data || []).map(photo => ({
            ...photo,
            gallery_title: gallery.title,
            gallery_id: gallery.id
          }));
        } catch (error) {
          console.error(`Error fetching photos for gallery ${gallery.id}:`, error);
          return [];
        }
      })
    );
    
    // Flatten the array of arrays into a single array of photos
    const allPhotos = galleryPhotos.flat();
    
    // Return the data in the format expected by the component
    return {
      results: allPhotos,
      count: allPhotos.length,
      next: galleriesResponse.data.next,
      previous: galleriesResponse.data.previous
    };
  } catch (error) {
    console.error('Error fetching event images:', error);
    return { results: [], count: 0, next: null, previous: null };
  }
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

  // Fetch event galleries
  const {
    data: galleriesData,
    isLoading: isLoadingGalleries,
    error: galleriesError,
  } = useQuery({
    queryKey: ['eventGalleries', event?.id],
    queryFn: async () => {
      if (!event?.id) {
        throw new Error('No event ID available');
      }
      try {
        const response = await axios.get(`${API_URL}/api/gallery/public/galleries/`, {
          params: { 
            event: event.id,
            page_size: 100 // Get all galleries for this event
          }
        });
        // Handle both array and paginated responses
        return Array.isArray(response.data) ? response.data : (response.data.results || []);
      } catch (error) {
        console.error('Error fetching galleries:', error);
        throw error;
      }
    },
    enabled: !!event?.id, // Only run the query if we have a valid event
  });

  // Update gallery groups when galleries are loaded
  useEffect(() => {
    if (galleriesData && galleriesData.length > 0) {
      // Initialize gallery groups with empty photo arrays
      const groups = {};
      galleriesData.forEach(gallery => {
        if (gallery) {
          groups[gallery.id] = {
            ...gallery,
            photos: gallery.photos || []
          };
        }
      });
      setGalleryGroups(groups);
      
      // Fetch photos for each gallery
      const fetchGalleryPhotos = async () => {
        for (const gallery of galleriesData) {
          if (gallery) {
            try {
              const response = await axios.get(`${API_URL}/api/gallery/public/galleries/${gallery.id}/photos/`);
              const photos = Array.isArray(response.data) ? response.data : (response.data.results || []);
              
              setGalleryGroups(prev => ({
                ...prev,
                [gallery.id]: {
                  ...prev[gallery.id],
                  photos: photos
                }
              }));
            } catch (err) {
              console.error(`Error fetching photos for gallery ${gallery.id}:`, err);
            }
          }
        }
      };
      
      fetchGalleryPhotos();
    }
  }, [galleriesData]);

  // Flatten all photos from all galleries for the lightbox
  useEffect(() => {
    const allPhotos = Object.values(galleryGroups).reduce((acc, gallery) => {
      return [...acc, ...gallery.photos];
    }, []);
    setImages(allPhotos);
  }, [galleryGroups]);

  // Fetch event images with pagination
  const { 
    data: imagesData, 
    isLoading: isLoadingImages,
    isFetching: isFetchingImages,
    isError: isImagesError
  } = useQuery({
    queryKey: ['eventImages', event?.id, page],
    queryFn: () => fetchEventImages(event, page),
    enabled: !!event?.id,
    keepPreviousData: true,
    onSuccess: (data) => {
      setImages(prev => [...prev, ...data.results]);
    }
  });

  const loading = isLoadingEvent || isLoadingImages;
  const hasMore = imagesData?.next !== null;

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
  if (isLoadingEvent || isLoadingGalleries) {
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
  if (eventError || galleriesError) {
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
  
  const isLoadingPhotos = hasGalleries && allPhotos.length === 0;
  
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
          {isLoadingGalleries ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : galleriesError ? (
            <div className="text-center p-8 text-red-500">
              Error loading galleries: {galleriesError.message}
            </div>
          ) : Object.values(galleryGroups).length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.values(galleryGroups).map(gallery => (
                <div key={gallery.id} className="bg-white rounded-lg shadow-md overflow-hidden">
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
                      View Gallery ({gallery.total_photos || 0} photos)
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
            {isLoadingImages && (
              <div className="flex justify-center mt-8">
                <FaSpinner className="animate-spin text-2xl text-blue-500 mr-2" />
                <span>Loading more photos...</span>
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
