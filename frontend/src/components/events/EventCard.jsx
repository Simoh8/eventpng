import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { 
  CalendarIcon, 
  MapPinIcon, 
  LockClosedIcon, 
  ArrowRightIcon,
  UserCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

// Default cover image for events without a cover
const defaultCoverImage = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=500&q=80';

// Format date helper
const formatDate = (dateString) => {
  if (!dateString) return '';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

// Format time helper
const formatTime = (dateString) => {
  if (!dateString) return '';
  const options = { hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleTimeString('en-US', { ...options, hour12: true });
};

const EventCard = memo(({ event, onClick }) => {
  // Use a smaller image size for thumbnails
  const imageUrl = event.cover_image 
    ? `${event.cover_image}?w=500&h=280&fit=crop&auto=format`
    : defaultCoverImage;

  const handleClick = (e) => {
    e.preventDefault();
    onClick(event);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col border border-gray-100"
      onClick={handleClick}
    >
      <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        <img
          src={imageUrl}
          alt={event.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          width={500}
          height={280}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = defaultCoverImage;
          }}
        />
        {event.is_private && (
          <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center shadow-md">
            <LockClosedIcon className="h-3.5 w-3.5 mr-1.5" />
            Private Event
          </div>
        )}
        
        {/* Event Date Badge */}
        {event.date && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-gray-800 text-xs font-medium px-3 py-1.5 rounded-lg shadow-md flex flex-col items-center">
            <span className="text-sm font-bold">{new Date(event.date).getDate()}</span>
            <span className="text-xs uppercase tracking-wider">
              {new Date(event.date).toLocaleString('default', { month: 'short' })}
            </span>
          </div>
        )}
      </div>
      
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {event.category || 'Event'}
          </span>
          
          {event.created_by && (
            <div className="flex items-center text-gray-500 text-xs">
              <UserCircleIcon className="h-4 w-4 mr-1" />
              <span className="truncate max-w-[100px]">
                {event.created_by.first_name || event.created_by.email.split('@')[0]}
              </span>
            </div>
          )}
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-tight">
          {event.name}
        </h3>
        
        {event.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {event.description}
          </p>
        )}
        
        <div className="mt-auto pt-3 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center text-sm text-gray-600">
              <MapPinIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span className="truncate" title={event.location}>
                {event.location || 'Online'}
              </span>
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span>{event.time ? formatTime(event.time) : 'All day'}</span>
            </div>
          </div>
          
          <button 
            className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            onClick={handleClick}
          >
            View Event
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

EventCard.displayName = 'EventCard';

export default EventCard;
