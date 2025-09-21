import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { FaHeart, FaRegHeart, FaArrowLeft } from 'react-icons/fa';
import { usePhotoLikes } from '../hooks/usePhotoLikes';

const LikedPhotosPage = () => {
  const { user } = useAuth();
  const { data: likedPhotos = [], isLoading } = useQuery({
    queryKey: ['userLikedPhotos'],
    queryFn: async () => {
      const response = await api.get('/api/users/me/likes/');
      return response.data;
    },
    enabled: !!user,
  });

  // Group photos by gallery
  const photosByGallery = likedPhotos.reduce((acc, photo) => {
    if (!photo.gallery) return acc;
    
    const galleryId = photo.gallery.id;
    if (!acc[galleryId]) {
      acc[galleryId] = {
        gallery: photo.gallery,
        photos: [],
      };
    }
    acc[galleryId].photos.push(photo);
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">My Liked Photos</h1>
            <p className="text-gray-600 mb-8">Please log in to view your liked photos.</p>
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">My Liked Photos</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 animate-pulse rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <FaArrowLeft className="mr-2" /> Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Liked Photos</h1>
          <p className="text-gray-600 mt-2">
            {likedPhotos.length} {likedPhotos.length === 1 ? 'photo' : 'photos'} liked
          </p>
        </div>

        {Object.keys(photosByGallery).length === 0 ? (
          <div className="text-center py-12">
            <FaRegHeart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No liked photos yet</h3>
            <p className="mt-1 text-gray-500">Like some photos to see them here.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {Object.entries(photosByGallery).map(([galleryId, { gallery, photos }]) => (
              <div key={galleryId} className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    <Link to={`/gallery/${gallery.slug || gallery.id}`} className="hover:underline">
                      {gallery.title}
                    </Link>
                  </h2>
                  <p className="text-sm text-gray-500">
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'} liked in this gallery
                  </p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative group">
                      <Link to={`/gallery/${gallery.slug || gallery.id}?photo=${photo.id}`}>
                        <img
                          src={photo.image}
                          alt={photo.title || 'Liked photo'}
                          className="w-full h-48 object-cover rounded-lg shadow-sm hover:shadow-md transition-shadow"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              // Handle unlike
                            }}
                            className="p-2 rounded-full bg-white bg-opacity-80 hover:bg-opacity-100 transition-all"
                            aria-label="Unlike photo"
                          >
                            <FaHeart className="text-red-500" />
                          </button>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LikedPhotosPage;
