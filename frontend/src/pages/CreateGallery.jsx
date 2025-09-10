import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';
import { getProtectedImageUrl } from '../utils/imageUtils';

// Fetch events for the current photographer
const fetchEvents = async () => {
  const token = localStorage.getItem('access');
  console.log('Fetching events from:', `${API_BASE_URL}/api/gallery/events/`);
  console.log('Using token:', token ? 'Token exists' : 'No token found');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/gallery/events/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { detail: errorText };
      }
      console.error('Failed to fetch events:', errorData);
      throw new Error(errorData.detail || 'Failed to fetch events');
    }
    
    const data = await response.json();
    console.log('Events data received:', data);
    
    // Handle both paginated and non-paginated responses
    if (data && data.results && Array.isArray(data.results)) {
      return data.results; // Return the results array from paginated response
    } else if (Array.isArray(data)) {
      return data; // Return the array directly if not paginated
    }
    return [];
  } catch (error) {
    console.error('Error in fetchEvents:', error);
    throw error;
  }
};

// Function to upload gallery
const createGallery = async ({ eventId, photos, title, description }) => {
  const token = localStorage.getItem('access');
  if (!token) {
    throw new Error('No authentication token found. Please log in again.');
  }

  const formData = new FormData();
  formData.append('event', eventId);
  formData.append('title', title);
  formData.append('description', description || '');
  
  // Append each photo to the form data
  photos.forEach((photo) => {
    formData.append('photos', photo);
  });

  console.log('Creating gallery with data:', {
    eventId,
    title,
    photoCount: photos.length,
  });

  const response = await fetch(`${API_BASE_URL}/api/gallery/galleries/create/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Don't set Content-Type header when using FormData,
      // let the browser set it with the correct boundary
    },
    body: formData,
  });

  const responseData = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    console.error('Failed to create gallery:', {
      status: response.status,
      statusText: response.statusText,
      response: responseData,
    });
    
    throw new Error(
      responseData.detail || 
      responseData.message || 
      `Failed to create gallery: ${response.status} ${response.statusText}`
    );
  }

  return responseData;
};

export default function CreateGallery() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedEvent, setSelectedEvent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([]);
  
  const [previews, setPreviews] = useState([]);
  
  // Fetch events for the current photographer
  const { data: events = [], isLoading: isLoadingEvents, error: eventsError } = useQuery({
    queryKey: ['photographerEvents'],
    queryFn: fetchEvents,
    enabled: !!user?.is_photographer,
    retry: 1, // Only retry once on failure
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    select: (data) => {
      // Transform the data to ensure we have the expected format
      return Array.isArray(data) 
        ? data.map(event => ({
            id: event.id,
            name: event.name || 'Unnamed Event',
            date: event.date ? new Date(event.date).toLocaleDateString() : ''
          }))
        : [];
    }
  });
  
  // Log events for debugging
  useEffect(() => {
    if (events.length > 0) {
      console.log('Fetched events:', events);
    }
  }, [events]);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      previews.forEach(preview => {
        if (preview?.id && preview.id.startsWith('blob:')) {
          URL.revokeObjectURL(preview.id);
        }
      });
    };
  }, [previews]);

  // Create gallery mutation
  const createGalleryMutation = useMutation({
    mutationFn: createGallery,
    onSuccess: () => {
      navigate('/dashboard');
    },
  });

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const newPreviews = [];
    const newPhotos = [];
    
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      
      const preview = {
        id: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      };
      
      newPreviews.push(preview);
      newPhotos.push(file);
    });
    
    setPreviews(prev => [...prev, ...newPreviews]);
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index) => {
    const newPreviews = [...previews];
    const newPhotos = [...photos];
    
    // Safely revoke the object URL if it exists and is a blob URL
    if (newPreviews[index]?.id && newPreviews[index].id.startsWith('blob:')) {
      URL.revokeObjectURL(newPreviews[index].id);
    }
    
    newPreviews.splice(index, 1);
    newPhotos.splice(index, 1);
    
    setPreviews(newPreviews);
    setPhotos(newPhotos);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedEvent) {
      alert('Please select an event');
      return;
    }
    
    if (!title.trim()) {
      alert('Please enter a title for the gallery');
      return;
    }
    
    if (photos.length === 0) {
      alert('Please upload at least one photo');
      return;
    }
    
    try {
      await createGalleryMutation.mutateAsync({
        eventId: selectedEvent,
        title: title.trim(),
        description: description.trim(),
        photos,
      });
      
      // Show success message
      alert('Gallery created successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setSelectedEvent('');
      setPhotos([]);
      setPreviews([]);
      
      // Navigate to galleries list or dashboard
      navigate('/dashboard');
      
    } catch (error) {
      console.error('Error creating gallery:', error);
      alert(`Failed to create gallery: ${error.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Gallery</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Event Selection */}
            <div className="col-span-full">
              <label htmlFor="event" className="block text-sm font-medium leading-6 text-gray-900">
                Select Event
              </label>
              <select
                id="event"
                name="event"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:max-w-xs sm:text-sm sm:leading-6"
                required
                disabled={isLoadingEvents}
              >
                <option value="">
                  {isLoadingEvents ? 'Loading events...' : 'Select an event'}
                </option>
                {eventsError ? (
                  <option value="" disabled>Error loading events</option>
                ) : (
                  events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} {event.date ? `- ${event.date}` : ''}
                    </option>
                  ))
                )}
              </select>
              {eventsError && (
                <p className="mt-2 text-sm text-red-600">
                  Error loading events. Please try again.
                </p>
              )}
            </div>

            {/* Gallery Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Gallery Title (Optional)
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="E.g., Wedding Highlights"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (Optional)
              </label>
              <textarea
                id="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Add a description for this gallery..."
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Photos</label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Upload photos</span>
                      <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        multiple 
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </div>
              </div>
            </div>

            {/* Image Previews */}
            {previews.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Selected Photos ({previews.length})</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {previews.map((preview, index) => (
                    <div key={preview.id} className="relative group">
                      <img
                        src={preview.id}
                        alt={`Preview ${index + 1}`}
                        className="h-32 w-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove photo"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={createGalleryMutation.isLoading || photos.length === 0 || !selectedEvent}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createGalleryMutation.isLoading ? 'Creating...' : 'Create Gallery'}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
