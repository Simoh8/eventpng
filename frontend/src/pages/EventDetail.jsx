import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaCheck, 
  FaShoppingCart, 
  FaTimes, 
  FaChevronLeft, 
  FaChevronRight, 
  FaExpand, 
  FaCompress, 
  FaSpinner, 
  FaLock,
  FaChevronCircleLeft,
  FaChevronCircleRight
} from 'react-icons/fa';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import EventPinModal from '../components/EventPinModal';

// Helper function to get protected image URL
const getProtectedImageUrl = (imageUrl, width = 800) => {
  if (!imageUrl) {
    return null;
  }
  // If the URL is already absolute, return it as is
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  // Otherwise, construct the full URL
  const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const fullUrl = `${baseUrl}${imageUrl}${imageUrl.includes('?') ? '&' : '?'}w=${width}`;
  return fullUrl;
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const fetchEvent = async (slug) => {
  // First get the event ID from the slug
  const eventsResponse = await axios.get(`${API_URL}/api/gallery/public/events/`);
  const events = Array.isArray(eventsResponse.data) ? eventsResponse.data : eventsResponse.data.results || [];
  const event = events.find(event => event.slug === slug);
  
  if (!event) {
    throw new Error(`Event with slug '${slug}' not found`);
  }
  
  const eventDetailResponse = await axios.get(`${API_URL}/api/gallery/public/events/${event.id}/`);
  
  if (!eventDetailResponse.data) {
    throw new Error('Event details not found');
  }
  
  const eventData = eventDetailResponse.data;
  
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
  // Router hooks
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Fetch event details first
  const { data: event, isLoading: isLoadingEvent, error: eventError } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => fetchEvent(slug),
    retry: false,
    onSuccess: (data) => {
      if (data.requires_pin && !data.is_verified) {
        setRequiresPin(true);
        setShowPinModal(true);
      }
    }
  });
  
  // State management
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryGroups, setGalleryGroups] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [requiresPin, setRequiresPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [currentSlides, setCurrentSlides] = useState({});
  
  // Refs
  const lightboxRef = useRef();
  const observer = useRef();
  
  // Initialize images state when event data is loaded
  useEffect(() => {
    if (event?.photos?.results) {
      setImages(event.photos.results);
    }
  }, [event]);
  
  // Define closeLightbox first as it has no dependencies
  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    document.body.style.overflow = 'auto';
  }, []);
  
  // Define toggleFullscreen next as it only depends on lightboxRef
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
  
  // Define navigateImage after images is set
  const navigateImage = useCallback((direction) => {
    setCurrentImageIndex(prev => {
      const newIndex = prev + direction;
      if (newIndex < 0) return images.length - 1;
      if (newIndex >= images.length) return 0;
      return newIndex;
    });
  }, [images.length]);
  
  // Define keyboard navigation effect after all its dependencies
  useEffect(() => {
    if (!lightboxOpen) return () => {};

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
  }, [lightboxOpen, navigateImage, closeLightbox, toggleFullscreen]);
  
  // Update loading and error states when query state changes
  useEffect(() => {
    setIsLoading(isLoadingEvent);
    if (eventError) {
      setErrorState(eventError);
    }
  }, [isLoadingEvent, eventError]);
  
  // Lightbox component
  const renderLightbox = useCallback(() => {
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
  }, [lightboxOpen, closeLightbox, navigateImage, images, currentImageIndex, toggleFullscreen, isFullscreen]);
  
  // Process event data when it's loaded
  useEffect(() => {
    if (event?.galleries) {
      const groups = {};
      const allPhotos = [];
      
      console.log('Event galleries:', event.galleries); // Debug log
      
      event.galleries.forEach(gallery => {
        if (gallery) {
          console.log('Processing gallery:', gallery.title, gallery); // Debug log
          const galleryPhotos = (gallery.photos || []).map(photo => {
            console.log('Processing photo:', photo); // Debug log
            return {
              ...photo,
              gallery_title: gallery.title,
              gallery_id: gallery.id
            };
          });
          
          groups[gallery.id] = {
            ...gallery,
            photos: galleryPhotos,
            currentIndex: 0 // Add current index for each gallery
          };
          
          allPhotos.push(...galleryPhotos);
        }
      });
      
      console.log('Processed gallery groups:', groups); // Debug log
      setGalleryGroups(groups);
      setImages(allPhotos);
    }
  }, [event]);
  
  // Auto-scroll effect for galleries
  useEffect(() => {
    if (Object.keys(galleryGroups).length === 0) return;
    
    const interval = setInterval(() => {
      setGalleryGroups(prevGroups => {
        const newGroups = { ...prevGroups };
        
        Object.keys(newGroups).forEach(galleryId => {
          const gallery = newGroups[galleryId];
          if (gallery.photos && gallery.photos.length > 1) {
            // Auto-advance to next image
            newGroups[galleryId] = {
              ...gallery,
              currentIndex: (gallery.currentIndex + 1) % gallery.photos.length
            };
            
            // Update the current slide for the transform effect
            setCurrentSlides(prev => ({
              ...prev,
              [galleryId]: newGroups[galleryId].currentIndex
            }));
          }
        });
        
        return newGroups;
      });
    }, 3000); // Change image every 3 seconds
    
    return () => clearInterval(interval);
  }, [galleryGroups]);
  
  // Reset images and page when event changes
  useEffect(() => {
    setImages([]);
    setPage(1);
  }, [event?.id]);
  
  // Event handlers
  const handlePinSuccess = useCallback(() => {
    queryClient.invalidateQueries(['event', slug]);
    setRequiresPin(false);
  }, [queryClient, slug]);
  
  const openLightbox = useCallback((index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  }, []);
  
  const handleGalleryClick = useCallback((gallery) => {
    if (gallery.slug) {
      navigate(`/gallery/${gallery.slug}`);
    } else {
      navigate(`/gallery/${gallery.id}`);
    }
  }, [navigate]);
  
  
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
  
  const handleAddToCart = useCallback(() => {
    console.log('Added to cart:', Array.from(selectedImages));
    alert(`${selectedImages.size} images added to cart!`);
    setSelectedImages(new Set());
  }, [selectedImages]);
  
  // Keyboard navigation effect
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
  }, [lightboxOpen, navigateImage, closeLightbox, toggleFullscreen]);
  
  // Update loading and error states when query state changes
  useEffect(() => {
    setIsLoading(isLoadingEvent);
    if (eventError) {
      setErrorState(eventError);
    }
  }, [isLoadingEvent, eventError]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (errorState) {
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

  // Show lock icon and message for private events that require PIN
  if (requiresPin && !event?.is_verified) {
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
            <div className="mb-4">
              <FaLock size={48} className="text-muted mb-3" />
              <h3>Private Event</h3>
              <p className="text-muted">This is a private event. Please enter the PIN to continue.</p>
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                onClick={() => setShowPinModal(true)}
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Enter PIN'}
              </button>
            </div>
          </div>
        </div>
        
        {/* PIN Verification Modal */}
        {event && (
          <EventPinModal
            show={showPinModal}
            onHide={() => setShowPinModal(false)}
            event={event}
            onSuccess={handlePinSuccess}
          />
        )}
      </div>
    );
  }

  // Loading state
  if (isLoadingEvent) {
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
            <FaSpinner className="animate-spin text-blue-500 mr-3" />
            <span className="text-lg">Loading event...</span>
          </div>
        </div>
      </div>
    );
  }

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
  const isPageLoading = isLoading || (hasGalleries && allPhotos.length === 0);
  
  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Back button and title */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <FaArrowLeft className="mr-2" /> Back to Events
          </button>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">{event.title}</h1>
        </div>

        {/* Event details */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Event Information</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Details about the event</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">

              {event.date && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Date</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(event.date).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {event.description && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {event.description}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Galleries */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900">Galleries</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Browse photos from the event</p>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            {Object.keys(galleryGroups).length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.values(galleryGroups).map((gallery) => (
                  <div
                    key={gallery.id}
                    className="group relative bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleGalleryClick(gallery)}
                  >
                    {gallery.photos && gallery.photos.length > 0 ? (
                      <div className="relative w-full h-48 overflow-hidden">
                        <div 
                          className="flex transition-transform duration-500 ease-in-out"
                          style={{ 
                            width: `${gallery.photos.length * 100}%`,
                            transform: `translateX(-${(gallery.currentIndex || 0) * (100 / gallery.photos.length)}%)` 
                          }}
                        >
                          {gallery.photos.map((photo, index) => {
                            const imageUrl = getProtectedImageUrl(photo.url || photo.image || photo.original || '', 600);
                            
                            return (
                              <div 
                                key={index} 
                                className="w-full flex-shrink-0"
                                style={{ width: `${100 / gallery.photos.length}%` }}
                              >
                                {imageUrl ? (
                                  <img
                                    src={imageUrl}
                                    alt={`Slide ${index + 1}`}
                                    className="w-full h-48 object-cover"
                                    onError={(e) => {
                                      console.error('Error loading image:', e.target.src);
                                      e.target.onerror = null;
                                      e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                                    }}
                                    onLoad={() => console.log('Image loaded successfully:', imageUrl)}
                                  />
                                ) : (
                                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-400">No image available</span>
                                    <div className="hidden">
                                      Photo data: {JSON.stringify(photo)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {gallery.photos.length > 1 && (
                          <>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const newIndex = gallery.currentIndex === 0 
                                  ? gallery.photos.length - 1 
                                  : gallery.currentIndex - 1;
                                
                                setGalleryGroups(prev => ({
                                  ...prev,
                                  [gallery.id]: {
                                    ...gallery,
                                    currentIndex: newIndex
                                  }
                                }));
                              }}
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
                              aria-label="Previous image"
                            >
                              <FaChevronLeft />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const newIndex = (gallery.currentIndex + 1) % gallery.photos.length;
                                
                                setGalleryGroups(prev => ({
                                  ...prev,
                                  [gallery.id]: {
                                    ...gallery,
                                    currentIndex: newIndex
                                  }
                                }));
                              }}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
                              aria-label="Next image"
                            >
                              <FaChevronRight />
                            </button>
                            
                            {/* Dots indicator */}
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
                              {gallery.photos.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setGalleryGroups(prev => ({
                                      ...prev,
                                      [gallery.id]: {
                                        ...gallery,
                                        currentIndex: index
                                      }
                                    }));
                                  }}
                                  className={`w-2 h-2 rounded-full transition-all ${
                                    index === gallery.currentIndex 
                                      ? 'bg-white w-4' 
                                      : 'bg-white bg-opacity-50 w-2'
                                  }`}
                                  aria-label={`Go to slide ${index + 1}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No photos available</span>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-medium text-gray-900">{gallery.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {gallery.photos?.length || 0} photos
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No galleries found for this event.</p>
              </div>
            )}
          </div>
        </div>

        {/* All Photos Section */}
        {images.length > 0 && (
          <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">All Photos</h2>
              {selectedImages.size > 0 && (
                <div className="space-x-2">
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
                    Add to Cart ({selectedImages.size})
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((photo, index) => (
                <div 
                  key={photo.id || index}
                  className={`aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow relative ${
                    selectedImages.has(photo.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
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
                  <div 
                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleImageSelection(photo.id);
                    }}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedImages.has(photo.id) 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'border-gray-300 bg-white'
                    }`}>
                      {selectedImages.has(photo.id) && <FaCheck className="text-white text-xs" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {renderLightbox()}

      {/* PIN Verification Modal */}
      {showPinModal && event && (
        <EventPinModal
          show={showPinModal}
          onHide={() => setShowPinModal(false)}
          event={event}
          onSuccess={handlePinSuccess}
        />
      )}
    </div>
  );
};

export default EventDetail;
