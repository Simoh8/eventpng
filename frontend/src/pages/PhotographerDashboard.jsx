import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRightOnRectangleIcon, 
  PhotoIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  Cog6ToothIcon,
  CalendarIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';

const initialStats = [
  { name: 'Total Galleries', value: '0', icon: PhotoIcon, change: '0', changeType: 'neutral' },
  { name: 'Active Sessions', value: '0', icon: UserGroupIcon, change: '0', changeType: 'neutral' },
  { name: 'Earnings', value: '$0', icon: CurrencyDollarIcon, change: '$0', changeType: 'neutral' },
  { name: 'Storage Used', value: '0 GB', icon: Cog6ToothIcon, change: '0 GB', changeType: 'neutral' },
];

const initialRecentActivity = [];

export default function PhotographerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(initialStats);
  const [recentActivity, setRecentActivity] = useState(initialRecentActivity);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // Fetch dashboard data from your API
        const [statsResponse, activityResponse] = await Promise.all([
          api.get('/api/photographer/dashboard/stats/'),
          api.get('/api/photographer/dashboard/activity/')
        ]);

        // Update stats with real data
        if (statsResponse.data) {
          const { galleries, activeSessions, earnings, storageUsed } = statsResponse.data;
          setStats([
            { 
              ...initialStats[0], 
              value: galleries.total.toString(), 
              change: `+${galleries.recent}`, 
              changeType: galleries.recent > 0 ? 'positive' : 'neutral' 
            },
            { 
              ...initialStats[1], 
              value: activeSessions.total.toString(), 
              change: activeSessions.recent > 0 ? `+${activeSessions.recent}` : '0', 
              changeType: activeSessions.recent > 0 ? 'positive' : 'neutral' 
            },
            { 
              ...initialStats[2], 
              value: `$${parseFloat(earnings.total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
              change: `+$${parseFloat(earnings.recent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
              changeType: parseFloat(earnings.recent) > 0 ? 'positive' : 'neutral' 
            },
            { 
              ...initialStats[3], 
              value: `${parseFloat(storageUsed.used).toFixed(1)} GB`, 
              change: `${storageUsed.change >= 0 ? '+' : ''}${storageUsed.change.toFixed(1)}%`, 
              changeType: storageUsed.change > 0 ? 'negative' : 'positive' 
            },
          ]);
        }

        // Update recent activity with real data
        if (activityResponse.data) {
          setRecentActivity(activityResponse.data.map(activity => ({
            id: activity.id,
            action: activity.action,
            gallery: activity.target,
            time: formatTimeAgo(activity.timestamp)
          })));
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }
    
    return 'Just now';
  };
  
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
      {isLoading ? (
        <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex justify-center items-center py-12">
            <ArrowPathIcon className="h-8 w-8 text-indigo-600 animate-spin" />
            <span className="ml-2 text-gray-600">Loading dashboard data...</span>
          </div>
        </div>
      ) : error ? (
        <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
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
                      <div className="mt-1 flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                        {(stat.change !== '0' && stat.change !== '$0' && stat.change !== '0%' && stat.change !== '+0.0%') && (
                          <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                            stat.changeType === 'positive' ? 'text-green-600' : 
                            stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {stat.change}
                          </div>
                        )}
                      </div>
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
              {recentActivity.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {recentActivity.map((activity) => (
                    <li key={activity.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors duration-150">
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
              ) : (
                <div className="px-4 py-12 text-center">
                  <p className="text-gray-500">No recent activity to display</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

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