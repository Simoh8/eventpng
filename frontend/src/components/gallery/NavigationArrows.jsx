import React from 'react';

const NavigationArrows = ({ onNavigate, totalPhotos, className = '' }) => {
  if (totalPhotos <= 1) return null;

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate('prev');
        }}
        className={`absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-white z-10 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-3 transition-all duration-200 transform hover:scale-110 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white border-opacity-20 ${className}`}
        aria-label="Previous photo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onNavigate('next');
        }}
        className={`absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-white z-10 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-3 transition-all duration-200 transform hover:scale-110 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white border-opacity-20 ${className}`}
        aria-label="Next photo"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
};

export default NavigationArrows;
