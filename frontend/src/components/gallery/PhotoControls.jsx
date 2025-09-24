import React from 'react';
import { FaHeart, FaRegHeart, FaCheck } from 'react-icons/fa';

const PhotoControls = ({
  photoId,
  isSelected,
  isLiked,
  likeCount,
  onToggleSelect,
  onToggleLike,
  className = ''
}) => {
  return (
    <div className={`absolute top-4 left-4 flex items-center gap-4 z-10 ${className}`}>
      {/* Selection checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(photoId);
        }}
        className="cursor-pointer"
      >
        <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
          isSelected ? 'bg-blue-600' : 'bg-white bg-opacity-80'
        }`}>
          {isSelected && <FaCheck className="w-5 h-5 text-white" />}
        </div>
      </div>

      {/* Like button */}
      <button
        onClick={(e) => onToggleLike(photoId, e)}
        className="flex items-center gap-1 text-white hover:text-red-400 transition-colors bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-2 group"
      >
        {isLiked(photoId) ? (
          <FaHeart className="text-red-500 text-xl group-hover:scale-110 transition-transform" />
        ) : (
          <FaRegHeart className="text-white text-xl group-hover:scale-110 transition-transform" />
        )}
        <span className="text-white text-sm font-medium ml-1">
          {likeCount || 0}
        </span>
      </button>
    </div>
  );
};

export default PhotoControls;
