import React from 'react';
import { FaCheck } from 'react-icons/fa';

const PhotoControls = ({
  photoId,
  isSelected,
  onToggleSelect,
  className = ''
}) => {
  return (
    <div className={`absolute top-4 left-4 flex items-center gap-4 z-10 ${className}`}>
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect?.(photoId);
        }}
        className={`
          relative w-9 h-9 flex items-center justify-center rounded-full cursor-pointer 
          border-2 transition-all duration-300 ease-out
          ${isSelected
            ? 'bg-blue-500 border-blue-600 text-white shadow-lg'
            : 'bg-white border-gray-300 text-gray-400 shadow-md hover:border-blue-400 hover:text-blue-500 hover:shadow-lg'
          }
          group
        `}
      >
        {/* Always show the checkmark, just change color and weight */}
        <FaCheck className={`
          w-4 h-4 transition-all duration-300
          ${isSelected 
            ? 'opacity-100 scale-100' 
            : 'opacity-60 scale-90 group-hover:opacity-100'
          }
        `} />
        
        {/* Subtle background pattern for unselected */}
        <div className={`
          absolute inset-0 rounded-full bg-gradient-to-br from-transparent to-gray-100 opacity-60
          transition-opacity duration-300
          ${isSelected ? 'opacity-0' : 'opacity-60'}
        `} />
      </div>
    </div>
  );
};
export default PhotoControls;