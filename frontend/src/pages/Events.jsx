import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../config';
import { 
  MagnifyingGlassIcon as SearchIcon,
  FunnelIcon as FilterIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import api from '../services/api';
import { API_ENDPOINTS } from '../config';
import EventCard from '../components/events/EventCard';
import SkeletonEventCard from '../components/events/SkeletonEventCard';
import axios from 'axios';

// Cache key generator
const generateCacheKey = (searchQuery, selectedCategory) => [
  'events',
  { search: searchQuery || 'all', category: selectedCategory || 'all' }
];

// PIN cache helpers
const PIN_CACHE_KEY = 'event_pin_cache';
const getCachedPin = (slug) => {
  try { return JSON.parse(localStorage.getItem(PIN_CACHE_KEY) || '{}')[slug]; }
  catch { return null; }
};
const setCachedPin = (slug, pin) => {
  try {
    const cache = JSON.parse(localStorage.getItem(PIN_CACHE_KEY) || '{}');
    cache[slug] = pin;
    localStorage.setItem(PIN_CACHE_KEY, JSON.stringify(cache));
  } catch (err) { console.warn(err); }
};

// Process events
const processEvents = (eventsData) => Array.isArray(eventsData) ? eventsData : [];

const Events = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showSkeleton, setShowSkeleton] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch events
  const { data: eventsData, error, status, isFetching } = useQuery({
    queryKey: generateCacheKey(debouncedSearch, selectedCategory),
    queryFn: async ({ signal }) => {
      const params = {
        search: debouncedSearch || undefined,
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
      };
      const response = await api.get('api/gallery/public/events/', { params, signal, timeout: 10000 });
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: false,
  });

  // Ensure skeleton is visible at least 700ms
  useEffect(() => {
    if (!status === 'loading') return;
    const timer = setTimeout(() => setShowSkeleton(false), 700);
    return () => clearTimeout(timer);
  }, [status]);

  const events = useMemo(() => processEvents(eventsData), [eventsData]);

  // Categories
  const categories = useMemo(() => {
    const allCats = new Set(['All']);
    if (eventsData?.length) eventsData.forEach(e => e.category && allCats.add(e.category.trim()));
    return Array.from(allCats).sort();
  }, [eventsData]);


  
  const verifyPin = useCallback(async (event, pinToVerify) => {
    try {
      const response = await api.post(
        API.VERIFY_EVENT_PIN(event.slug),
        { pin: pinToVerify },
        { timeout: 5000 }
      );
      if (response?.data?.verified || response?.data?.success) {
        setCachedPin(event.slug, pinToVerify);
        navigate(`/events/${event.slug}`, { state: { pinVerified: true } });
      } else {
        setPinError(response.data.error || 'Invalid PIN. Please try again.');
      }
    } catch (err) {
      setPinError('Failed to verify PIN. Please try again.');
    }
  }, [navigate]);
  
  
  
  const handleEventClick = useCallback(async (event) => {
    if (event.privacy === 'private') {
      const cachedPin = getCachedPin(event.slug);
      if (cachedPin) {
        // Try using cached PIN first
        try {
          await verifyPin(event, cachedPin);
        } catch (error) {
          // If cached PIN fails, show modal for new input
          setCurrentEvent(event);
          setShowPinModal(true);
        }
      } else {
        setCurrentEvent(event);
        setShowPinModal(true);
      }
    } else {
      // For public events, navigate directly
      navigate(`/events/${event.slug}`);
    }
  }, [navigate, verifyPin]);




  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');
    await verifyPin(currentEvent, pin);
  };

  // Prefetch basic data
  useEffect(() => {
    queryClient.prefetchQuery({
      queryKey: generateCacheKey('', 'All'),
      queryFn: async () => (await api.get('/api/gallery/public/events/')).data
    });
  }, [queryClient]);

  return (
    <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Upcoming Events</h1>
          <p className="mt-3 text-xl text-gray-500">Find and explore amazing events around you</p>
        </div>

        {/* Search & Filter */}
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

          {showFilters && (
            <div className="sm:block">
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === cat ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >{cat}</button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Updating indicator */}
        {isFetching && (
          <div className="fixed top-4 right-4 z-50">
            <div className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm flex items-center">
              <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-white mr-2"></div>
              Updating...
            </div>
          </div>
        )}

        {/* Events grid with skeleton & animation */}
        <AnimatePresence>
          {showSkeleton || status === 'loading' ? (
            <motion.div 
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {Array.from({ length: 8 }).map((_, i) => <SkeletonEventCard key={i} />)}
            </motion.div>
          ) : events.length > 0 ? (
            <motion.div 
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.1 } }
              }}
            >
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  className="w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <EventCard event={event} onClick={handleEventClick} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-5xl mb-4">📭</div>
              <p>No events found. Adjust your filters or try again later.</p>
            </div>
          )}
        </AnimatePresence>

        {/* PIN Modal */}
        <AnimatePresence>
          {showPinModal && currentEvent && (
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">This is a private event</h3>
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
                        autoFocus
                      />
                      {pinError && <p className="mt-2 text-sm text-red-600">{pinError}</p>}
                    </div>
                    <div className="flex justify-end space-x-3">
                      <button
                        type="button"
                        onClick={() => { setShowPinModal(false); setCurrentEvent(null); setPin(''); setPinError(''); }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >Cancel</button>
                      <button
                        type="submit"
                        disabled={!pin.trim()}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
                      >Continue</button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default Events;
