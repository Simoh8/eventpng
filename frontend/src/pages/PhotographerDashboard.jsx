import { useState, useEffect, useCallback } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authService from '../services/authService';
import { 
  PhotoIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  Cog6ToothIcon,
  CalendarIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import { toast } from 'react-toastify';
import StatCard from '../components/dashboard/StatCard';
import { API_ENDPOINTS } from '../utils/apiEndpoints';

const initialStats = [
  { 
    name: 'Total Galleries', 
    value: '0', 
    icon: PhotoIcon, 
    change: '0', 
    changeType: 'neutral',
    path: API_ENDPOINTS.PHOTOGRAPHER_DASHBOARD.GALLERIES
  },
  { 
    name: 'Active Sessions', 
    value: '0', 
    icon: UserGroupIcon, 
    change: '0', 
    changeType: 'neutral',
    path: API_ENDPOINTS.PHOTOGRAPHER_DASHBOARD.SESSIONS
  },
  { 
    name: 'Earnings', 
    value: '$0', 
    icon: CurrencyDollarIcon, 
    change: '$0', 
    changeType: 'neutral',
    path: API_ENDPOINTS.PHOTOGRAPHER_DASHBOARD.EARNINGS
  },
  { 
    name: 'Storage Used', 
    value: '0 GB', 
    icon: Cog6ToothIcon, 
    change: '0 GB', 
    changeType: 'neutral',
    path: API_ENDPOINTS.PHOTOGRAPHER_DASHBOARD.STORAGE
  },
];

const initialRecentActivity = [];

const groupActivitiesByDay = (activities) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Group activities by gallery and action type
  const groupedActivities = activities.reduce((acc, activity) => {
    const key = `${activity.action}|${activity.gallery}`;
    if (!acc[key]) {
      acc[key] = {
        ...activity,
        count: 1,
        times: [activity.time]
      };
    } else {
      acc[key].count += 1;
      acc[key].times.push(activity.time);
    }
    return acc;
  }, {});

  // Convert to array and sort by most recent
  const sortedActivities = Object.values(groupedActivities)
    .sort((a, b) => new Date(b.times[0]) - new Date(a.times[0]));

  // Group by day
  const days = {};
  sortedActivities.forEach(activity => {
    const activityDate = new Date(activity.time);
    let dayKey;
    
    if (activityDate >= today) {
      dayKey = 'Today';
    } else if (activityDate >= yesterday) {
      dayKey = 'Yesterday';
    } else {
      dayKey = activityDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }

    if (!days[dayKey]) {
      days[dayKey] = [];
    }
    
    days[dayKey].push({
      ...activity,
      // Use the most recent time for display
      time: activity.times[0]
    });
  });

  // Convert to array format
  return Object.entries(days).map(([date, activities]) => ({
    date,
    activities
  }));
};

export default function PhotographerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(initialStats);
  const [allActivities, setAllActivities] = useState(initialRecentActivity);
  const [filteredActivities, setFilteredActivities] = useState(initialRecentActivity);
  const [activityFilter, setActivityFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds
  const currentUserEmail = user?.email || authService.getStoredUser()?.email;
  // console.log('Current user email:', currentUserEmail);
  
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!currentUserEmail) {
        throw new Error('User email not found. Please log in again.');
      }

      if (!currentUserEmail) {
        throw new Error('User email is required');
      }
      





      
      // Always include the email parameter
      const statsUrl = `${API_ENDPOINTS.PHOTOGRAPHER_DASHBOARD.STATS}?email=${encodeURIComponent(currentUserEmail)}`;
      const activityUrl = `${API_ENDPOINTS.PHOTOGRAPHER_DASHBOARD.ACTIVITY}?email=${encodeURIComponent(currentUserEmail)}`;

      
      // Fetch dashboard data from the API with user email filter
      const [statsResponse, activityResponse] = await Promise.all([
        api.get(statsUrl),
        api.get(activityUrl)
      ]);
      

      // Update stats with real data
      if (statsResponse.data) {
        const { galleries = { total: 0, recent: 0 }, 
                activeSessions = { total: 0, recent: 0 }, 
                earnings = { total: 0, recent: 0 }, 
                storageUsed = { used: 0, change: 0 } } = statsResponse.data;
        
        // console.log('Dashboard stats:', { galleries, activeSessions, earnings, storageUsed });
        
        setStats([
          { 
            ...initialStats[0], 
            value: (galleries.total || 0).toString(), 
            change: galleries.recent > 0 ? `+${galleries.recent}` : '0', 
            changeType: galleries.recent > 0 ? 'positive' : 'neutral',
            to: '/photographer-dashboard/galleries'
          },
          { 
            ...initialStats[1], 
            value: (activeSessions.total || 0).toString(), 
            change: activeSessions.recent > 0 ? `+${activeSessions.recent}` : '0', 
            changeType: activeSessions.recent > 0 ? 'positive' : 'neutral',
            to: '/photographer-dashboard/sessions'
          },
          { 
            ...initialStats[2], 
            value: `$${(earnings.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
            change: `+$${(earnings.recent || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 
            changeType: parseFloat(earnings.recent || 0) > 0 ? 'positive' : 'neutral',
            to: '/photographer-dashboard/earnings'
          },
          { 
            ...initialStats[3], 
            value: `${storageUsed.used || 0} GB`, 
            change: `${storageUsed.change >= 0 ? '+' : ''}${storageUsed.change || 0}%`, 
            changeType: (storageUsed.change || 0) > 0 ? 'negative' : 'positive',
            to: '/photographer-dashboard/storage'
          },
        ]);
      }

      // Update recent activity with real data
      if (activityResponse.data) {
        const formattedActivities = activityResponse.data.map(activity => ({
          id: activity.id,
          action: activity.action,
          gallery: activity.target,
          time: activity.timestamp, // Store the actual timestamp for grouping
          formattedTime: formatTimeAgo(activity.timestamp),
          amount: activity.amount,
          type: activity.type
        }));
        setAllActivities(formattedActivities);
        setFilteredActivities(formattedActivities);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to load dashboard data. Please try again later.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserEmail]); // Add currentUserEmail as a dependency

  // Filter activities based on the selected filter
  useEffect(() => {
    if (activityFilter === 'all') {
      setFilteredActivities(allActivities);
    } else if (activityFilter === 'uploads') {
      setFilteredActivities(allActivities.filter(activity => 
        activity.action.includes('upload')
      ));
    } else if (activityFilter === 'galleries') {
      setFilteredActivities(allActivities.filter(activity => 
        activity.action.includes('gallery') || activity.action.includes('created')
      ));
    }
  }, [activityFilter, allActivities]);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up auto-refresh
    const intervalId = setInterval(fetchDashboardData, CACHE_EXPIRY);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchDashboardData]); // Add fetchDashboardData to dependency array
  

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

  const location = useLocation();
  const isBaseRoute = location.pathname === '/photographer-dashboard';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center w-full">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Photographer Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.name || 'Photographer'}</p>
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
                {stats.map((stat) => (
                  <StatCard 
                    key={stat.name} 
                    stat={{
                      ...stat,
                      // Format the change with + sign if positive
                      change: stat.changeType === 'positive' && !stat.change.startsWith('+') && !stat.change.startsWith('-') 
                        ? `+${stat.change}` 
                        : stat.change
                    }} 
                    to={stat.path}
                  />
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    className="px-3 py-1 text-sm rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    onClick={() => setActivityFilter('all')}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-sm rounded-md text-gray-600 hover:bg-gray-100"
                    onClick={() => setActivityFilter('uploads')}
                  >
                    Uploads
                  </button>
                  <button
                    type="button"
                    className="px-3 py-1 text-sm rounded-md text-gray-600 hover:bg-gray-100"
                    onClick={() => setActivityFilter('galleries')}
                  >
                    Galleries
                  </button>
                </div>
              </div>
              
              <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                {filteredActivities.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {groupActivitiesByDay(filteredActivities).map((dayGroup, dayIndex) => (
                      <div key={dayIndex} className="p-4">
                        <h3 className="text-sm font-medium text-gray-500 mb-2">
                          {dayGroup.date === 'Today' ? 'Today' : dayGroup.date}
                        </h3>
                        <ul className="space-y-2">
                          {dayGroup.activities.map((activity, idx) => (
                            <li 
                              key={`${dayIndex}-${idx}`} 
                              className="flex items-start py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors duration-150"
                            >
                              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3 mt-0.5">
                                {activity.action.includes('upload') ? (
                                  <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                  </svg>
                                ) : (
                                  <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {activity.action === 'uploaded photo to' ? (
                                    <>
                                      Uploaded {activity.count > 1 ? `${activity.count} photos` : 'a photo'} to <span className="text-indigo-600">{activity.gallery}</span>
                                    </>
                                  ) : (
                                    <>
                                      Created a new gallery <span className="text-indigo-600">{activity.gallery}</span>
                                    </>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {typeof activity.time === 'string' ? formatTimeAgo(activity.time) : activity.formattedTime || 'Just now'}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-12 text-center">
                    <p className="text-gray-500">No recent activity to display</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Render child routes if not on base dashboard */}
          {!isBaseRoute ? (
            <Outlet />
          ) : (
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
          )}
        </main>
      </div>
    </div>
  );
}