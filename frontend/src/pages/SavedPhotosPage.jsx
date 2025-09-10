import React from 'react';

const SavedPhotosPage = () => {
  // In a real app, this would be fetched from an API or context
  const savedPhotos = [];

  return (
    <div className="py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Saved Photos</h1>
        <p className="mt-2 text-gray-600">View your saved photos for later</p>
        
        <div className="mt-8">
          {savedPhotos.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {savedPhotos.map((photo) => (
                <div key={photo.id} className="group relative">
                  <img
                    src={photo.url}
                    alt={photo.alt}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-sm text-gray-700 truncate">{photo.name}</span>
                    <button className="text-red-500 hover:text-red-700">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
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
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No saved photos</h3>
              <p className="mt-1 text-sm text-gray-500">Save photos to view them here later.</p>
              <div className="mt-6">
                <a
                  href="/events"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Browse Events
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavedPhotosPage;
