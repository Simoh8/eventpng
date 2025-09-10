import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../../config';

export default function EventForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    location: '',
    privacy: 'public',
  });
  const [errors, setErrors] = useState({});

  // Fetch event data if editing
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      if (!isEditing) return null;
      const response = await fetch(`${API_BASE_URL}/api/events/${id}/`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch event');
      return response.json();
    },
    enabled: isEditing,
  });

  // Set form data when event data is loaded
  useEffect(() => {
    if (event) {
      const { name, description, date, location, privacy } = event;
      setFormData({
        name,
        description: description || '',
        date: date.split('T')[0], // Format date for input[type="date"]
        location: location || '',
        privacy,
      });
    }
  }, [event]);

  // Create/Update event mutation
  const mutation = useMutation({
    mutationFn: async (data) => {
      const url = isEditing 
        ? `${API_BASE_URL}/api/events/${id}/`
        : `${API_BASE_URL}/api/events/`;
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access')}`,
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to save event');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      navigate('/admin/events');
    },
    onError: (error) => {
      if (error.message.includes('Failed to save event')) {
        setErrors({ submit: error.message });
      } else {
        // Handle validation errors
        const errorData = JSON.parse(error.message);
        setErrors(errorData);
      }
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    
    // Basic validation
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Event name is required';
    if (!formData.date) newErrors.date = 'Date is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    mutation.mutate(formData);
  };

  if (isLoading && isEditing) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">
          {isEditing ? 'Edit Event' : 'Create New Event'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {isEditing 
            ? 'Update the event details below.'
            : 'Fill in the details to create a new event.'}
        </p>
      </div>

      {errors.submit && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Event Information</h3>
              <p className="mt-1 text-sm text-gray-500">
                Basic details about the event.
              </p>
            </div>
            <div className="mt-5 md:mt-0 md:col-span-2">
              <div className="grid grid-cols-6 gap-6">
                <div className="col-span-6 sm:col-span-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600" id="name-error">
                      {errors.name}
                    </p>
                  )}
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    id="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md border ${
                      errors.date ? 'border-red-300' : 'border-gray-300'
                    } shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm`}
                  />
                  {errors.date && (
                    <p className="mt-2 text-sm text-red-600" id="date-error">
                      {errors.date}
                    </p>
                  )}
                </div>

                <div className="col-span-6 sm:col-span-3">
                  <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    id="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="col-span-6">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                      value={formData.description}
                      onChange={handleChange}
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Brief description about the event.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow px-4 py-5 sm:rounded-lg sm:p-6">
          <div className="md:grid md:grid-cols-3 md:gap-6">
            <div className="md:col-span-1">
              <h3 className="text-lg font-medium leading-6 text-gray-900">Privacy Settings</h3>
              <p className="mt-1 text-sm text-gray-500">
                Control who can view this event and its galleries.
              </p>
            </div>
            <div className="mt-5 space-y-6 md:mt-0 md:col-span-2">
              <fieldset>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="public"
                      name="privacy"
                      type="radio"
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      value="public"
                      checked={formData.privacy === 'public'}
                      onChange={handleChange}
                    />
                    <label htmlFor="public" className="ml-3 block text-sm font-medium text-gray-700">
                      Public
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="private"
                      name="privacy"
                      type="radio"
                      className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      value="private"
                      checked={formData.privacy === 'private'}
                      onChange={handleChange}
                    />
                    <label htmlFor="private" className="ml-3 block text-sm font-medium text-gray-700">
                      Private - Require PIN to view
                    </label>
                  </div>
                </div>
                {formData.privacy === 'private' && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-md">
                    <p className="text-sm text-yellow-700">
                      A 6-digit PIN will be automatically generated when you save this event. 
                      Share this PIN with people who should have access to view this event.
                    </p>
                  </div>
                )}
              </fieldset>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <Link
            to="/admin/events"
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={mutation.isLoading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditing ? 'Updating...' : 'Creating...'}
              </>
            ) : isEditing ? (
              'Update Event'
            ) : (
              'Create Event'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
