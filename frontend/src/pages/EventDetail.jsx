import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  FaArrowLeft, 
  FaCheck, 
  FaShoppingCart, 
  FaTicketAlt,
  FaTimes, 
  FaChevronLeft, 
  FaChevronRight, 
  FaExpand, 
  FaCompress, 
  FaSpinner, 
  FaLock,
  FaImages,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaHeart,
  FaShare,
  FaInfoCircle,
  FaArrowRight
} from 'react-icons/fa';
import { LazyLoadImage } from 'react-lazy-load-image-component';
import 'react-lazy-load-image-component/src/effects/opacity.css';
import axios from 'axios';
import { makeRequest } from '../utils/apiUtils';
import { API_BASE_URL, API_ENDPOINTS } from '../config';
import NotFoundPage from './NotFoundPage';

// Cache configuration
const CACHE_CONFIG = {
  EVENT_CACHE_KEY: 'event_cache',
  CACHE_DURATION: 60 * 60 * 1000, // 1 hour in milliseconds
  MAX_CACHE_ITEMS: 20 // Maximum number of events to cache
};

// Cache utility functions
const getEventCache = () => {
  try {
    const cache = localStorage.getItem(CACHE_CONFIG.EVENT_CACHE_KEY);
    return cache ? JSON.parse(cache) : {};
  } catch (error) {
    return {};
  }
};

const setEventCache = (cache) => {
  try {
    localStorage.setItem(CACHE_CONFIG.EVENT_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    // If storage is full, try to clean up old items
    cleanupCache();
  }
};

const cleanupCache = () => {
  try {
    const cache = getEventCache();
    const now = Date.now();
    const validEntries = {};
    let count = 0;
    
    // Keep only valid entries and limit total count
    Object.entries(cache).forEach(([key, value]) => {
      if (now - value.timestamp < CACHE_CONFIG.CACHE_DURATION && count < CACHE_CONFIG.MAX_CACHE_ITEMS) {
        validEntries[key] = value;
        count++;
      }
    });
    
    setEventCache(validEntries);
  } catch (error) {
  }
};

const getCachedEvent = (slug) => {
  const cache = getEventCache();
  const cached = cache[slug];
  
  if (cached && Date.now() - cached.timestamp < CACHE_CONFIG.CACHE_DURATION) {
    return cached.data;
  }
  
  return null;
};

const setCachedEvent = (slug, data) => {
  const cache = getEventCache();
  
  // Clean up before adding new item if we're approaching the limit
  if (Object.keys(cache).length >= CACHE_CONFIG.MAX_CACHE_ITEMS) {
    cleanupCache();
  }
  
  cache[slug] = {
    data,
    timestamp: Date.now()
  };
  
  setEventCache(cache);
};

const clearCachedEvent = (slug) => {
  const cache = getEventCache();
  delete cache[slug];
  setEventCache(cache);
};

const getProtectedImageUrl = (imageUrl, width = 800) => {
  if (!imageUrl) {
    return null;
  }
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  const fullUrl = `${API_BASE_URL}${imageUrl}${imageUrl.includes('?') ? '&' : '?'}w=${width}`;
  return fullUrl;
};

const fetchEvent = async (slug) => {
  try {
    // Check cache first
    const cachedEvent = getCachedEvent(slug);
    if (cachedEvent) {
      return cachedEvent;
    }

    try {
      const isVerified = sessionStorage.getItem(`event_${slug}_verified`) === 'true';
      
      const eventDetailResponse = await makeRequest(() => 
        axios.get(`${API_BASE_URL}api/gallery/public/events/slug/${slug}/`, {
          withCredentials: true
        })
      );
      
      if (eventDetailResponse.data) {
        const processedData = processEventData(eventDetailResponse.data);
        // Cache the successful response
        setCachedEvent(slug, processedData);
        return processedData;
      }
    } catch (error) {
      // If 404 and we have a numeric slug, try by ID
      if (error.response?.status === 404 && !isNaN(slug)) {
        try {
          const eventDetailResponse = await makeRequest(() => 
            axios.get(`${API_BASE_URL}api/gallery/public/events/${slug}/`, {
              withCredentials: true
            })
          );
          
          if (eventDetailResponse.data) {
            const processedData = processEventData(eventDetailResponse.data);
            // Cache the successful response
            setCachedEvent(slug, processedData);
            return processedData;
          }
        } catch (idError) {
          // Re-throw the slug error to be handled by the outer catch
          throw error;
        }
      } else {
        // Re-throw the error if it's not a 404 or slug is not numeric
        throw error;
      }
    }
    
    throw new Error(`Event '${slug}' not found`);
    
  } catch (error) {
    throw new Error(`Failed to load event: ${error.message}`);
  }
};

const processEventData = (eventData) => {
  console.log('Raw event data from API:', JSON.parse(JSON.stringify(eventData)));
  
  const allPhotos = [];
  
  if (eventData.galleries && Array.isArray(eventData.galleries)) {
    eventData.galleries.forEach(gallery => {
      if (gallery.photos && Array.isArray(gallery.photos)) {
        gallery.photos.forEach(photo => {
          allPhotos.push({
            ...photo,
            gallery_title: gallery.title,
            gallery_id: gallery.id,
            gallery_slug: gallery.slug
          });
        });
      }
    });
  }
  
  // Ensure has_tickets is a boolean
  const hasTickets = Boolean(eventData.has_tickets);
  
  const processedData = {
    ...eventData,
    has_tickets: hasTickets, // Ensure it's a boolean
    photos: {
      results: allPhotos,
      count: allPhotos.length,
      next: null,
      previous: null
    }
  };
  
  console.log('Processed event data:', JSON.parse(JSON.stringify(processedData)));
  return processedData;
};

const EventDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState(null);
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [galleryGroups, setGalleryGroups] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentSlides, setCurrentSlides] = useState({});
  
  // Fetch event details
  const { 
    data: event, 
    isLoading: isLoadingEvent, 
    error: eventError, 
    refetch 
  } = useQuery({
    queryKey: ['event', slug],
    queryFn: () => fetchEvent(slug),
    enabled: !!slug,
    retry: false,
    staleTime: 30 * 60 * 1000, // 30 minutes - consider data fresh for this long
    cacheTime: 60 * 60 * 1000, // 1 hour - keep in cache for this long
    onSuccess: (data) => {
      console.log('Event data loaded successfully:', {
        eventId: data?.id,
        eventName: data?.name,
        has_tickets: data?.has_tickets,
        raw_has_tickets: data?.has_tickets
      });
    },
    onError: (error) => {
      console.error('Error loading event:', error);
      setErrorState(error);
      // Clear cache if there's an error to force refetch next time
      clearCachedEvent(slug);
    },
    onSettled: () => {
      setIsLoading(false);
    }
  });

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
  
  // Update error state when query state changes
  useEffect(() => {
    if (eventError) {
      setErrorState(eventError);
    }
  }, [eventError]);
  
  // Lightbox component
  const renderLightbox = useCallback(() => {
    if (!lightboxOpen) return null;

    return (
      <div 
        ref={lightboxRef}
        className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
        onClick={closeLightbox}
      >
        <button 
          onClick={(e) => {
            e.stopPropagation();
            closeLightbox();
          }}
          className="absolute top-6 right-6 text-white text-2xl hover:text-gray-300 transition-colors z-10 bg-black/50 rounded-full p-2"
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
            className="absolute left-6 p-3 text-white text-2xl hover:bg-black/30 rounded-full transition-all z-10 bg-black/50 backdrop-blur-sm"
            aria-label="Previous image"
          >
            <FaChevronLeft />
          </button>
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="max-h-full max-w-full">
              <LazyLoadImage 
                src={images[currentImageIndex]?.url || ''} 
                alt={`Event image ${currentImageIndex + 1}`}
                className="max-h-[90vh] max-w-full object-contain rounded-lg shadow-xl"
                onClick={(e) => e.stopPropagation()}
                effect="opacity"
              />
              <div className="text-white text-center mt-4 text-sm bg-black/50 backdrop-blur-sm rounded-full px-4 py-2 inline-block">
                {currentImageIndex + 1} / {images.length}
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigateImage(1);
            }}
            className="absolute right-6 p-3 text-white text-2xl hover:bg-black/30 rounded-full transition-all z-10 bg-black/50 backdrop-blur-sm"
            aria-label="Next image"
          >
            <FaChevronRight />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="absolute bottom-6 right-6 p-3 text-white text-xl hover:bg-black/30 rounded-full transition-all z-10 bg-black/50 backdrop-blur-sm"
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
      
      
      event.galleries.forEach(gallery => {
        if (gallery) {
          const galleryPhotos = (gallery.photos || []).map(photo => {
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
    }, 5000); // Change image every 5 seconds
    
    return () => clearInterval(interval);
  }, [galleryGroups]);
  
  // Reset images and page when event changes
  useEffect(() => {
    setImages([]);
    setPage(1);
  }, [event?.id]);
  
  // Event handlers
  const openLightbox = useCallback((index) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = 'hidden';
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
    if (eventError) {
      setErrorState(eventError);
    }
  }, [eventError]);

  // Loading state
  if (isLoadingEvent || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors font-medium"
          >
            <FaArrowLeft className="mr-2" /> Back to Events
          </button>
          
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <FaSpinner className="animate-spin text-blue-500 text-4xl mx-auto mb-4" />
              <span className="text-lg text-gray-600">Loading event details...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (eventError || errorState) {
    const error = eventError || errorState;
  
    // If the error indicates "not found", render the NotFoundPage
    if (error.message?.includes("Request failed ") || error.response?.status === 404) {
      return <NotFoundPage />;
    }
  
    // Otherwise, show the normal error card
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors font-medium"
          >
            <FaArrowLeft className="mr-2" /> Back to Events
          </button>
  
          <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaTimes className="text-red-500 text-2xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Error Loading Event</h2>
            <p className="text-gray-600 mb-6">
              {error?.message || 'We couldn\'t load the event. Please try again later.'}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  

  // Ensure we have event data before rendering
  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Back button and title */}
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-800 transition-colors font-medium mb-4"
          >
            <FaArrowLeft className="mr-2" /> Back to Events
          </button>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h1 className="text-4xl font-bold text-gray-900">{event.title}</h1>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <FaHeart className="text-gray-500" />
                <span>Save</span>
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <FaShare className="text-gray-500" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Event details */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-10 border border-gray-200">
          <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <FaInfoCircle className="text-blue-500" />
              Event Information
            </h2>
          </div>
          <div className="px-6 py-5">
            <dl className="space-y-4">

              {event.date && (
                <div className="flex flex-col sm:flex-row">
                  <dt className="text-sm font-medium text-gray-500 flex items-center gap-2 sm:w-1/4">
                    <FaCalendarAlt className="text-blue-400" />
                    Date
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:w-3/4">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </dd>
                </div>
              )}
              {event.location && (
                <div className="flex flex-col sm:flex-row">
                  <dt className="text-sm font-medium text-gray-500 flex items-center gap-2 sm:w-1/4">
                    <FaMapMarkerAlt className="text-red-400" />
                    Location
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:w-3/4">
                    {event.location}
                  </dd>
                </div>
              )}
              {console.log('Rendering Buy Tickets section - has_tickets:', event?.has_tickets, 'for event:', event?.name) || 
              event.has_tickets && (
                <div className="flex flex-col sm:flex-row">
                  <dt className="text-sm font-medium text-gray-500 flex items-center gap-2 sm:w-1/4">
                    <FaTicketAlt className="text-green-500" />
                    Tickets
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:w-3/4">
                    <Link 
                      to="/tickets" 
                      state={{ eventId: event.id }}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                    >
                      Buy Tickets <FaArrowRight className="ml-2" />
                    </Link>
                    <p className="mt-2 text-sm text-gray-500">
                      Secure your spot at this event
                    </p>
                  </dd>
                </div>
              )}
              {event.description && (
                <div className="flex flex-col sm:flex-row">
                  <dt className="text-sm font-medium text-gray-500 sm:w-1/4">
                    Description
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:w-3/4">
                    {event.description}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Galleries */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden mb-10 border border-gray-200">
          <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <FaImages className="text-purple-500" />
              Galleries
            </h2>
            <p className="mt-1 text-sm text-gray-600">Browse photos from the event</p>
          </div>
          <div className="p-6">
            {Object.keys(galleryGroups).length > 0 ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Object.values(galleryGroups).map((gallery) => (
                  <div
                    key={gallery.id}
                    className="group relative bg-white rounded-xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200"
                    onClick={() => handleGalleryClick(gallery)}
                  >
                    {gallery.photos && gallery.photos.length > 0 ? (
                      <div className="relative w-full h-56 overflow-hidden bg-gray-900">
                        <div 
                          className="flex transition-transform duration-500 ease-in-out h-full"
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
                                className="w-full flex-shrink-0 flex items-center justify-center"
                                style={{ width: `${100 / gallery.photos.length}%` }}
                              >
                                {imageUrl ? (
                                  <LazyLoadImage
                                    src={imageUrl}
                                    alt={`Slide ${index + 1}`}
                                    className="max-w-full max-h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    effect="opacity"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-800 flex items-center justify-center">
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
                              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-all z-10 backdrop-blur-sm"
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
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition-all z-10 backdrop-blur-sm"
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
                                      : 'bg-white/60 w-2'
                                  }`}
                                  aria-label={`Go to slide ${index + 1}`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
                      </div>
                    ) : (
                      <div className="w-full h-56 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400">No photos available</span>
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{gallery.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-sm text-gray-500">
                          {gallery.photos?.length || 0} photos
                        </p>
                        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                          View Gallery
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaImages className="text-gray-400 text-xl" />
                </div>
                <p className="text-gray-500">No galleries found for this event.</p>
              </div>
            )}
          </div>
        </div>

        {/* All Photos Section */}
        {images.length > 0 && (
          <div className="mt-12">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
              <h2 className="text-2xl font-bold text-gray-900">All Photos</h2>
              {selectedImages.size > 0 && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedImages(new Set())}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddToCart}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <FaShoppingCart />
                    Add to Cart ({selectedImages.size})
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {images.map((photo, index) => (
                <div 
                  key={photo.id || index}
                  className={`aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative group ${
                    selectedImages.has(photo.id) ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                  }`}
                  onClick={() => openLightbox(index)}
                >
                  <img 
                    src={getProtectedImageUrl(photo.image, 300)} 
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                    }}
                  />
                  <div 
                    className="absolute top-2 right-2 p-1 bg-white/80 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleImageSelection(e, photo.id);
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
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300"></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {renderLightbox()}
    </div>
  );
};

export default EventDetail;