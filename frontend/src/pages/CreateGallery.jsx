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
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/gallery/events/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { detail: errorText };
      }
      throw new Error(errorData.detail || 'Failed to fetch events');
    }
    
    const data = await response.json();
    
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
const createGallery = async ({ eventId, photos, title, description, isPublic, isActive, price, coverPhotoIndex }, { onProgress }) => {
  const token = localStorage.getItem('access');
  if (!token) {
    throw new Error('No authentication token found. Please log in again.');
  }

  const formData = new FormData();
  formData.append('event', eventId);
  formData.append('title', title);
  formData.append('description', description || '');
  formData.append('is_public', isPublic);
  formData.append('is_active', isActive);
  formData.append('price', price);
  
  // Append each photo to the form data
  photos.forEach((photo, index) => {
    formData.append('photos', photo);
    // If this is the cover photo, add a flag
    if (index === coverPhotoIndex) {
      formData.append('cover_photo_index', index);
    }
  });

  // Start processing simulation
  let processingProgress = 0;
  const processingInterval = setInterval(() => {
    processingProgress += 5;
    if (processingProgress <= 100) {
      onProgress?.(processingProgress, 'processing');
    } else {
      clearInterval(processingInterval);
    }
  }, 500);

  try {
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

    // Ensure progress reaches 100% before completing
    if (processingProgress < 100) {
      onProgress?.(100, 'processing');
      // Wait a bit to show the completion
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return responseData;
  } catch (error) {
    clearInterval(processingInterval);
    throw error;
  }
};

// Check if there's an ongoing gallery creation request
const checkOngoingRequest = async () => {
  const token = localStorage.getItem('access');
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/gallery/galleries/ongoing/`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 404) {
      // If the endpoint doesn't exist, we can't check for ongoing requests
      return false;
    }
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.hasOngoingRequest || false;
  } catch (error) {
    console.error('Error checking ongoing requests:', error);
    return false;
  }
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
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasOngoingRequest, setHasOngoingRequest] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [price, setPrice] = useState('0.00');
  const [coverPhotoIndex, setCoverPhotoIndex] = useState(null);
  
  // Check for ongoing requests on component mount
  useEffect(() => {
    const checkOngoing = async () => {
      const ongoing = await checkOngoingRequest();
      setHasOngoingRequest(ongoing);
    };
    
    checkOngoing();
  }, []);

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
      // console.error('Error fetching events:', error);
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
      refetchEvents();
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
    mutationFn: ({ eventId, photos, title, description, isPublic, isActive, price, coverPhotoIndex }) => 
      createGallery(
        { 
          eventId, 
          photos, 
          title, 
          description, 
          isPublic, 
          isActive, 
          price,
          coverPhotoIndex
        }, 
        { 
          onProgress: (progress, status) => {
            setProcessingProgress(progress);
            setIsProcessing(status === 'processing');
          }
        }
      ),
    onSuccess: (data) => {
      setProcessingProgress(0);
      setIsProcessing(false);
      setHasOngoingRequest(false);
      toast.success('Gallery created successfully!', {
        position: 'top-center',
        duration: 4000,
      });
      navigate('/dashboard');
    },
    onError: (error) => {
      setProcessingProgress(0);
      setIsProcessing(false);
      setHasOngoingRequest(false);
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
    
    if (hasOngoingRequest) {
      toast.error('You already have an ongoing gallery creation request');
      return;
    }
    
    // Validate price format
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      toast.error('Please enter a valid price (0 or higher)');
      return;
    }
    
    setHasOngoingRequest(true);
    setIsProcessing(true);
    createGalleryMutation.mutate({
      eventId: selectedEvent,
      photos,
      title,
      description,
      isPublic,
      isActive,
      price: priceValue.toFixed(2),
      coverPhotoIndex: coverPhotoIndex !== null ? coverPhotoIndex : 0 // Default to first photo if none selected
    });
  };
  
  // Handle price input change with validation
  const handlePriceChange = (e) => {
    const value = e.target.value;
    // Allow only numbers and one decimal point
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setPrice(value);
    }
  };
  
  // Format price on blur
  const handlePriceBlur = () => {
    if (price === '') {
      setPrice('0.00');
    } else {
      const num = parseFloat(price);
      setPrice(isNaN(num) ? '0.00' : num.toFixed(2));
    }
  };

  // Determine if the create button should be disabled
  const isCreateDisabled = !selectedEvent || photos.length === 0 || hasOngoingRequest;

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
            {/* Processing Progress Bar */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Creating your gallery...</span>
                  <span className="text-indigo-600 font-medium">{Math.round(processingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${processingProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your gallery is being processed. This may take a few minutes depending on the number of photos.
                </p>
              </div>
            )}

            {/* Ongoing Request Warning */}
            {hasOngoingRequest && !isProcessing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Processing gallery in background...</span>
                  <span className="text-indigo-600 font-medium">Processing</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-indigo-400 h-2.5 rounded-full animate-pulse" 
                    style={{ width: '100%' }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your gallery is being processed in the background. Please wait until this completes before creating a new gallery.
                </p>
              </div>
            )}

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
                  disabled={isLoadingEvents || hasOngoingRequest}
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
                        disabled={hasOngoingRequest}
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
                          <Listbox.Button 
                            className="relative w-full cursor-default rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-left shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                            disabled={hasOngoingRequest}
                          >
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
                  disabled={hasOngoingRequest}
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
                  disabled={hasOngoingRequest}
                />
              </div>
            </div>
            
            {/* Gallery Settings */}
            <div className="space-y-4 border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-700">Gallery Settings</h3>
              
              {/* Public/Private Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="is-public" className="block text-sm font-medium text-gray-700">
                    Public Gallery
                  </label>
                  <p className="text-xs text-gray-500">
                    {isPublic 
                      ? 'Visible to everyone with the link' 
                      : 'Only accessible via direct link'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  disabled={hasOngoingRequest}
                  className={`${
                    isPublic ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                  <span className="sr-only">Set gallery visibility</span>
                  <span
                    className={`${
                      isPublic ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
              
              {/* Active/Inactive Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="is-active" className="block text-sm font-medium text-gray-700">
                    Active
                  </label>
                  <p className="text-xs text-gray-500">
                    {isActive 
                      ? 'Gallery is visible and accessible' 
                      : 'Gallery is hidden from everyone'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  disabled={hasOngoingRequest}
                  className={`${
                    isActive ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2`}
                >
                  <span className="sr-only">Set gallery status</span>
                  <span
                    className={`${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                  />
                </button>
              </div>
              
              {/* Price Input */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price for full gallery download ($)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">$</span>
                  </div>
                  <input
                    type="text"
                    name="price"
                    id="price"
                    value={price}
                    onChange={handlePriceChange}
                    onBlur={handlePriceBlur}
                    className="block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="0.00"
                    disabled={hasOngoingRequest}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm" id="price-currency">
                      USD
                    </span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Set to 0.00 for free downloads
                </p>
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Photos <span className="text-red-500">*</span>
              </label>
              <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md ${
                hasOngoingRequest ? 'opacity-50' : ''
              }`}>
                <div className="space-y-1 text-center">
                  <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="file-upload"
                      className={`relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 ${
                        hasOngoingRequest ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
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
                        disabled={hasOngoingRequest}
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
                        <div className="relative">
                          {preview.id && preview.id.startsWith('blob:') ? (
                            <img 
                              src={preview.id} 
                              alt={preview.name}
                              className="h-10 w-10 object-cover rounded"
                            />
                          ) : (
                            <PhotoIcon className="flex-shrink-0 h-5 w-5 text-gray-400" />
                          )}
                          {coverPhotoIndex === index && (
                            <div className="absolute -top-1 -right-1 bg-indigo-600 rounded-full p-0.5">
                              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <span className="ml-2 flex-1 w-0 truncate">
                          {preview.name}
                        </span>
                      </div>
                      <div className="ml-4 flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setCoverPhotoIndex(index)}
                          className={`text-sm font-medium ${
                            coverPhotoIndex === index 
                              ? 'text-indigo-600' 
                              : 'text-gray-500 hover:text-indigo-500'
                          }`}
                          disabled={hasOngoingRequest}
                        >
                          {coverPhotoIndex === index ? 'Cover' : 'Set as cover'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="font-medium text-red-600 hover:text-red-500"
                          disabled={hasOngoingRequest}
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
                  disabled={createGalleryMutation.isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreateDisabled || createGalleryMutation.isLoading}
                  className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                    isCreateDisabled || createGalleryMutation.isLoading
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