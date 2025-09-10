import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaCheck, FaShoppingCart, FaTimes, FaChevronLeft, FaChevronRight, FaExpand, FaCompress, FaSpinner } from 'react-icons/fa';
import { getProtectedImageUrl } from '../utils/imageUtils';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Helper function to fetch event details
const fetchEvent = async (id) => {
  const { data } = await axios.get(`${API_URL}/gallery/public/events/${id}/`);
  return data;
};

// Helper function to fetch event images
const fetchEventImages = async (eventId, page = 1) => {
  const { data } = await axios.get(`${API_URL}/gallery/events/${eventId}/images/`, {
    params: { page, page_size: 12 }
  });
  return data;
};

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedImages, setSelectedImages] = useState(new Set());
  const [images, setImages] = useState([]);
  const [page, setPage] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lightboxRef = useRef();
  const observer = useRef();

  // Parse the ID to ensure it's a number
  const eventId = parseInt(id, 10);
  
  // Fetch event data
  const { 
    data: event, 
    isLoading: isLoadingEvent, 
    isError: isEventError 
  } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => fetchEvent(eventId),
    enabled: !!eventId,
    onError: () => {
      navigate('/events', { replace: true });
    }
  });

  // Fetch event images with pagination
  const { 
    data: imagesData, 
    isFetching: isLoadingImages,
    isError: isImagesError
  } = useQuery({
    queryKey: ['eventImages', eventId, page],
    queryFn: () => fetchEventImages(eventId, page),
    enabled: !!eventId,
    keepPreviousData: true,
    onSuccess: (data) => {
      setImages(prev => [...prev, ...data.results]);
    }
  });

  const loading = isLoadingEvent || isLoadingImages;
  const hasMore = imagesData?.next !== null;

  // Reset images when event changes
  useEffect(() => {
    setImages([]);
    setPage(1);
  }, [eventId]);

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
    document.body.style.overflow = 'hidden';
  }, []);

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

  if (isEventError || isImagesError) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Error loading event</h2>
            <button
              onClick={() => navigate('/events')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingEvent) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-center items-center h-64">
          <FaSpinner className="animate-spin h-12 w-12 text-primary-600" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Event not found</h2>
            <button
              onClick={() => navigate('/events')}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Back to Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors"
          >
            <FaArrowLeft className="mr-2" /> Back to Events
          </button>
          
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2">
                <img 
                  src={getProtectedImageUrl(event.cover_image?.image || '')} 
                  alt={event.name}
                  className="w-full h-64 md:h-auto object-cover cursor-pointer"
                  onClick={() => openLightbox(0)}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/800x600?text=No+Image';
                  }}
                />
              </div>
              <div className="p-6 md:w-1/2">
                <div className="flex items-center mb-4">
                  {event.category && (
                    <span className="inline-block bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full font-semibold">
                      {event.category}
                    </span>
                  )}
                  <span className="ml-2 text-sm text-gray-600">
                    {new Date(event.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
                <div className="flex items-center text-gray-600 mb-4">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {event.location}
                </div>
                {event.description && <p className="text-gray-700 mb-6">{event.description}</p>}
                <div className="flex items-center justify-between">
                  {event.price && (
                    <span className="text-2xl font-bold text-gray-900">
                      ${parseFloat(event.price).toFixed(2)}
                    </span>
                  )}
                  <button className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-6 rounded-lg flex items-center transition-colors">
                    <FaShoppingCart className="mr-2" /> Add to Cart
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Event Gallery</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((image, index) => {
                const isLastImage = index === images.length - 1;
                return (
                  <div 
                    key={image.id}
                    ref={isLastImage ? lastImageRef : null}
                    className={`group relative aspect-square overflow-hidden rounded-lg cursor-pointer transform transition-all duration-300 hover:scale-105 ${
                      selectedImages.has(image.id) ? 'ring-4 ring-primary-500' : 'ring-1 ring-gray-200 hover:ring-2 hover:ring-primary-400'
                    }`}
                    onClick={() => openLightbox(index + 1)}
                  >
                    <img 
                      src={getProtectedImageUrl(image.image)} 
                      alt={image.title || `Event image ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
                      }}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                        <FaExpand className="text-white text-xl drop-shadow-lg" />
                      </div>
                    </div>
                    {selectedImages.has(image.id) && (
                      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                        <div className="bg-primary-600 rounded-full p-1">
                          <FaCheck className="text-white" />
                        </div>
                      </div>
                    )}
                    {image.is_featured && (
                      <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-semibold px-2 py-1 rounded">
                        Featured
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            {loading && (
              <div className="flex justify-center my-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
              </div>
            )}
            {!loading && images.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No additional images found for this event.
              </div>
            )}
          </div>
        </div>
      </div>

      <Lightbox />

      {selectedImages.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="text-gray-700">
              {selectedImages.size} {selectedImages.size === 1 ? 'image' : 'images'} selected
            </div>
            <div className="space-x-3">
              <button
                onClick={() => setSelectedImages(new Set())}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={handleAddToCart}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center"
              >
                <FaShoppingCart className="mr-2" />
                Add to Cart ({selectedImages.size})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventDetail;
