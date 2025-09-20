import React, { useState, useEffect } from 'react';
import { CloudArrowUpIcon, ServerIcon} from '@heroicons/react/24/outline';
import DetailLayout from '../../components/dashboard/DetailLayout';
import api from '../../utils/api';

export default function StorageDetail() {
  const [storage, setStorage] = useState({
    used: 0,
    total: 10737418240, // 10GB in bytes
    change: 0,
    files: []
  });
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('recent');

  useEffect(() => {
    const fetchStorageData = async () => {
      try {
        setLoading(true);
        const [statsRes, filesRes] = await Promise.all([
          api.get('/api/photographer/dashboard/stats/'),
          api.get('/api/gallery/photos/')
        ]);

        if (statsRes.data) {
          // Convert GB to bytes for calculation
          const usedGB = statsRes.data.storageUsed?.used || 0;
          // const usedBytes = usedGB * 1024 * 1024 * 1024;
          
          setStorage({
            used: usedGB,
            total: 10, // 10GB total
            change: statsRes.data.storageUsed?.change || 0,
            files: filesRes.data?.results || []
          });
        }
      } catch (error) {
        console.error('Error fetching storage data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStorageData();
  }, [sortBy]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPercentage = (used, total) => {
    return Math.min(100, Math.round((used / total) * 100));
  };

  if (loading) {
    return (
      <DetailLayout title="Storage">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DetailLayout>
    );
  }

  const usedGB = storage.used;
  const totalGB = storage.total;
  const percentageUsed = getPercentage(usedGB, totalGB);
  const remainingGB = totalGB - usedGB;

  return (
    <DetailLayout title="Storage">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Storage Used</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{usedGB.toFixed(2)} GB</dd>
            <dd className="text-sm text-gray-500">
              {percentageUsed}% of {totalGB} GB used
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Remaining Storage</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">{remainingGB.toFixed(2)} GB</dd>
            <dd className="text-sm text-gray-500">
              {Math.round((remainingGB / totalGB) * 100)}% of total
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Files</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">{storage.files.length}</dd>
            <dd className="text-sm text-gray-500">
              {storage.change >= 0 ? '+' : ''}{storage.change}% from last month
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Plan</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">Starter</dd>
            <dd className="text-sm text-gray-500">
              {totalGB} GB total storage
            </dd>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Storage Usage</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
              <span>{usedGB.toFixed(2)} GB of {totalGB} GB used</span>
              <span>{percentageUsed}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${
                  percentageUsed > 90 ? 'bg-red-500' : 
                  percentageUsed > 70 ? 'bg-yellow-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${percentageUsed}%` }}
              ></div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {percentageUsed > 90 
                ? 'Your storage is almost full. Consider upgrading your plan.' 
                : percentageUsed > 70 
                ? 'Your storage is getting full.'
                : 'You have plenty of storage remaining.'}
            </p>
          </div>
          
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Storage by type</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-indigo-600 mr-2"></div>
                  <span className="text-sm text-gray-600">Photos</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatFileSize(usedGB * 0.8 * 1024 * 1024 * 1024)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-indigo-400 mr-2"></div>
                  <span className="text-sm text-gray-600">Videos</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatFileSize(usedGB * 0.15 * 1024 * 1024 * 1024)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-indigo-200 mr-2"></div>
                  <span className="text-sm text-gray-600">Other</span>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {formatFileSize(usedGB * 0.05 * 1024 * 1024 * 1024)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Large Files</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSortBy('recent')}
                className={`px-3 py-1 text-sm rounded-md ${
                  sortBy === 'recent' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Most Recent
              </button>
              <button
                onClick={() => setSortBy('size')}
                className={`px-3 py-1 text-sm rounded-md ${
                  sortBy === 'size' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Largest
              </button>
            </div>
          </div>
        </div>
        
        {storage.files.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {[...storage.files]
              .sort((a, b) => {
                if (sortBy === 'size') {
                  return b.file_size - a.file_size;
                }
                return new Date(b.created_at) - new Date(a.created_at);
              })
              .slice(0, 10)
              .map((file) => (
                <li key={file.id} className="hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                        <ServerIcon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            {file.original_name || 'untitled.jpg'}
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {file.file_type || 'image/jpeg'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 sm:flex sm:justify-between">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              {formatFileSize(file.file_size || 0)}
                            </p>
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                            <p>
                              Uploaded on{' '}
                              <time dateTime={file.created_at}>
                                {new Date(file.created_at).toLocaleDateString()}
                              </time>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No files uploaded</h3>
            <p className="mt-1 text-sm text-gray-500">
              Upload your first file to get started.
            </p>
          </div>
        )}
      </div>
    </DetailLayout>
  );
}
