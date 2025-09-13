import React, { useEffect } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaExpand, FaCompress } from 'react-icons/fa';

const Lightbox = ({ 
  images = [], 
  currentIndex = 0, 
  onClose, 
  onNext, 
  onPrev,
  isFullscreen = false,
  onToggleFullscreen
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      } else if (e.key === 'f' || e.key === 'F') {
        onToggleFullscreen?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onNext, onPrev, onToggleFullscreen]);

  if (!images.length) return null;

  const currentImage = images[currentIndex];
  const imageUrl = currentImage?.image || '';

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4 ${isFullscreen ? 'p-0' : ''}`}>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:text-gray-300 text-2xl z-10"
        aria-label="Close lightbox"
      >
        <FaTimes />
      </button>

      <button 
        onClick={onPrev}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 z-10"
        aria-label="Previous image"
      >
        <FaChevronLeft size={24} />
      </button>

      <div className="relative max-w-full max-h-full flex items-center justify-center">
        <img 
          src={imageUrl} 
          alt={`Gallery image ${currentIndex + 1}`}
          className="max-h-[90vh] max-w-full object-contain"
        />
      </div>

      <button 
        onClick={onNext}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 z-10"
        aria-label="Next image"
      >
        <FaChevronRight size={24} />
      </button>

      <button
        onClick={onToggleFullscreen}
        className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 z-10"
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <FaCompress /> : <FaExpand />}
      </button>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
};

export default Lightbox;
