import { Fragment, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PhotoIcon, XMarkIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Listbox, Transition } from '@headlessui/react';
import toast from 'react-hot-toast';
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
      return data.results;
    } else if (Array.isArray(data)) {
      return data;
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Fetch events for the current photographer
  const { 
    data: events = [], 
    isLoading: isLoadingEvents, 
    error: eventsError,
    refetch: refetchEvents 
  } = useQuery({
    queryKey: ['photographerEvents'],
    queryFn: fetchEvents,
    enabled: true,
    retry: 1,
    refetchOnWindowFocus: false,
    onError: (error) => {
      console.error('Error fetching events:', error);
    },
    select: (data) => {
      const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
      return results.map(event => ({
        id: event.id,
        name: event.name || 'Unnamed Event',
        date: event.date ? new Date(event.date).toLocaleDateString() : '',
        ...event
      })).sort((a, b) => {
        if (a.date && b.date) {
          return new Date(b.date) - new Date(a.date);
        }
        return 0;
      });
    }
  });

  // Handle dropdown open/close and refetch events when opened
  const handleOpenChange = (isOpen) => {
    setIsDropdownOpen(isOpen);
    if (isOpen) {
      refetchEvents();
    }
  };

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
    onSuccess: (data) => {
      toast.success('Gallery created successfully!', {
        position: 'top-center',
        duration: 4000,
      });
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create gallery. Please try again.', {
        position: 'top-center',
        duration: 4000,
      });
    }
  });

  // Handle file selection
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    const newPreviews = [];
    const newPhotos = [];
    
    files.forEach((file) => {
      const preview = {
        id: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        type: file.type,
      };
      
      newPreviews.push(preview);
      newPhotos.push(file);
    });
    
    setPreviews([...previews, ...newPreviews]);
    setPhotos([...photos, ...newPhotos]);
  };

  // Handle file removal
  const handleRemoveFile = (index) => {
    const newPreviews = [...previews];
    const newPhotos = [...photos];
    
    // Revoke the object URL to prevent memory leaks
    if (newPreviews[index]?.id) {
      URL.revokeObjectURL(newPreviews[index].id);
    }
    
    newPreviews.splice(index, 1);
    newPhotos.splice(index, 1);
    
    setPreviews(newPreviews);
    setPhotos(newPhotos);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedEvent) {
      toast.error('Please select an event');
      return;
    }
    
    if (photos.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }
    
    createGalleryMutation.mutate({
      eventId: selectedEvent,
      photos,
      title,
      description,
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Create New Gallery</h2>
            <p className="mt-1 text-sm text-gray-500">
              Upload photos to create a new gallery for an event.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Event Selection */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="event" className="block text-sm font-medium text-gray-700">
                  Select Event <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => refetchEvents()}
                  className="text-xs text-indigo-600 hover:text-indigo-800 whitespace-nowrap ml-2"
                  disabled={isLoadingEvents}
                >
                  {isLoadingEvents ? 'Refreshing...' : 'Refresh events'}
                </button>
              </div>
              
              <div className="relative mt-1">
                {isLoadingEvents ? (
                  <div className="p-3 bg-gray-50 rounded-md border border-gray-200 text-sm text-gray-500">
                    Loading events...
                  </div>
                ) : eventsError ? (
                  <div className="p-3 bg-red-50 rounded-md border border-red-200">
                    <p className="text-sm text-red-600">
                      Failed to load events.
                      <button 
                        onClick={() => refetchEvents()} 
                        className="ml-2 text-indigo-600 hover:text-indigo-800"
                      >
                        Try again
                      </button>
                    </p>
                  </div>
                ) : events.length === 0 ? (
                  <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200 text-sm text-yellow-700">
                    No events found. Please create an event first.
                  </div>
                ) : (
                  <div className="w-full">
                    <Listbox 
                      value={selectedEvent} 
                      onChange={setSelectedEvent} 
                      as="div"
                      onOpenChange={handleOpenChange}
                      className="relative"
                    >
                      {({ open }) => (
                        <>
                          <Listbox.Button className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm">
                            <span className="block truncate">
                              {selectedEvent 
                                ? events.find(e => e.id.toString() === selectedEvent)?.name || 'Select an event'
                                : 'Select an event'}
                            </span>
                            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                            </span>
                          </Listbox.Button>

                          <Transition
                            show={open}
                            as={Fragment}
                            leave="transition ease-in duration-100"
                            leaveFrom="opacity-100"
                            leaveTo="opacity-0"
                          >
                            <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                              {events.map((event) => (
                                <Listbox.Option
                                  key={event.id}
                                  className={({ active }) =>
                                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                      active ? 'bg-indigo-100 text-indigo-900' : 'text-gray-900'
                                    }`
                                  }
                                  value={event.id}
                                >
                                  {({ selected }) => (
                                    <>
                                      <span
                                        className={`block truncate ${
                                          selected ? 'font-medium' : 'font-normal'
                                        }`}
                                      >
                                        {event.name} {event.date ? `(${event.date})` : ''}
                                      </span>
                                      {selected ? (
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-600">
                                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </Listbox.Option>
                              ))}
                            </Listbox.Options>
                          </Transition>
                        </>
                      )}
                    </Listbox>
                    
                    {selectedEvent && (() => {
                      const selected = events.find(e => e.id.toString() === selectedEvent.toString());
                      console.log('Selected event:', selected); // Debug log
                      return selected ? (
                        <div className="mt-2 p-2 bg-blue-50 rounded-md">
                          <p className="text-sm font-medium text-blue-800">
                            Selected Event: {selected.name || 'Unnamed Event'}
                          </p>
                          {selected.date && (
                            <p className="text-xs text-blue-600">
                              Date: {selected.date}
                            </p>
                          )}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Gallery Title */}
            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Gallery Title (Optional)
                </label>
                <span className="text-xs text-gray-500">
                  {title.length}/50 characters
                </span>
              </div>
              <div className="mt-1">
                <input
                  type="text"
                  id="title"
                  name="title"
                  maxLength={50}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="E.g., Summer Wedding 2023"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description (Optional)
              </label>
              <div className="mt-1">
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Add a brief description of this gallery..."
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Photos <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                    >
                      <span>Upload files</span>
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

            {/* Selected Files Preview */}
            {previews.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Selected Files ({previews.length})
                </h3>
                <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                  {previews.map((preview, index) => (
                    <li key={index} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                      <div className="w-0 flex-1 flex items-center">
                        <PhotoIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                        <span className="ml-2 flex-1 w-0 truncate">
                          {preview.name}
                        </span>
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="font-medium text-red-600 hover:text-red-500"
                        >
                          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-5">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedEvent || photos.length === 0 || createGalleryMutation.isLoading}
                  className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                    !selectedEvent || photos.length === 0 || createGalleryMutation.isLoading
                      ? 'bg-indigo-300 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                  }`}
                >
                  {createGalleryMutation.isLoading ? 'Creating...' : 'Create Gallery'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
