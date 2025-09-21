import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ArrowRightOnRectangleIcon,
  HeartIcon,
  PhotoIcon,
  ShoppingCartIcon,
  ClockIcon,
  StarIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import { API_ENDPOINTS } from '../utils/apiEndpoints';
import { toast } from 'react-toastify';

// Default stats data structure
const defaultStats = [
  { name: 'Purchased Photos', value: '0', icon: PhotoIcon, color: 'bg-blue-100 text-blue-600' },
  { name: 'Favorites', value: '0', icon: HeartIcon, color: 'bg-pink-100 text-pink-600' },
  { name: 'Orders', value: '0', icon: ShoppingCartIcon, color: 'bg-green-100 text-green-600' },
  { name: 'Pending Downloads', value: '0', icon: ClockIcon, color: 'bg-yellow-100 text-yellow-600' },
];

export default function CustomerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [dashboardData, setDashboardData] = useState({
    stats: [...defaultStats],
    recentPurchases: [],
    favorites: [],
    orders: [],
    loading: true,
    error: null
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setDashboardData(prev => ({ ...prev, loading: true, error: null }));
      
      // Fetch all data in parallel
      const [dashboardRes, purchasesRes, favoritesRes, ordersRes] = await Promise.all([
        api.get(API_ENDPOINTS.CUSTOMER.DASHBOARD),
        api.get(API_ENDPOINTS.CUSTOMER.PURCHASES, { params: { limit: 2 } }),
        api.get(API_ENDPOINTS.CUSTOMER.FAVORITES, { params: { limit: 2 } }),
        api.get(API_ENDPOINTS.CUSTOMER.ORDERS, { params: { limit: 2 } })
      ]);

      // Process the data
      const stats = [...defaultStats];
      
      // Update stats with real data
      if (dashboardRes.data) {
        const data = dashboardRes.data;
        stats[0].value = data.purchasedPhotos?.toString() || '0';
        stats[1].value = data.favoritesCount?.toString() || '0';
        stats[2].value = data.ordersCount?.toString() || '0';
        stats[3].value = data.pendingDownloads?.toString() || '0';
      }

      setDashboardData({
        stats,
        recentPurchases: purchasesRes.data?.results || [],
        favorites: favoritesRes.data?.results || [],
        orders: ordersRes.data?.results || [],
        loading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setDashboardData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load dashboard data. Please try again later.'
      }));
      toast.error('Failed to load dashboard data');
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const { stats, recentPurchases, favorites, orders, loading, error } = dashboardData;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Loading dashboard...</h3>
          <p className="mt-1 text-sm text-gray-500">Please wait while we load your data.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={fetchDashboardData}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <ArrowPathIcon className="-ml-1 mr-2 h-5 w-5" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <div className="flex items-center space-x-4">
            <Link
              to="/gallery"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Search Photos
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-primary-600 text-2xl font-bold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </span>
              </div>
              <div className="ml-4">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'Customer'}!</h2>
                <p className="mt-1 text-sm text-gray-500">Here's what's happening with your account.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center">
                    <div className={`flex-shrink-0 p-3 rounded-md ${stat.color} bg-opacity-20`}>
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div className="ml-4">
                      <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                      <dd className="text-2xl font-semibold text-gray-900">
                        {loading ? (
                          <div className="h-8 w-12 bg-gray-200 rounded animate-pulse"></div>
                        ) : (
                          stat.value
                        )}
                      </dd>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent Purchases */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Purchases</h3>
                {recentPurchases.length > 0 && (
                  <Link 
                    to="/purchases" 
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    View all
                  </Link>
                )}
              </div>
              {loading ? (
                <div className="p-6 text-center text-gray-500">
                  <ArrowPathIcon className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  <p className="mt-2">Loading purchases...</p>
                </div>
              ) : recentPurchases.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <p>No recent purchases found.</p>
                  <div className="mt-4">
                    <Link
                      to="/gallery"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Browse Photos
                    </Link>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="divide-y divide-gray-200">
                    {recentPurchases.map((item) => (
                      <div key={item.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-16 w-16 rounded-md overflow-hidden bg-gray-200">
                            {item.image ? (
                              <img
                                className="h-full w-full object-cover"
                                src={item.image}
                                alt={item.title || 'Purchased item'}
                              />
                            ) : (
                              <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-400">
                                <PhotoIcon className="h-8 w-8" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium text-gray-900">{item.title || 'Untitled Item'}</h4>
                              {item.price && (
                                <p className="text-sm font-medium text-gray-900">
                                  ${parseFloat(item.price).toFixed(2)}
                                </p>
                              )}
                            </div>
                            {item.event && (
                              <p className="text-sm text-gray-500">{item.event}</p>
                            )}
                            {item.date && (
                              <div className="mt-2 flex items-center text-sm text-gray-500">
                                <span>Purchased on {formatDate(item.date)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex justify-between">
                          <button
                            type="button"
                            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <ShareIcon className="h-4 w-4 mr-1" />
                            Share
                          </button>
                          <a
                            href={item.downloadLink}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 px-6 py-4 text-sm border-t border-gray-200">
                    <Link to="/purchases" className="font-medium text-primary-600 hover:text-primary-500">
                      View all purchases
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Favorites */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-4">
                <Link
                  to="/browse"
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-blue-100 text-blue-600 mr-3">
                      <PhotoIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Browse Photos</h4>
                      <p className="text-xs text-gray-500">Discover amazing event photos</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>

                <Link
                  to="/favorites"
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:border-pink-300 hover:bg-pink-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-pink-100 text-pink-600 mr-3">
                      <HeartIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Your Favorites</h4>
                      <p className="text-xs text-gray-500">View your saved photos</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>

                <Link
                  to="/orders"
                  className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
                >
                  <div className="flex items-center">
                    <div className="p-2 rounded-md bg-green-100 text-green-600 mr-3">
                      <ShoppingCartIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Order History</h4>
                      <p className="text-xs text-gray-500">Track your orders</p>
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Favorites */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Your Favorites</h3>
                  <Link 
                    to="/favorites"
                    className="text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    View all
                  </Link>
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  {favorites.map((item) => (
                    <div key={item.id} className="group relative">
                      <div className="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-gray-200">
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover object-center group-hover:opacity-75"
                        />
                      </div>
                      <div className="mt-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{item.title}</h4>
                        <p className="text-xs text-gray-500">${item.price}</p>
                      </div>
                      <button className="absolute top-2 right-2 p-1 rounded-full bg-white bg-opacity-80 text-red-500 hover:bg-opacity-100">
                        <HeartIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}