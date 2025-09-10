import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  MagnifyingGlassIcon as SearchIcon,
  FunnelIcon as FilterIcon,
  CalendarIcon,
  MapPinIcon,
  LockClosedIcon,
  ArrowRightIcon,
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

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const response = await axios.get(API_ENDPOINTS.PUBLIC_EVENTS, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          withCredentials: true
        });
        
        setEvents(response.data);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
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
      <div className="relative bg-gray-900 w-full h-screen max-h-[800px]">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-purple-900 to-gray-900">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black/30 to-black/80"></div>
            
            {[...Array(15)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/5"
                initial={{
                  x: Math.random() * 100,
                  y: Math.random() * 100,
                  width: Math.random() * 300 + 50,
                  height: Math.random() * 300 + 50,
                  opacity: Math.random() * 0.1 + 0.05,
                  borderRadius: '100%',
                }}
                animate={{
                  y: [0, Math.random() * 100 - 50, 0],
                  x: [0, Math.random() * 100 - 50, 0],
                }}
                transition={{
                  duration: Math.random() * 30 + 20,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  repeatType: 'reverse',
                }}
              />
            ))}
            
            <motion.div 
              className="absolute inset-0"
              initial={{ scale: 1.2, opacity: 0.3 }}
              animate={{ scale: 1 }}
              transition={{ duration: 2, ease: 'easeOut' }}
            >
              <img
                className="w-full h-full object-cover"
                src="https://images.unsplash.com/photo-1516450360452-1f389e6b5cef?ixlib=rb-4.0.3&auto=format&fit=crop&w=1470&q=80"
                alt="Event photography"
              />
            </motion.div>
          </div>
        </div>
        
        {/* Hero Content */}
        <div className="relative max-w-7xl mx-auto h-full flex flex-col justify-center px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-7xl bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              Relive Your Favorite <span className="text-primary-400">Moments</span>
            </h1>
            <motion.p 
              className="mt-6 max-w-2xl mx-auto text-xl text-gray-200"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
            >
              Capture and cherish every moment from Kenya's most exciting events
            </motion.p>
            
            <motion.div
              className="mt-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Link
                to="/events"
                className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-bold rounded-full shadow-lg transform transition-all duration-300 hover:scale-105 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white focus:outline-none focus:ring-4 focus:ring-primary-400 focus:ring-opacity-50"
              >
                Browse All Events
                <svg className="ml-3 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Events Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Featured Events
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Browse through our collection of recent events
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
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-1 rounded-md flex items-center">
                        <LockClosedIcon className="h-3 w-3 mr-1" />
                        Private
                      </div>
                    )}
                    {event.category && (
                      <div className="absolute bottom-2 left-2 bg-primary-600 text-white text-xs font-semibold px-2 py-1 rounded-md">
                        {event.category}
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">
                      {event.name || 'Untitled Event'}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 mb-2">
                      <MapPinIcon className="h-4 w-4 mr-1 text-gray-500" />
                      <span className="line-clamp-1">{event.location || 'Location not specified'}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <CalendarIcon className="h-4 w-4 mr-1 text-gray-500" />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        {event.photo_count || 0} photos
                      </span>
                      <button className="text-primary-600 hover:text-primary-800 font-medium text-sm flex items-center">
                        View Event
                        <ArrowRightIcon className="h-4 w-4 ml-1" />
                      </button>
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

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
              Get started in just a few simple steps
            </p>
          </div>
          
          <div className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
            <div className="relative">
              <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white text-xl font-bold">
                1
              </div>
              <div className="ml-16">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Find Your Event</h3>
                <p className="mt-2 text-base text-gray-500">Browse our collection of events and select the one you attended.</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white text-xl font-bold">
                2
              </div>
              <div className="ml-16">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Browse Photos</h3>
                <p className="mt-2 text-base text-gray-500">View all photos from the event and find yourself or your favorite moments.</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-primary-500 text-white text-xl font-bold">
                3
              </div>
              <div className="ml-16">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Download & Share</h3>
                <p className="mt-2 text-base text-gray-500">Download your favorite photos and share them with friends and family.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to find your photos?</span>
            <span className="block text-primary-200">Start browsing events now.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/events"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50"
              >
                Browse Events
              </Link>
            </div>
            <div className="ml-3 inline-flex rounded-md shadow">
              <Link
                to="/about"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-700 hover:bg-primary-800"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* PIN Modal */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPinModal(false)}
          >
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="bg-white rounded-lg p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                <LockClosedIcon className="h-5 w-5 text-yellow-500 inline-block mr-2" />
                Private Event
              </h3>
              <p className="text-gray-600 mb-4">
                This is a private event. Please enter the PIN to continue.
              </p>
              <form onSubmit={handlePinSubmit}>
                <div className="mb-4">
                  <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
                    Enter PIN
                  </label>
                  <input
                    type="password"
                    id="pin"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter event PIN"
                    required
                  />
                  {pinError && (
                    <p className="mt-1 text-sm text-red-600">{pinError}</p>
                  )}
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPinModal(false);
                      setPin('');
                      setPinError('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
