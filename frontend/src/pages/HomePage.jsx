import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { makeRequests } from '../utils/apiUtils';
import { 
  MagnifyingGlassIcon as SearchIcon,
  FunnelIcon as FilterIcon,
  CalendarIcon,
  MapPinIcon,
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
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config';

// Default cover image if none is provided from the API
const DEFAULT_COVER_IMAGE = 'https://images.unsplash.com/photo-1516450360452-1f389e6b5cef?auto=format&fit=crop&w=1470&q=80';

const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

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

// Recent gallery item component
const RecentGalleryCard = ({ gallery }) => {
  const navigate = useNavigate();
  const stats = [
    { value: gallery.photo_count || 0, label: 'Photos' },
    { value: gallery.gallery_count || 0, label: 'Galleries' },
    { value: gallery.photographer_count || 0, label: 'Photographers' }
  ];

  const handleClick = () => {
    // Navigate to gallery using slug if available, fallback to ID
    const gallerySlug = gallery.slug || gallery.id;
    navigate(`/gallery/${gallerySlug}`);
  };

  return (
    <div 
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {gallery.cover_image ? (
            <img 
              src={gallery.cover_image} 
              alt={gallery.title}
              className="h-20 w-20 rounded-md object-cover"
            />
          ) : (
            <div className="h-20 w-20 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
              <PhotoIcon className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{gallery.title}</p>
          <p className="text-sm text-gray-500 truncate">
            {gallery.event?.title || 'No associated event'}
          </p>
          
          {/* Stats Row */}
          <div className="mt-2 flex items-center space-x-4">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <p className="text-xs font-medium text-gray-500">{stat.label}</p>
                <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>
          
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <ClockIcon className="h-3.5 w-3.5 mr-1" />
            <span>{formatDate(gallery.created_at)}</span>
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
    recentGalleries: []
  });

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
    
    try {
      const response = await axios.post(
        `${API_ENDPOINTS.EVENTS}${currentEvent.id}/verify-pin/`,
        { pin },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          withCredentials: true
        }
      );
      
      if (response.data.valid) {
        navigate(`/events/${currentEvent.slug || currentEvent.id}`, {
          state: { pin }
        });
      } else {
        setPinError('Invalid PIN. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      setPinError('An error occurred. Please try again.');
    }
  };

  // Cache key for events data
  const EVENTS_CACHE_KEY = 'cached_events_data';
  const CACHE_EXPIRY = 60 * 60 * 1000; // 1 hour in milliseconds

  // Get cached data if it exists and is not expired
  const getCachedData = (key) => {
    try {
      const cachedData = localStorage.getItem(key);
      if (!cachedData) return null;
      
      const { data, timestamp } = JSON.parse(cachedData);
      const isExpired = Date.now() - timestamp > CACHE_EXPIRY;
      
      if (isExpired) {
        localStorage.removeItem(key);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error reading from cache:', error);
      return null;
    }
  };

  // Save data to cache with timestamp
  const saveToCache = (key, data) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  // Fetch events and statistics
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Try to get cached data first
        const cachedData = getCachedData(EVENTS_CACHE_KEY);
        
        if (cachedData) {
          const { events: cachedEvents, stats: cachedStats } = cachedData;
          setEvents(cachedEvents);
          setStats(cachedStats);
          setLoading(false);
          
          // We still want to update in the background
          fetchFreshData();
          return;
        }
        
        // If no cache, fetch fresh data
        await fetchFreshData();
      } catch (err) {
        console.error('Error in fetchData:', err);
        setError('Failed to load data. Please try again later.');
        setLoading(false);
      }
    };

    const fetchFreshData = async () => {
      try {
        // Make requests with rate limiting
        const [eventsRes, statsRes, recentRes] = await makeRequests([
          () => axios.get(API_ENDPOINTS.PUBLIC_EVENTS),
          () => axios.get(API_ENDPOINTS.STATS),
          () => axios.get(API_ENDPOINTS.RECENT_GALLERIES)
        ]);

        // Check for errors in responses
        if (eventsRes.error) throw eventsRes.error;
        if (statsRes.error) console.warn('Failed to load stats:', statsRes.error);
        if (recentRes.error) console.warn('Failed to load recent galleries:', recentRes.error);

        const eventsData = eventsRes.data || [];
        const serverStats = statsRes.data || { total_galleries: 0, total_events: 0, total_photographers: 0 };
        const recentGalleries = recentRes.data || [];

        // Calculate totals from events if available
        const eventsStats = eventsData.reduce((acc, event) => ({
          totalPhotos: acc.totalPhotos + (event.photo_count || 0),
          totalGalleries: acc.totalGalleries + (event.gallery_count || 0),
          totalPhotographers: acc.totalPhotographers + (event.photographer_count || 0)
        }), { totalPhotos: 0, totalGalleries: 0, totalPhotographers: 0 });

        const statsData = {
          totalGalleries: eventsStats.totalGalleries || serverStats.total_galleries || 0,
          totalPhotos: eventsStats.totalPhotos || serverStats.total_photos || 0,
          totalEvents: eventsData.length || serverStats.total_events || 0,
          totalPhotographers: eventsStats.totalPhotographers || serverStats.total_photographers || 0,
          recentGalleries: recentGalleries
        };

        // Update state
        setEvents(eventsData);
        setStats(statsData);

        // Save to cache
        saveToCache(EVENTS_CACHE_KEY, {
          events: eventsData,
          stats: statsData
        });
      } catch (err) {
        console.error('Error fetching fresh data:', err);
        throw err; // Let the outer catch handle it
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Try Again
          </button>
        </div>
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

      {/* Recent Galleries */}
      {stats.recentGalleries.length > 0 && (
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Recent Galleries
              </h2>
              <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
                Check out the latest photo galleries from our events
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stats.recentGalleries.map((gallery) => (
                <RecentGalleryCard key={gallery.id} gallery={gallery} />
              ))}
            </div>
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
              Upcoming Events
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Browse and join our upcoming photography events
            </p>
          </div>
          
          {events.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <motion.div
                  key={event.id}
                  className="bg-white rounded-lg shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleEventClick(event)}
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={event.cover_image || DEFAULT_COVER_IMAGE}
                      alt={event.name || 'Event'}
                      className="w-full h-full object-cover"
                    />
                    {event.is_private && (
                      <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center">
                        <LockClosedIcon className="h-3 w-3 mr-1" />
                        Private
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-bold text-gray-900 line-clamp-1 flex-1">
                        {event.name || 'Untitled Event'}
                      </h3>
                    </div>
                    <p className="text-gray-600 line-clamp-2 mb-4">
                      {event.description || 'No description available.'}
                    </p>
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      <span>{formatDate(event.start_date)}</span>
                      {event.end_date && (
                        <>
                          <span className="mx-1">-</span>
                          <span>{formatDate(event.end_date)}</span>
                        </>
                      )}
                    </div>
                    {event.location && (
                      <div className="flex items-center text-sm text-gray-500 mb-4">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-500">
                          {event.photographer_count || 0} photographers
                        </span>
                      </div>
                      <div className="flex items-center">
                        <PhotoIcon className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="text-sm text-gray-500">
                          {event.photo_count || 0} photos
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No upcoming events at the moment. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPinModal(false)}
          >
            <motion.div 
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <LockClosedIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  This is a private event
                </h3>
                <p className="text-gray-500 mb-6">
                  Please enter the event PIN to continue
                </p>
                
                <form onSubmit={handlePinSubmit}>
                  <div className="mb-4">
                    <input
                      type="password"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Enter PIN"
                      required
                    />
                    {pinError && (
                      <p className="mt-2 text-sm text-red-600">{pinError}</p>
                    )}
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      onClick={() => setShowPinModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
