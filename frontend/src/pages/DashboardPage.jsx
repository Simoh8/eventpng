import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

const stats = [
  { name: 'Total Galleries', value: '12', change: '+2', changeType: 'positive' },
  { name: 'Photos Uploaded', value: '1,234', change: '+122', changeType: 'positive' },
  { name: 'Active Sessions', value: '24', change: '+3', changeType: 'positive' },
  { name: 'Storage Used', value: '4.2 GB', change: '1.2 GB', changeType: 'negative' },
];

const recentActivity = [
  { id: 1, user: 'John Doe', action: 'uploaded 12 photos to', gallery: 'Summer Wedding', time: '2h ago' },
  { id: 2, user: 'Jane Smith', action: 'purchased a print from', gallery: 'Portrait Session', time: '5h ago' },
  { id: 3, user: 'Alex Johnson', action: 'commented on', gallery: 'Nature Landscapes', time: '1d ago' },
  { id: 4, user: 'Sarah Wilson', action: 'shared', gallery: 'Family Portraits', time: '2d ago' },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center w-full">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}</h1>
          <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
            Sign out
          </button>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Stats */}
        <div className="mt-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                  <dd className="mt-1 flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stat.change}
                    </div>
                  </dd>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
              </div>
              <div className="bg-white shadow overflow-hidden sm:rounded-b-lg">
                <ul className="divide-y divide-gray-200">
                  {recentActivity.map((activity) => (
                    <li key={activity.id} className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-600 font-medium">
                            {activity.user.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-900">
                            {activity.user}{' '}
                            <span className="text-gray-500 font-normal">
                              {activity.action}{' '}
                              <Link to={`/gallery/${activity.gallery.toLowerCase().replace(/\s+/g, '-')}`} className="text-primary-600 hover:text-primary-500">
                                {activity.gallery}
                              </Link>
                            </span>
                          </p>
                          <p className="text-sm text-gray-500">{activity.time}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="bg-gray-50 px-6 py-4 text-sm border-t border-gray-200">
                  <Link to="/activity" className="font-medium text-primary-600 hover:text-primary-500">
                    View all activity
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <Link
                    to="/gallery/new"
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Create New Gallery
                  </Link>
                  <Link
                    to="/upload"
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Upload Photos
                  </Link>
                  <Link
                    to="/settings"
                    className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  >
                    Account Settings
                  </Link>
                </div>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Storage</h4>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-gray-500">
                    <span>6.5 GB of 10 GB used</span>
                    <span>65%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Galleries */}
            <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Galleries</h3>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  {['Summer Wedding', 'Portrait Session', 'Nature Landscapes', 'Family Portraits'].map((gallery, index) => (
                    <li key={index} className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500">
                          {gallery.split(' ').map(w => w[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-4 flex-1">
                        <Link
                          to={`/gallery/${gallery.toLowerCase().replace(/\s+/g, '-')}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          {gallery}
                        </Link>
                        <p className="text-sm text-gray-500">Last updated 2 days ago</p>
                      </div>
                      <div className="ml-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Link to="/galleries" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                    View all galleries
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
