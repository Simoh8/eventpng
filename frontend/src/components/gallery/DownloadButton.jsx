import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const DownloadButton = ({ photo, onDownload, className = '', ...props }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDownload(photo);
        }}
        className={`absolute top-4 right-16 text-white hover:text-white z-10 bg-black bg-opacity-60 hover:bg-opacity-80 rounded-full p-3 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white border-opacity-20 group ${className}`}
        title="Download Image"
        {...props}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-6 w-6 group-hover:scale-110 transition-transform duration-200" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" 
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="absolute top-4 right-16 z-10">
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigate('/login', { state: { from: window.location.pathname } });
        }}
        className="text-white hover:text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full px-4 py-2 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white border-opacity-20 group flex items-center gap-2 font-medium"
        title="Login to Download"
        {...props}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 group-hover:scale-110 transition-transform duration-200" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" 
          />
        </svg>
        <span className="text-sm">Login to Download</span>
      </button>
    </div>
  );
};

export default DownloadButton;