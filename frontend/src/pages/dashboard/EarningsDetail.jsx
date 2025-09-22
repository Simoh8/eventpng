import React, { useState, useEffect } from 'react';
import { CurrencyDollarIcon, ArrowUpIcon, ArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import DetailLayout from '../../components/dashboard/DetailLayout';
import api from '../../utils/api';
import { API_ENDPOINTS } from '../../utils/apiEndpoints';

export default function EarningsDetail() {
  const [earnings, setEarnings] = useState({
    total: 0,
    recent: 0,
    monthly: [],
    transactions: []
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');

  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        setLoading(true);
        const [statsRes, transactionsRes] = await Promise.all([
          api.get(API_ENDPOINTS.PHOTOGRAPHER_DASHBOARD.STATS),
          api.get(API_ENDPOINTS.PAYMENTS.TRANSACTIONS)
        ]);

        // Mock monthly data - in a real app, this would come from the API
        const monthlyData = [
          { month: 'Jan', earnings: 0 },
          { month: 'Feb', earnings: 0 },
          { month: 'Mar', earnings: 0 },
          { month: 'Apr', earnings: 0 },
          { month: 'May', earnings: 0 },
          { month: 'Jun', earnings: 0 },
          { month: 'Jul', earnings: 0 },
          { month: 'Aug', earnings: 0 },
          { month: 'Sep', earnings: 0 },
          { month: 'Oct', earnings: 0 },
          { month: 'Nov', earnings: 0 },
          { month: 'Dec', earnings: 0 },
        ];

        // Update with actual data if available
        if (statsRes.data) {
          setEarnings({
            total: statsRes.data.earnings?.total || 0,
            recent: statsRes.data.earnings?.recent || 0,
            monthly: monthlyData,
            transactions: transactionsRes.data?.results || []
          });
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [timeRange]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <DetailLayout title="Earnings">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </DetailLayout>
    );
  }

  return (
    <DetailLayout title="Earnings">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Total Earnings</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{formatCurrency(earnings.total)}</dd>
            <dd className="text-sm text-green-600 flex items-center">
              <ArrowUpIcon className="h-4 w-4 mr-1" />
              {formatCurrency(earnings.recent)} this month
            </dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Available Balance</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">{formatCurrency(earnings.total * 0.8)}</dd>
            <dd className="text-sm text-gray-500">20% held for 7 days</dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Next Payout</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">
              {earnings.recent > 0 ? formatCurrency(earnings.recent * 0.8) : formatCurrency(0)}
            </dd>
            <dd className="text-sm text-gray-500">On {new Date(new Date().setDate(new Date().getDate() + 7)).toLocaleDateString()}</dd>
          </div>
        </div>
        
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-gray-500 truncate">Lifetime Earnings</dt>
            <dd className="mt-1 text-3xl font-semibold text-indigo-600">{formatCurrency(earnings.total)}</dd>
            <dd className="text-sm text-gray-500">Since {new Date().getFullYear() - 1}</dd>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Earnings Overview</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeRange('week')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === 'week' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === 'month' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === 'year' 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                Year
              </button>
            </div>
          </div>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No earnings data</h3>
              <p className="mt-1 text-sm text-gray-500">
                {timeRange === 'week' 
                  ? "This week's earnings will appear here"
                  : timeRange === 'month'
                  ? "This month's earnings will appear here"
                  : "This year's earnings will appear here"}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Transactions</h3>
        </div>
        
        {earnings.transactions.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {earnings.transactions.map((transaction) => (
              <li key={transaction.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.description || 'Photo Purchase'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.amount >= 0 ? '+' : ''}{formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {transaction.status === 'completed' ? 'Completed' : 'Pending'}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions</h3>
            <p className="mt-1 text-sm text-gray-500">Your transactions will appear here</p>
          </div>
        )}
      </div>
    </DetailLayout>
  );
}
