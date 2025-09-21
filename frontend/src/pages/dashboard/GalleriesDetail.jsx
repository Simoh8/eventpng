import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PhotoIcon, PlusIcon } from '@heroicons/react/24/outline';
import DetailLayout from '../../components/dashboard/DetailLayout';
import api from '../../utils/api';

export default function GalleriesDetail() {
  const navigate = useNavigate();
  
  const handleNewGallery = (e) => {
    e.preventDefault();
    window.location.href = 'http://localhost:3000/galleries/new';
  };
  
  const handleViewGallery = (galleryId) => {
    navigate(`/photographer-dashboard/galleries/${galleryId}`);
  };
  const [galleries, setGalleries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    public: 0,
    private: 0,
    active: 0,
    recent: 0
  });

  const fetchGalleries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch galleries and stats in parallel
      const [galleriesRes, statsRes] = await Promise.allSettled([
        api.get('/api/gallery/galleries/'),
        api.get('/api/photographer/dashboard/stats/')
      ]);
  
      // Handle galleries response
      if (galleriesRes.status === 'fulfilled') {
        const responseData = galleriesRes.value.data;
        const galleriesData = Array.isArray(responseData) 
          ? responseData 
          : (responseData?.results || []);
        
        // console.log('Galleries data:', galleriesData);
        setGalleries(galleriesData);
        
        // Calculate public/private counts from galleries data
        const publicCount = galleriesData.filter(g => g.is_public).length;
        const privateCount = galleriesData.length - publicCount;
        
        // Update stats with galleries data
        setStats(prev => ({
          ...prev,
          total: galleriesData.length,
          public: publicCount,
          private: privateCount
        }));
      } else {
        console.error('Failed to fetch galleries:', galleriesRes.reason);
        throw new Error('Could not load galleries. Please try again.');
      }
      
      // Handle stats response
      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        const statsData = statsRes.value.data;
        
        setStats(prev => ({
          ...prev,
          recent: statsData.galleries?.recent || 0,
          active: statsData.activeSessions?.total || 0
        }));
      } else {
        console.error('Failed to fetch stats:', statsRes.reason);
        // Don't throw error for stats failure as it's not critical
      }
    } catch (error) {
      console.error('Error in fetchGalleries:', error);
      setError(error.message || 'Failed to load galleries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  if (loading) {
    return (
      <DetailLayout title="Galleries">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <p className="mt-4 text-gray-600">Loading galleries...</p>
        </div>
      </DetailLayout>
    );
  }

  if (error) {
    return (
      <DetailLayout title="Galleries">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={fetchGalleries}
                className="mt-2 text-sm font-medium text-red-700 hover:text-red-600"
              >
                Try again <span aria-hidden="true">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </DetailLayout>
    );
  }

  return (
    <DetailLayout title="Galleries">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Galleries</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.total}</dd>
            <dd className="text-sm text-green-600">+{stats.recent} this month</dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Public Galleries</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">{stats.public}</dd>
            <dd className="text-sm text-gray-500">{Math.round((stats.public / stats.total) * 100) || 0}% of total</dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Private Galleries</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">{stats.private}</dd>
            <dd className="text-sm text-gray-500">{Math.round((stats.private / stats.total) * 100) || 0}% of total</dd>
          </div>
        </div>
        
        {/* <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Active Sessions</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">{stats.active}</dd>
            <dd className="text-sm text-gray-500">Currently viewing your galleries</dd>
          </div>
        </div> */}
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Your Galleries</h3>
            <button
              onClick={handleNewGallery}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              type="button"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              New Gallery
            </button>
          </div>
        </div>
        
        {galleries.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {galleries.map((gallery) => (
              <li key={gallery.id}>
                <div 
                  onClick={() => handleViewGallery(gallery.id)}
                  className="block hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-indigo-600 truncate">{gallery.title}</p>
                      <div className="ml-2 flex-shrink-0 flex">
                        <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${gallery.is_public ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {gallery.is_public ? 'Public' : 'Private'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          <PhotoIcon className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                          {gallery.photos_count || 0} photos
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          Created on{' '}
                          <time dateTime={gallery.created_at}>
                            {new Date(gallery.created_at).toLocaleDateString()}
                          </time>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12 px-4">
            <PhotoIcon className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No galleries yet</h3>
            <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">You haven't created any galleries yet. Get started by creating your first gallery to showcase your work.</p>
            <div className="mt-6">
              <button
                onClick={handleNewGallery}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150"
                type="button"
              >
                <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                Create Your First Gallery
              </button>
            </div>
          </div>
        )}
      </div>
    </DetailLayout>
  );
}
