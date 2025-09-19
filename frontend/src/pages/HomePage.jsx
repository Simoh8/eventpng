import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API from '../config'; // default import
import PinModal from '../components/modals/PinModal';
import React from "react";

import { makeRequest } from '../utils/apiUtils';
import { API_ENDPOINTS } from '../config';
import EventCard from '../components/events/EventCard';
import { 
  MagnifyingGlassIcon as SearchIcon,
  FunnelIcon as FilterIcon,
  CalendarIcon,
  LockClosedIcon,
  ArrowRightIcon,
  PhotoIcon,
  RectangleGroupIcon,
  UserGroupIcon,
  ClockIcon,
  CameraIcon,
  CloudArrowUpIcon,
  ShareIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  CheckCircleIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1516450360452-1f389e6b5cef?auto=format&fit=crop&w=1470&q=80';

// Stats card component with loading state
const StatCard = ({ icon: Icon, title, value, color = 'blue', description = null, isLoading = false }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    pink: 'bg-pink-50 text-pink-600',
    teal: 'bg-teal-50 text-teal-600'
  };
  
  const iconClass = colorClasses[color] || colorClasses.blue;
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-start">
        <div className={`p-3 rounded-lg ${iconClass}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {isLoading ? (
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
          )}
          {description && (
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Recent gallery item component with improved layout and image slideshow
const RecentGalleryCard = ({ gallery }) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Get all available images for the gallery
  const galleryImages = React.useMemo(() => {
    try {
      console.log('Processing gallery data:', gallery);
      const images = [];
      
      // Helper function to extract image URL
      const getImageUrl = (img) => {
        if (!img) return null;
        
        // Handle string URLs
        if (typeof img === 'string') {
          return img.startsWith('http') ? img : null;
        }
        
        // Handle image objects
        if (typeof img === 'object') {
          // Try different possible properties that might contain the image URL
          return (
            img.image || 
            img.url || 
            (img.media_file && img.media_file.url) ||
            (img.original && (img.original.url || img.original.image)) ||
            null
          );
        }
        
        return null;
      };
      
      // Add cover image if exists
      if (gallery.cover_image) {
        const coverImage = getImageUrl(gallery.cover_image);
        if (coverImage) images.push(coverImage);
      }
      
      // Add featured images if available
      if (gallery.images && Array.isArray(gallery.images)) {
        gallery.images.forEach(img => {
          if (!img) return;
          try {
            const imgUrl = getImageUrl(img);
            if (imgUrl && !images.includes(imgUrl)) {
              images.push(imgUrl);
            }
          } catch (e) {
            console.warn('Invalid image format:', img, e);
          }
        });
      }
      
      // Log the found images for debugging
      console.log('Found images for gallery:', images);
      
      // If no images found, use a simple SVG placeholder
      if (images.length === 0) {
        console.warn('No valid images found for gallery, using placeholder');
        return [
          `data:image/svg+xml,${encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none">' +
            '<rect width="400" height="300" fill="%23f0f0f0"/>' +
            '<rect x="150" y="100" width="100" height="100" fill="%23ddd" rx="2"/>' +
            '<path d="M200 120L185 150H200L185 180H215L200 150H215L200 120Z" fill="%23aaa"/>' +
            '</svg>'
          )}`
        ];
      }
      
      return images;
    } catch (error) {
      console.error('Error processing gallery images:', error, gallery);
      // Return a simple SVG as fallback
      return [
        `data:image/svg+xml,${encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none">' +
          '<rect width="400" height="300" fill="%23f0f0f0"/>' +
          '<rect x="150" y="100" width="100" height="100" fill="%23ddd" rx="2"/>' +
          '<path d="M200 120L185 150H200L185 180H215L200 150H215L200 120Z" fill="%23aaa"/>' +
          '</svg>'
        )}`
      ];
    }
  }, [gallery]);

  // Auto-rotate images when hovered
  React.useEffect(() => {
    if (!isHovered || galleryImages.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex(prev => (prev + 1) % galleryImages.length);
    }, 3000); // Rotate every 3 seconds
    
    return () => clearInterval(interval);
  }, [isHovered, galleryImages.length]);
  
  // Handle image load state
  const handleImageLoad = () => {
    setIsLoading(false);
  };
  
  // Handle image error
  const handleImageError = (e) => {
    console.warn('Failed to load image:', e.target.src);
    // Set a simple SVG as fallback
    e.target.src = `data:image/svg+xml,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none">' +
      '<rect width="400" height="300" fill="%23f0f0f0"/>' +
      '<rect x="150" y="100" width="100" height="100" fill="%23ddd" rx="2"/>' +
      '<path d="M200 120L185 150H200L185 180H215L200 150H215L200 120Z" fill="%23aaa"/>' +
      '</svg>'
    )}`;
    e.target.onerror = null; // Prevent infinite loop if the fallback also fails
  };
  
  const stats = [
    { 
      value: gallery.total_photos || 0, 
      label: 'Photos',
      icon: PhotoIcon,
      color: 'text-blue-600 bg-blue-50'
    },
    { 
      value: gallery.photographer?.full_name || 'Unknown',
      label: 'Photographer',
      icon: UserCircleIcon,
      color: 'text-purple-600 bg-purple-50',
      isName: true // Flag to indicate this is a name, not a number
    }
  ];

  const handleClick = () => {
    const gallerySlug = gallery.slug || gallery.id;
    navigate(`/gallery/${gallerySlug}`);
  };

  // Format the date to be more readable
  const formattedDate = gallery.created_at 
    ? new Date(gallery.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Date not available';

  // Handle manual navigation between images
  const goToImage = (index) => {
    setCurrentImageIndex(index);
  };

  return (
    <div 
      className="group bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer h-full flex flex-col transform hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Gallery Cover Image with Slideshow */}
      <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex space-x-2">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className="h-2 w-2 bg-gray-300 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        
        <div className="relative w-full h-full">
          {galleryImages.map((image, index) => (
            <motion.div
              key={index}
              className="absolute inset-0 w-full h-full"
              initial={{ opacity: 0 }}
              animate={{
                opacity: index === currentImageIndex ? 1 : 0,
                scale: isHovered ? 1.05 : 1,
                transition: { duration: 0.5, ease: 'easeInOut' }
              }}
            >
              <img 
                src={image} 
                alt={`${gallery.title || 'Gallery'} ${index + 1}`}
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
            </motion.div>
          ))}
          
          {/* Navigation Dots */}
          {galleryImages.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center space-x-2 z-10 px-2">
              {galleryImages.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentImageIndex 
                      ? 'w-6 bg-white shadow-sm' 
                      : 'w-3 bg-white/60 hover:bg-white/80'
                  }`}
                  aria-label={`View image ${index + 1} of ${galleryImages.length}`}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8">
          <h3 className="text-white font-semibold text-lg truncate drop-shadow-sm">
            {gallery.title || 'Untitled Gallery'}
          </h3>
          {gallery.event?.title && (
            <p className="text-sm text-white/90 font-medium mt-1 truncate flex items-center">
              <CalendarIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <span className="truncate">{gallery.event.title}</span>
            </p>
          )}
        </div>
      </div>
      
      {/* Gallery Details */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {stats.map((stat, idx) => (
            <div 
              key={idx} 
              className={`p-3 rounded-xl ${
                stat.isName 
                  ? 'bg-purple-50 text-purple-800' 
                  : 'bg-blue-50 text-blue-800'
              } transition-all duration-200 hover:shadow-sm`}
            >
              <div className="flex items-center">
                <stat.icon 
                  className={`h-5 w-5 ${
                    stat.isName ? 'text-purple-500' : 'text-blue-500'
                  }`} 
                />
                <span className="ml-2 text-sm font-medium">{stat.label}</span>
              </div>
              <p className={`mt-1 text-base font-semibold ${stat.isName ? 'truncate' : ''}`}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>
        
        {/* Footer */}
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center">
              <ClockIcon className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center text-sm text-gray-700 font-medium">
              <span>View Gallery</span>
              <ArrowRightIcon className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [stats, setStats] = useState({
    totalGalleries: 0,
    totalPhotos: 0,
    totalEvents: 0,
    totalPhotographers: 0,
    recentGalleries: []
  });
  const [hasLoadedStats, setHasLoadedStats] = useState(false);

  // Handle event click - check if PIN is needed
  const handleEventClick = (event) => {
    if (event.is_private) {
      setCurrentEvent(event);
      setShowPinModal(true);
    } else {
      navigate(`/events/${event.slug || event.id}`);
    }
  };

  // Handle PIN submission
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');
    
    // Get CSRF token from cookies
    const getCookie = (name) => {
      let cookieValue = null;
      if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i].trim();
          if (cookie.substring(0, name.length + 1) === (name + '=')) {
            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
            break;
          }
        }
      }
      return cookieValue;
    };
    
    const csrftoken = getCookie('csrftoken');
    

    try {
      const response = await makeRequest(() =>
        axios({
          method: 'post',
          url: API.VERIFY_EVENT_PIN(currentEvent.slug),  // ✅ use the reusable constant
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
            'X-Requested-With': 'XMLHttpRequest'
          },
          data: { pin }
        })
      );
    
      if (response.data.success) {
        // Store verification in session storage
        sessionStorage.setItem(
          `event_${currentEvent.slug || currentEvent.id}_verified`,
          'true'
        );
        navigate(`/events/${currentEvent.slug || currentEvent.id}`);
        setShowPinModal(false);
      } else {
        setPinError(response.data.error || 'Invalid PIN. Please try again.');
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        (err.response?.status === 429
          ? 'Too many attempts. Please wait a moment and try again.'
          : err.response?.status === 403
          ? 'Session expired. Please refresh the page and try again.'
          : 'Error verifying PIN. Please try again.');
      setPinError(errorMessage);
    }
    
    
  };

  // Cache key for events data
  const EVENTS_CACHE_KEY = 'cached_events_data';
  const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

  // Get cached data if it exists and is not expired
  const getCachedData = useCallback((key) => {
    try {
      const cachedData = localStorage.getItem(key);
      if (!cachedData) return null;
      
      const parsedData = JSON.parse(cachedData);
      const isExpired = Date.now() - parsedData.timestamp > CACHE_EXPIRY;
      
      if (isExpired) {
        localStorage.removeItem(key);
        return null;
      }
      
      return parsedData.data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  }, []);

  // Save data to cache with timestamp
  const saveToCache = useCallback((key, data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  }, []);

  // Fetch events and statistics
  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching events and stats...');
      
      // Check cache first
      const cachedData = getCachedData(EVENTS_CACHE_KEY);
      if (cachedData && cachedData.events) {
        console.log('Using cached events data:', cachedData.events);
        setEvents(cachedData.events);
        setStats(cachedData.stats || {});
      }
      
      // Use a consistent limit for events
      const eventsLimit = 4;
      const eventsUrl = `${API_ENDPOINTS.PUBLIC_EVENTS}?limit=${eventsLimit}&ordering=-date`;
      
      console.log('Making API requests to:', {
        events: eventsUrl,
        stats: API_ENDPOINTS.STATS,
        recent: API_ENDPOINTS.RECENT_GALLERIES
      });
      
      const requests = [
        // Events request - using minimal headers to avoid CORS issues
        makeRequest(() => axios.get(eventsUrl, {
          // Remove all custom headers to let the browser handle them
          withCredentials: false // Set to false for public endpoints to avoid CORS preflight
        })).catch(err => {
          console.error('Error fetching events:', err);
          return { data: { results: [] } }; // Return empty results on error
        }),
        
        // Stats request
        makeRequest(() => axios.get(API_ENDPOINTS.STATS)).catch(err => {
          console.error('Error fetching stats:', err);
          return { data: {} }; // Return empty stats on error
        }),
        
        // Recent galleries request
        makeRequest(() => axios.get(API_ENDPOINTS.RECENT_GALLERIES)).catch(err => {
          console.error('Error fetching recent galleries:', err);
          return { data: { results: [] } }; // Return empty results on error
        })
      ];
      
      const [eventsRes, statsRes, recentRes] = await Promise.all(requests);
      
      // Process responses - handle both direct array and paginated response
      let eventsData = [];
      let eventsError = null;
      
      // Process events response
      if (eventsRes && eventsRes.data) {
        if (Array.isArray(eventsRes.data)) {
          eventsData = eventsRes.data;
        } else if (eventsRes.data.results) {
          eventsData = eventsRes.data.results;
        } else if (eventsRes.data.data) {
          eventsData = eventsRes.data.data;
        }
      } else if (eventsRes && eventsRes.error) {
        console.error('Error in events response:', eventsRes.error);
        eventsError = eventsRes.error;
      } else if (Array.isArray(eventsRes.data)) {
        eventsData = eventsRes.data;
      } else if (eventsRes.data?.results) {
        eventsData = eventsRes.data.results;
      } else if (eventsRes.data) {
        eventsData = [eventsRes.data];
      }
      console.log('Processed events data:', eventsData);
      
      // Process stats
      const serverStats = statsRes && statsRes.data 
        ? statsRes.data 
        : { 
            total_galleries: 0, 
            total_photos: 0,
            total_events: 0, 
            total_photographers: 0 
          };
        
      // Process recent galleries
      let recentGalleries = [];
      if (recentRes && recentRes.data) {
        if (Array.isArray(recentRes.data)) {
          recentGalleries = recentRes.data;
        } else if (recentRes.data.results) {
          recentGalleries = recentRes.data.results;
        } else if (recentRes.data.data) {
          recentGalleries = recentRes.data.data;
        }
      }

      // Calculate additional stats from events if available
      if (eventsData.length > 0) {
        const eventsStats = eventsData.reduce((acc, event) => ({
          totalPhotos: acc.totalPhotos + (event.photo_count || 0),
          totalGalleries: acc.totalGalleries + (event.gallery_count || 0),
          totalPhotographers: acc.totalPhotographers + (event.photographer_count || 0)
        }), { totalPhotos: 0, totalGalleries: 0, totalPhotographers: 0 });

        // Update stats with events data
        Object.assign(serverStats, {
          total_galleries: eventsStats.totalGalleries || serverStats.total_galleries,
          total_photos: eventsStats.totalPhotos || serverStats.total_photos,
          total_photographers: eventsStats.totalPhotographers || serverStats.total_photographers,
          total_events: eventsData.length || serverStats.total_events
        });
      }
      
      // Prepare stats data
      const newStats = {
        totalGalleries: serverStats.total_galleries || 0,
        totalPhotos: serverStats.total_photos || 0,
        totalEvents: serverStats.total_events || 0,
        totalPhotographers: serverStats.total_photographers || 0,
        recentGalleries: recentGalleries
      };
      
      console.log('Updating state with events:', eventsData);
      console.log('Updating stats:', newStats);
      
      // Update state once with all data
      setEvents(eventsData);
      setStats(newStats);
      setHasLoadedStats(true);
      
      // Clear any previous errors if we have events
      if (eventsData.length > 0) {
        setError(null);
      } else if (eventsError) {
        setError('Error loading events. ' + 
          (eventsError.response?.status === 429 ? 'Too many requests. Please wait a moment and try again.' : 
           eventsError.response?.data?.detail || 'Please try again later.')
        );
      } else if (!cachedData) {
        console.log('No events found in the response');
        setError('No upcoming events at the moment. Check back soon!');
      }
      
      // Save to cache if we have data
      if (eventsData.length > 0 || Object.keys(newStats).length > 0) {
        saveToCache(EVENTS_CACHE_KEY, {
          events: eventsData,
          stats: newStats
        });
      }
      
    } catch (err) {
      console.error('Error fetching events:', err);
      if (!events.length) {
        setError('Failed to load events. ' + 
          (err.response?.status === 429 ? 'Too many requests. Please wait a moment and try again.' : 
           err.response?.data?.detail || 'Please try again later.')
        );
      }
    } finally {
      setLoading(false);
    }
  }, [getCachedData, saveToCache, events.length]);

  // Initial data fetch
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Event card skeleton loader
  const EventSkeleton = () => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="h-48 bg-gray-200 animate-pulse"></div>
      <div className="p-5">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4 animate-pulse"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
        <div className="mt-4 flex items-center">
          <div className="h-4 w-4 bg-gray-200 rounded-full mr-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="mt-4 flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-16"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    </div>
  );

  // Show loading state for initial load
  if (loading && events.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20 overflow-hidden">
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="h-16 bg-blue-500 rounded w-3/4 mx-auto mb-6 animate-pulse"></div>
            <div className="h-6 bg-blue-400 rounded w-1/2 mx-auto mb-8 animate-pulse"></div>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <div className="h-12 bg-yellow-400 rounded-md w-48 mx-auto"></div>
              <div className="h-12 bg-indigo-700 rounded-md w-48 mx-auto"></div>
            </div>
          </div>
        </section>

        {/* Loading content */}
        <section className="py-12 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="h-10 bg-gray-200 rounded w-1/3 mx-auto mb-4 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 gap-5 mt-12 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-start">
                    <div className="p-3 rounded-lg bg-gray-200"></div>
                    <div className="ml-4 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Loading events section */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <div className="h-10 bg-gray-200 rounded w-1/4 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto"></div>
            </div>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <EventSkeleton key={i} />
              ))}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-black opacity-40"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            Capture & Relive Your <span className="text-yellow-300">Precious Moments</span>
          </h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto mb-10">
            Discover, download, and share your event photos with our secure and easy-to-use platform
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/events"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-yellow-400 hover:bg-yellow-300 md:py-4 md:text-lg md:px-10 transition-all duration-300 transform hover:scale-105"
            >
              Browse Events
              <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
            </Link>
            {!isAuthenticated && (
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-700 hover:bg-indigo-800 md:py-4 md:text-lg md:px-10 transition-all duration-300 transform hover:scale-105"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent"></div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Capture & Relive Your Moments
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Discover and download your event photos with ease
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-5 mt-12 sm:grid-cols-2 lg:grid-cols-4">
            {hasLoadedStats ? (
              <>
                <StatCard 
                  icon={PhotoIcon} 
                  title="Total Photos" 
                  value={stats.totalPhotos.toLocaleString()} 
                  color="blue"
                  isLoading={loading}
                  description="Across all events and galleries"
                />
                <StatCard 
                  icon={RectangleGroupIcon} 
                  title="Galleries" 
                  value={stats.totalGalleries.toLocaleString()}
                  color="green"
                  isLoading={loading}
                  description={`${stats.totalGalleries} across ${stats.totalEvents} events`}
                />
                <StatCard 
                  icon={UserGroupIcon} 
                  title="Photographers" 
                  value={stats.totalPhotographers?.toLocaleString() || '0'}
                  color="purple"
                  isLoading={loading}
                  description="Contributing to our collection"
                />
                <StatCard 
                  icon={CalendarIcon} 
                  title="Events" 
                  value={stats.totalEvents.toLocaleString()}
                  color="indigo"
                  isLoading={loading}
                  description="Available for you to explore"
                />
              </>
            ) : (
              // Show loading state for stats
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                  <div className="animate-pulse">
                    <div className="h-8 w-8 bg-gray-200 rounded-full mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Get started in just a few simple steps
            </p>
          </div>
          
          <div className="mt-10">
            <div className="relative">
              {/* Timeline line */}
              <div className="hidden md:block absolute top-0 left-1/2 h-full w-0.5 bg-gradient-to-b from-blue-400 to-indigo-600 transform -translate-x-1/2"></div>
              
              {/* Timeline items */}
              <div className="relative z-10 space-y-12 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
                {/* Step 1 */}
                <div className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 text-blue-600 mb-4">
                    <CameraIcon className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">1. Browse Events</h3>
                  <p className="text-gray-600">
                    Explore our upcoming events or search for a specific one using the event code provided by your photographer.
                  </p>
                </div>
                
                {/* Step 2 */}
                <div className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 text-indigo-600 mb-4">
                    <CloudArrowUpIcon className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">2. View & Download</h3>
                  <p className="text-gray-600">
                    Browse through the photo galleries, find your photos, and download your favorites in high resolution.
                  </p>
                </div>
                
                {/* Step 3 */}
                <div className="flex flex-col items-center text-center bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 text-purple-600 mb-4">
                    <ShareIcon className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">3. Share & Enjoy</h3>
                  <p className="text-gray-600">
                    Share your favorite moments with friends and family directly from our platform.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Why Choose Us
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              The best way to experience your event memories
            </p>
          </div>
          
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="bg-gray-50 p-6 rounded-xl hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg">
                  <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">Mobile-First Design</h3>
              </div>
              <p className="text-gray-600">
                Access your photos from any device, anywhere, with our responsive design that works perfectly on mobile, tablet, and desktop.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-gray-50 p-6 rounded-xl hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 bg-green-100 p-2 rounded-lg">
                  <SparklesIcon className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">High-Quality Photos</h3>
              </div>
              <p className="text-gray-600">
                All photos are stored in high resolution, ensuring your memories look stunning whether viewed on screen or printed.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-gray-50 p-6 rounded-xl hover:shadow-md transition-shadow duration-300">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 bg-purple-100 p-2 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">Easy to Use</h3>
              </div>
              <p className="text-gray-600">
                Our intuitive interface makes it simple to find, view, and download your photos in just a few clicks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Galleries Section */}
      {stats.recentGalleries.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="inline-block px-3 py-1 text-sm font-semibold text-blue-700 bg-blue-100 rounded-full mb-4">
                Latest Updates
              </span>
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Recent Galleries
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
                Explore the 3 latest photo galleries from our events
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {stats.recentGalleries.slice(0, 3).map((gallery) => (
                <RecentGalleryCard key={gallery.id} gallery={gallery} />
              ))}
            </div>
            
            {stats.recentGalleries.length > 0 && (
              <div className="mt-12 text-center">

              </div>
            )}
          </div>
        </section>
      )}

      {/* Call to Action */}
      <section className="bg-gradient-to-r from-indigo-700 to-blue-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold mb-6">Ready to Find Your Photos?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join thousands of happy customers who've found their perfect event photos with us
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/events"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-yellow-400 hover:bg-yellow-300 md:py-4 md:text-lg md:px-10 transition-all duration-300 transform hover:scale-105"
            >
              Browse Events
            </Link>
            {!isAuthenticated && (
              <Link
                to="/register"
                className="inline-flex items-center justify-center px-8 py-3 border border-white text-base font-medium rounded-md text-white bg-transparent hover:bg-white hover:bg-opacity-10 md:py-4 md:text-lg md:px-10 transition-all duration-300"
              >
                Create Account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Events Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Latest Events
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Discover our 4 most recent photography events
            </p>
            {error && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-md inline-block">
                {error}
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <EventSkeleton key={i} />
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
                {events.slice(0, 4).map((event) => (
                  <motion.div
                    key={event.id}
                    className="w-full"
                    whileHover={{ scale: 1.02 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <EventCard
                      event={{
                        ...event,
                        title: event.name,
                        cover_image: event.cover_image || DEFAULT_COVER_IMAGE,
                        date: event.start_date,
                        end_date: event.end_date,
                        photo_count: event.photo_count,
                        photographer_count: event.photographer_count,
                        is_private: event.is_private
                      }}
                      onClick={handleEventClick}
                      className="h-full"
                    />
                  </motion.div>
                ))}
              </div>
              {events.length > 4 && (
                <div className="text-center mt-8">
                  <Link
                    to="/events"
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    View All Events
                    <ArrowRightIcon className="ml-2 -mr-1 h-5 w-5" />
                  </Link>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center px-6 py-3 rounded-lg bg-gray-100 text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-lg">No recent events at the moment. Check back soon for updates!</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No upcoming events at the moment. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* PIN Modal */}
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onPinSubmit={handlePinSubmit}
        isLoading={false}
        error={pinError}
      />
    </div>
  );
};

export default HomePage;
