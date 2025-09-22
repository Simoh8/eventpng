import React, { useState, useEffect } from 'react';
import { UserGroupIcon, GlobeAltIcon, DevicePhoneMobileIcon, 
  ComputerDesktopIcon, ClockIcon, CalendarIcon } from '@heroicons/react/24/outline';
import DetailLayout from '../../components/dashboard/DetailLayout';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../utils/apiEndpoints';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SessionsDetail() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState({
    active: 0,
    total: 0,
    recent: 0,
    list: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('today');

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      
      // Only fetch stats, not sessions
      const statsRes = await api.get(API_ENDPOINTS.PHOTOGRAPHER_DASHBOARD.STATS);

      // Use mock data for sessions since the endpoint doesn't exist
      const mockSessions = [
        {
          id: '1',
          device: 'Chrome on Windows',
          ip: '192.168.1.1',
          location: 'New York, US',
          lastActive: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
          isCurrent: true,
          deviceType: 'desktop'
        },
        {
          id: '2',
          device: 'Safari on iPhone',
          ip: '192.168.1.2',
          location: 'San Francisco, US',
          lastActive: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
          isCurrent: false,
          deviceType: 'mobile'
        },
        {
          id: '3',
          device: 'Firefox on Mac',
          ip: '192.168.1.3',
          location: 'London, UK',
          lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          isCurrent: false,
          deviceType: 'desktop'
        },
        {
          id: '4',
          device: 'Chrome on Android',
          ip: '192.168.1.4',
          location: 'Tokyo, Japan',
          lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
          isCurrent: false,
          deviceType: 'mobile'
        },
        {
          id: '5',
          device: 'Safari on Mac',
          ip: '192.168.1.5',
          location: 'Sydney, Australia',
          lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 1 week ago
          isCurrent: false,
          deviceType: 'desktop'
        }
      ];

      if (statsRes.data) {
        setSessions({
          active: mockSessions.filter(s => s.isCurrent).length,
          total: mockSessions.length,
          recent: mockSessions.filter(s => 
            new Date(s.lastActive) > new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)
          ).length,
          list: mockSessions
        });
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);
    
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }
    
    return 'just now';
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <DevicePhoneMobileIcon className="h-5 w-5 text-gray-500" />;
      default:
        return <ComputerDesktopIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <DetailLayout title="Sessions" onBack={handleBackToDashboard}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DetailLayout>
    );
  }

  return (
    <DetailLayout title="Sessions">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Active Sessions</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{sessions.active}</dd>
            <dd className="text-sm text-green-600">
              {sessions.recent} in the last 7 days
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Sessions</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">{sessions.total}</dd>
            <dd className="text-sm text-gray-500">
              {sessions.list.length} devices
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Most Active Device</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">
              {sessions.list.length > 0 ? sessions.list[0].device : 'N/A'}
            </dd>
            <dd className="text-sm text-gray-500">
              {sessions.list.length > 0 ? formatTimeAgo(sessions.list[0].lastActive) : ''}
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Locations</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">
              {new Set(sessions.list.map(s => s.location)).size}
            </dd>
            <dd className="text-sm text-gray-500">
              Unique locations
            </dd>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Active Sessions</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeRange('today')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === 'today' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimeRange('week')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === 'week' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                This Week
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === 'month' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                This Month
              </button>
            </div>
          </div>
        </div>
        
        {sessions.list.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {sessions.list
              .filter(session => {
                const sessionDate = new Date(session.lastActive);
                const now = new Date();
                
                if (timeRange === 'today') {
                  return sessionDate.toDateString() === now.toDateString();
                } else if (timeRange === 'week') {
                  const oneWeekAgo = new Date();
                  oneWeekAgo.setDate(now.getDate() - 7);
                  return sessionDate >= oneWeekAgo;
                }
                return true; // month or all
              })
              .sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive))
              .map((session) => (
                <li key={session.id} className="hover:bg-gray-50">
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          {getDeviceIcon(session.deviceType)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {session.device}
                            {session.isCurrent && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Current
                              </span>
                            )}
                          </p>
                          <div className="flex items-center text-sm text-gray-500">
                            <GlobeAltIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            <span>{session.location}</span>
                            <span className="mx-1">•</span>
                            <span>{session.ip}</span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <div className="text-sm text-gray-500 flex items-center">
                          <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <span>{formatTimeAgo(session.lastActive)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No active sessions</h3>
            <p className="mt-1 text-sm text-gray-500">
              {timeRange === 'today' 
                ? "No sessions today." 
                : timeRange === 'week'
                ? "No sessions this week."
                : "No sessions found."}
            </p>
          </div>
        )}
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Session Activity</h3>
        </div>
        <div className="px-4 py-5 sm:p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No activity data</h3>
              <p className="mt-1 text-sm text-gray-500">
                Session activity will appear here when available.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DetailLayout>
  );
}