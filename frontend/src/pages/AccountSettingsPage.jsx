import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AccountSettingsPage = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone_number: '',
    bio: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  // Fetch user data when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        
        const token = localStorage.getItem('access_token');
        const response = await api.get('/api/accounts/me/');
        const responseData = response.data;
        
        // The user data is directly in responseData.user
        const userData = responseData.user || {};
        const newFormData = {
          full_name: userData.full_name || '',
          email: userData.email || '',
          phone_number: userData.phone_number || '',
          bio: userData.bio || '',
        };
        
        setFormData(newFormData);
      } catch (error) {

        toast.error('Failed to load user data');
        if (error.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    
    setIsSaving(true);
    setErrors({});

    try {
      // Only send fields that are allowed to be updated
      const updateData = {
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        bio: formData.bio,
      };

      const response = await api.patch('/api/accounts/me/update/', updateData);
      
      // Update auth context with new user data
      if (response.data.data) {
        updateUser(response.data.data);
      } else {
        // Fallback to updating with current form data if user data not in response
        updateUser({ ...user, ...updateData });
      }
      
      toast.success('Profile updated successfully');
    } catch (error) {
      
      if (error.response?.data) {
        // Handle validation errors
        if (error.response.data.errors) {
          setErrors(error.response.data.errors);
        } else if (error.response.data.detail) {
          toast.error(error.response.data.detail);
        } else {
          toast.error('Failed to update profile. Please check your input.');
        }
      } else {
        toast.error('Failed to update profile. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldError = (fieldName) => {
    return errors && errors[fieldName] ? (
      <p className="mt-1 text-sm text-red-600">{errors[fieldName]}</p>
    ) : null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Loading your profile...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Account Settings</h2>
          <p className="mt-2 text-sm text-gray-600">
            Update your account information
          </p>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                id="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border ${
                  errors.full_name ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
              />
              {getFieldError('full_name')}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                Contact support to change your email address
              </p>
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone_number"
                id="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border ${
                  errors.phone_number ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
              />
              {getFieldError('phone_number')}
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                rows={3}
                value={formData.bio}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border ${
                  errors.bio ? 'border-red-300' : 'border-gray-300'
                } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
                placeholder="Tell us a bit about yourself..."
              />
              {getFieldError('bio')}
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className={`inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  isSaving ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
