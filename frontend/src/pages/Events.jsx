import { useState, useMemo, useCallback, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  MagnifyingGlassIcon as SearchIcon,
  FunnelIcon as FilterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import EventCard from '../components/events/EventCard';

// Default cover image for events without a cover
const defaultCoverImage = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=1470&q=80';

// Helper function to format date
const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Number of items per page
const ITEMS_PER_PAGE = 12;

const Events = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  
  // Fetch events with pagination
  // Since the API returns a direct array, we'll use a regular query
  const {
    data: eventsData,
    error,
    status,
  } = useQuery({
    queryKey: ['events', { searchQuery, category: selectedCategory }],
    queryFn: async () => {
      const params = {
        search: searchQuery || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
      };
      
      const response = await api.get('/api/gallery/public/events/', { params });
      console.log('API Response:', response.data);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Process events data for the EventCard component
  const events = useMemo(() => {
    if (!eventsData) {
      console.log('No events data yet');
      return [];
    }
    
    // Ensure we have an array and map to expected format
    const eventsArray = Array.isArray(eventsData) ? eventsData : [];
    console.log('Processing events array:', eventsArray);
    
    const processedEvents = eventsArray.map(event => {
      const processed = {
        ...event,
        // Map privacy field to is_private boolean expected by EventCard
        is_private: event.privacy === 'private',
        // Add a default category if not present
        category: event.category || 'Event'
      };
      console.log('Processed event:', processed);
      return processed;
    });
    
    console.log('Final processed events:', processedEvents);
    return processedEvents;
  }, [eventsData]);
  
  // Removed pagination code since we're not using it

  // Handle event click - check if PIN is needed
  const handleEventClick = (event) => {
    if (event.is_private) {
      setCurrentEvent(event);
      setShowPinModal(true);
    } else {
      navigate(`/events/${event.slug}`);
    }
  };

  // Handle PIN submission
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');
    
    try {
      const response = await api.post(
        `/api/events/${currentEvent.slug}/verify-pin/`,
        { pin }
      );
      
      if (response?.data?.verified) {
        navigate(`/events/${currentEvent.slug}`, {
          state: { pinVerified: true }
        });
      } else {
        setPinError('Invalid PIN. Please try again.');
      }
    } catch (err) {
      console.error('Error verifying PIN:', err);
      setPinError('Failed to verify PIN. Please try again.');
    }
  };

  // Get unique categories from events
  const categories = useMemo(() => {
    const allCategories = new Set(['All']);
    events.forEach(event => {
      const category = event.category?.trim();
      if (category) {
        allCategories.add(category);
      }
    });
    return Array.from(allCategories).sort();
  }, [events]);

  // Handle search with debounce
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Loading state
  if (status === 'loading') {
    return (
      <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-8">
            {/* Search and filter skeleton */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
              <div className="h-12 bg-gray-200 rounded-lg w-full max-w-md"></div>
              <div className="h-12 bg-gray-200 rounded-lg w-32"></div>
            </div>
            
            {/* Categories skeleton */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-8 bg-gray-200 rounded-full w-24"></div>
              ))}
            </div>
            
            {/* Events grid skeleton */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="space-y-2 mt-2">
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    <div className="mt-4 flex justify-between items-center">
                      <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <div className="text-6xl mb-4 text-red-500">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error loading events</h2>
          <p className="text-gray-600 mb-6">
            {error?.message || 'An error occurred while fetching events. Please try again.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Debug component to log state
  const DebugInfo = () => {
    console.log('Current state:', {
      searchQuery,
      selectedCategory,
      events,
      eventsData,
      status,
      error
    });
    return null;
  };

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <DebugInfo />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Upcoming Events</h1>
          <p className="mt-3 text-xl text-gray-500">Find and explore amazing events around you</p>
        </div>

        {/* Search and Filter */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search events..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FilterIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Categories */}
          <div className={`${showFilters ? 'block' : 'hidden'} sm:block`}>
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedCategory === category
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {status === 'loading' ? (
          <div className="mt-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : events.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((event) => (
              <EventCard 
                key={event.id}
                event={event} 
                onClick={handleEventClick} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">📭</div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No events found</h3>
            <p className="text-gray-500">
              {searchQuery || selectedCategory !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'Check back later for upcoming events.'}
            </p>
          </div>
        )}
      </div>

      {/* PIN Verification Modal */}
      <AnimatePresence>
        {showPinModal && currentEvent && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                &#8203;
              </span>

              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                    <LockClosedIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Private Event
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Please enter the PIN to access {currentEvent.name}.
                      </p>
                    </div>
                  </div>
                </div>
                <form onSubmit={handlePinSubmit} className="mt-5 sm:mt-6">
                  <div>
                    <label htmlFor="pin" className="sr-only">Event PIN</label>
                    <input
                      type="password"
                      name="pin"
                      id="pin"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2"
                      placeholder="Enter PIN"
                      autoComplete="off"
                      autoFocus
                      required
                    />
                    {pinError && (
                      <p className="mt-2 text-sm text-red-600">{pinError}</p>
                    )}
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinModal(false);
                        setCurrentEvent(null);
                        setPin('');
                        setPinError('');
                      }}
                      className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-1 sm:text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-2 sm:text-sm"
                      disabled={!pin.trim()}
                    >
                      Verify PIN
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Events;
