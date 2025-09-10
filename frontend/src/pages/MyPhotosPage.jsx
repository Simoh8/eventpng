import React from 'react';
import { useAuth } from '../context/AuthContext';

const MyPhotosPage = () => {
  const { user } = useAuth();

  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">My Photos</h1>
        <p className="mt-2 text-gray-600">View and download your purchased photos</p>
        
        <div className="mt-8 bg-white shadow rounded-lg p-6">
          {user?.purchasedPhotos?.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {user.purchasedPhotos.map((photo) => (
                <div key={photo.id} className="relative group">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-sm text-gray-700 truncate">{photo.name}</span>
                    <a
                      href={photo.downloadUrl}
                      download
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No photos yet</h3>
              <p className="mt-1 text-sm text-gray-500">Your purchased photos will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyPhotosPage;
