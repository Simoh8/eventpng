import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRightOnRectangleIcon, 
  PhotoIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  Cog6ToothIcon,
  CalendarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const stats = [
  { name: 'Total Galleries', value: '12', icon: PhotoIcon, change: '+2', changeType: 'positive' },
  { name: 'Active Sessions', value: '5', icon: UserGroupIcon, change: '+1', changeType: 'positive' },
  { name: 'Earnings', value: '$2,450', icon: CurrencyDollarIcon, change: '+$320', changeType: 'positive' },
  { name: 'Storage Used', value: '8.7 GB', icon: Cog6ToothIcon, change: '2.1 GB', changeType: 'negative' },
];

const recentActivity = [
  { id: 1, action: 'Uploaded 24 photos to', gallery: 'Summer Wedding', time: '2h ago' },
  { id: 2, action: 'Created new gallery', gallery: 'Family Portraits', time: '1d ago' },
  { id: 3, action: 'Received new booking for', gallery: 'Maternity Shoot', time: '2d ago' },
  { id: 4, action: 'Edited', gallery: 'Portfolio Showcase', time: '3d ago' },
];

export default function PhotographerDashboard() {
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
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Photographer Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.name || 'Photographer'}</p>
          </div>
          {/* <button
            onClick={handleLogout}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
            Sign out
          </button> */}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <dt className="text-sm font-medium text-gray-500 truncate flex items-center">
                    <Icon className="h-5 w-5 mr-2 text-indigo-600" />
                    {stat.name}
                  </dt>
                  <dd className="mt-1 flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                    <div className={`ml-2 flex items-baseline text-sm font-semibold ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </div>
                  </dd>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {recentActivity.map((activity) => (
              <li key={activity.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-indigo-600 truncate">
                    <span className="capitalize">{activity.action}</span>{' '}
                    <span className="text-gray-900">{activity.gallery}</span>
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/galleries/new"
                className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-center hover:bg-gray-50"
              >
                <PhotoIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <span className="font-medium">Create New Gallery</span>
              </Link>
              
              {(user?.is_staff || user?.is_superuser) && (
                <Link
                  to="/admin/events"
                  className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-center hover:bg-gray-50"
                >
                  <CalendarIcon className="h-6 w-6 text-indigo-600 mr-2" />
                  <span className="font-medium">Manage Events</span>
                </Link>
              )}
              
              <button
                type="button"
                className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-center hover:bg-gray-50"
              >
                <UserGroupIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <span className="font-medium">View Sessions</span>
              </button>
              <button
                type="button"
                className="bg-white border border-gray-300 rounded-lg p-4 flex items-center justify-center hover:bg-gray-50"
              >
                <CurrencyDollarIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <span className="font-medium">View Earnings</span>
              </button>
            </div>
            
            {(user?.is_staff || user?.is_superuser) && (
              <div className="mt-4">
                <Link
                  to="/admin/events/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Add New Event
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Features */}
      <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Additional Features</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/sessions"
            className="bg-white overflow-hidden shadow rounded-lg p-6 hover:bg-gray-50 transition-colors duration-150"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Manage Sessions</h3>
                <p className="mt-1 text-sm text-gray-500">View and manage your photo sessions</p>
              </div>
            </div>
          </Link>
          <Link
            to="/settings"
            className="bg-white overflow-hidden shadow rounded-lg p-6 hover:bg-gray-50 transition-colors duration-150"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <Cog6ToothIcon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Account Settings</h3>
                <p className="mt-1 text-sm text-gray-500">Update your profile and preferences</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
