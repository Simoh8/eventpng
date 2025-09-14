import React from 'react';
import { Link } from 'react-router-dom';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import PropTypes from 'prop-types';

const EventCard = ({ 
  event, 
  onClick, 
  className = '',
  showPrivateBadge = true,
  showCategory = true,
  showLocation = true,
  showDate = true,
  showDetailsButton = true,
  imageHeight = 'h-48',
  isPrivate = null
}) => {
  // Determine if event is private (can be overridden by isPrivate prop)
  const isEventPrivate = isPrivate !== null ? isPrivate : (event?.is_private || event?.privacy === 'private');
  
  // Handle click event
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(event);
    }
  };

  return (
    <div 
      className={`card overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className}`}
      onClick={handleClick}
    >
      <div className={`relative ${imageHeight} overflow-hidden`}>
        {event?.cover_image ? (
          <img 
            src={event.cover_image} 
            alt={event.title || 'Event image'}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            crossOrigin="anonymous"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = 'https://via.placeholder.com/400x300?text=Event+Image';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">No image available</span>
          </div>
        )}
        
        {/* Category Badge */}
        {showCategory && (event?.category || event?.event_type) && (
          <div className="absolute top-3 left-3">
            <span className="text-xs font-semibold text-white bg-primary-600 px-2 py-1 rounded">
              {event.category || event.event_type}
            </span>
          </div>
        )}
        
        {/* Private Event Badge */}
        {showPrivateBadge && isEventPrivate && (
          <div className="absolute top-3 right-3 bg-black/70 text-white p-1.5 rounded-full">
            <LockClosedIcon className="w-4 h-4" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          {event?.date && showDate && (
            <div className="text-xs text-white font-medium">
              {new Date(event.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2" title={event?.title}>
          {event?.title || 'Untitled Event'}
        </h3>
        
        {showLocation && event?.location && (
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <svg className="w-4 h-4 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{event.location}</span>
          </div>
        )}
        
        {event?.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {event.description}
          </p>
        )}
        
        {showDetailsButton && (
          <Link 
            to={`/events/${event?.slug || event?.id}`}
            className="inline-block w-full text-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
            onClick={handleClick}
          >
            View Details
          </Link>
        )}
      </div>
    </div>
  );
};

EventCard.propTypes = {
  event: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    slug: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    location: PropTypes.string,
    date: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    cover_image: PropTypes.string,
    category: PropTypes.string,
    event_type: PropTypes.string,
    is_private: PropTypes.bool,
    privacy: PropTypes.string,
  }).isRequired,
  onClick: PropTypes.func,
  className: PropTypes.string,
  showPrivateBadge: PropTypes.bool,
  showCategory: PropTypes.bool,
  showLocation: PropTypes.bool,
  showDate: PropTypes.bool,
  showDetailsButton: PropTypes.bool,
  imageHeight: PropTypes.string,
  isPrivate: PropTypes.bool,
};

export default EventCard;
