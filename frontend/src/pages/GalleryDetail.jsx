import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePhotoLikes } from '../hooks/usePhotoLikes';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { FaHeart, FaRegHeart, FaDownload, FaArrowLeft, FaLock, FaCalendar, FaUser, FaClock, FaCheck, FaShareAlt } from 'react-icons/fa';

const GalleryDetail = () => {
  const { id: slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());

  // Fetch gallery details
  const { data: gallery, isLoading, error } = useQuery({
    queryKey: ['gallery', slug],
    queryFn: async () => {
      const isVerified = sessionStorage.getItem(`gallery_${slug}_verified`) === 'true';
      
      const headers = {};
      if (isVerified) {
        headers['X-Gallery-Verification'] = sessionStorage.getItem(`gallery_${slug}_token`) || '';
      }
      
      let url;
      if (!isNaN(slug)) {
        url = `${API_BASE_URL}/api/gallery/public/galleries/by-id/${slug}/`;
      } else {
        url = `${API_BASE_URL}/api/gallery/public/galleries/${slug}/`;
      }
      
      try {
        const response = await fetch(url, { headers });
        
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.requires_pin) {
            return { is_private: true, requires_pin: true };
          }
        }
        
        if (!response.ok) throw new Error('Gallery not found');
        
        const data = await response.json();
        
        if (data.slug && data.slug !== slug) {
          window.history.replaceState({}, '', `/gallery/${data.slug}`);
        }
        
        if (data.is_private && !isVerified) {
          return { ...data, requires_pin: true };
        }
        
        return data;
      } catch (err) {
        console.error('Error fetching gallery:', err);
        throw new Error('Failed to load gallery. Please try again later.');
      }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // Photo likes hook
  const { isLiked, toggleLike, isLoading: isLikeLoading } = usePhotoLikes(gallery?.id);
  
  // Debug: Log gallery data when it changes
  useEffect(() => {
    if (gallery?.photos) {
      console.log('Gallery photos with like status:');
      gallery.photos.forEach(photo => {
        console.log(`Photo ${photo.id}:`, {
          id: photo.id,
          is_liked: photo.is_liked,
          like_count: photo.like_count,
          calculatedIsLiked: isLiked(photo.id)
        });
      });
    }
  }, [gallery, isLiked]);

  // Handle share functionality
  const handleShare = async () => {
    const shareData = {
      title: gallery.title || 'Photo Gallery',
      text: `Check out this photo gallery${gallery.event ? ` from ${gallery.event.title}` : ''}`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback for browsers that don't support Web Share API
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing:', err);
        try {
          await navigator.clipboard.writeText(shareData.url);
          toast.success('Link copied to clipboard!');
        } catch (copyError) {
          console.error('Error copying to clipboard:', copyError);
          toast.error('Failed to share. Please copy the URL manually.');
        }
      }
    }
  };

  // Disable right-click and keyboard shortcuts
  useEffect(() => {
    const preventDefault = (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };

    const preventContextMenu = (e) => e.preventDefault();

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('keydown', preventDefault);
    document.addEventListener('dragstart', preventDefault);
    document.addEventListener('selectstart', preventDefault);

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('keydown', preventDefault);
      document.removeEventListener('dragstart', preventDefault);
      document.removeEventListener('selectstart', preventDefault);
    };
  }, []);

  // Navigation in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCloseFullscreen();
      else if (e.key === 'ArrowLeft') navigatePhoto('prev');
      else if (e.key === 'ArrowRight') navigatePhoto('next');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, selectedPhoto]);

  // Photo navigation in fullscreen
  const navigatePhoto = (direction) => {
    if (!selectedPhoto || !gallery?.photos) return;
    
    const currentIndex = gallery.photos.findIndex(photo => photo.id === selectedPhoto.id);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % gallery.photos.length
      : (currentIndex - 1 + gallery.photos.length) % gallery.photos.length;
    
    setSelectedPhoto(gallery.photos[newIndex]);
  };

  // Toggle photo selection
  const togglePhotoSelection = (photoId) => {
    setSelectedPhotos(prev => {
      const newSelected = new Set(prev);
      newSelected.has(photoId) ? newSelected.delete(photoId) : newSelected.add(photoId);
      return newSelected;
    });
  };

  // Select all photos
  const selectAllPhotos = () => {
    if (!gallery?.photos) return;
    
    setSelectedPhotos(prev => 
      prev.size === gallery.photos.length 
        ? new Set() 
        : new Set(gallery.photos.map(photo => photo.id))
    );
  };

  // Verify gallery PIN
  const verifyGalleryPin = async (pin) => {
    if (!slug) {
      toast.error('No gallery specified');
      return false;
    }
    
    setIsVerifying(true);
    
    try {
      const galleryResponse = await fetch(`${API_BASE_URL}/api/gallery/public/galleries/${slug}/`);
      if (!galleryResponse.ok) throw new Error('Failed to fetch gallery details');
      
      const galleryData = await galleryResponse.json();
      if (!galleryData.event?.slug) throw new Error('Gallery not associated with an event');
      
      const response = await fetch(`${API_BASE_URL}/api/gallery/events/${galleryData.event.slug}/verify-pin/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin })
      });
      
      const responseData = await response.json().catch(() => ({}));
      
      if (response.ok && responseData.success) {
        sessionStorage.setItem(`event_${galleryData.event.slug}_verified`, 'true');
        setShowPinModal(false);
        queryClient.invalidateQueries(['gallery', slug]);
        toast.success('PIN verified successfully');
        return true;
      } else {
        toast.error(responseData.error || 'Invalid PIN');
        return false;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to verify PIN');
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  // Add watermark to image
  const addWatermark = (imageUrl, text = ' EventPNG') => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = imageUrl;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        const fontSize = Math.max(img.width * 0.03, 20);
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textWidth = ctx.measureText(text).width;
        const spacing = textWidth * 1.5;
        const angle = -20 * Math.PI / 180;
        
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(angle);
        
        for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
          for (let y = -canvas.height; y < canvas.height * 2; y += spacing * 2) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 1;
            ctx.shadowOffsetY = 1;
            
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 2;
            ctx.strokeText(text, x, y);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillText(text, x, y);
            
            ctx.shadowColor = 'transparent';
          }
        }
        
        ctx.restore();
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
    });
  };

  // Record a download in the database
  const recordDownload = async (photoId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      // Make sure photoId is treated as a string (UUID)
      const response = await fetch(`${API_BASE_URL}/api/gallery/photos/${String(photoId)}/download/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-CSRFToken': document.cookie.split('; ').find(row => row.startsWith('csrftoken='))?.split('=')[1] || ''
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to record download:', errorData);
        return;
      }
      
      // Update the photo's download count in the local state
      queryClient.setQueryData(['gallery', slug], (oldData) => {
        if (!oldData?.photos) return oldData;
        
        return {
          ...oldData,
          photos: oldData.photos.map(photo => 
            photo.id === photoId
              ? { 
                  ...photo, 
                  download_count: (typeof photo.download_count === 'number' ? photo.download_count : 0) + 1 
                }
              : photo
          )
        };
      });
    } catch (error) {
      console.error('Error recording download:', error);
      // Don't show error to user as this shouldn't block the download
    }
  };

  // Download single image
  const downloadImage = async (photo) => {
    if (isDownloading || !user) {
      if (!user) {
        navigate('/login', { state: { from: window.location.pathname } });
        toast.info('Please log in to download images');
      }
      return;
    }
    
    setIsDownloading(true);
    
    try {
      // First record the download
      await recordDownload(photo.id);
      
      // Then proceed with the download
      const watermarkedImage = await addWatermark(photo.image);
      const link = document.createElement('a');
      link.href = watermarkedImage;
      link.download = `eventpix-${gallery.title}-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Image downloaded with watermark');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download image');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download multiple images as zip
  const downloadImagesAsZip = async (photos, zipName) => {
    if (!user) {
      navigate('/login', { state: { from: window.location.pathname } });
      toast.info('Please log in to download images');
      return;
    }
    
    try {
      setIsDownloading(true);
      const zip = new JSZip();
      const folder = zip.folder(zipName);
      
      // Record all downloads first
      await Promise.all(photos.map(photo => recordDownload(photo.id)));
      
      // Then process the images for download
      const imagePromises = photos.map(async (photo, index) => {
        try {
          const watermarkedImage = await addWatermark(photo.image);
          const response = await fetch(watermarkedImage);
          const blob = await response.blob();
          folder.file(`image-${index + 1}.jpg`, blob);
        } catch (error) {
          console.error(`Error processing image ${photo.id}:`, error);
        }
      });
      
      await Promise.all(imagePromises);
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${zipName}.zip`);
      toast.success(`Downloaded ${photos.length} images`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download images');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download selected images
  const downloadSelectedImages = async () => {
    if (selectedPhotos.size === 0) {
      toast.error('Please select at least one image');
      return;
    }
    
    const selectedPhotoObjects = gallery.photos.filter(photo => selectedPhotos.has(photo.id));
    await downloadImagesAsZip(selectedPhotoObjects, `eventpix-${gallery.title}-selected`);
    setSelectedPhotos(new Set());
  };

  // Download all images
  const downloadAllImages = async () => {
    if (!gallery?.photos?.length) return;
    await downloadImagesAsZip(gallery.photos, `eventpix-${gallery.title}`);
  };

  // Handle photo click
  const handlePhotoClick = (photo) => {
    setSelectedPhoto(photo);
    setIsFullscreen(true);
  };

  const handleLikeToggle = async (photoId, e) => {
    e.stopPropagation();
    
    try {
      const currentLiked = isLiked(photoId);
  
      queryClient.setQueryData(['gallery', slug], oldData => {
        if (!oldData) return oldData;
  
        return {
          ...oldData,
          photos: oldData.photos.map(photo =>
            photo.id === photoId
              ? {
                  ...photo,
                  is_liked: !currentLiked,
                  like_count: photo.like_count + (currentLiked ? -1 : 1),
                }
              : photo
          ),
        };
      });
  
      await toggleLike(photoId, currentLiked);
  
      queryClient.invalidateQueries(['gallery', slug]);
  
      // toast.success(currentLiked ? 'Removed like' : 'Liked photo!');
    } catch (error) {
      console.error('Error toggling like:', error);
  
      queryClient.invalidateQueries(['gallery', slug]);
  
      if (error.message === 'User not authenticated') {
        navigate('/login', { state: { from: window.location.pathname } });
        toast('Please log in to like photos', { icon: '🔒', duration: 3000 });
      } else {
        toast.error(error.response?.data?.error || 'Failed to update like status');
      }
    }
  };
  

  // Close fullscreen
  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
    setSelectedPhoto(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-gray-600 font-medium">Loading gallery...</p>
        </div>
      </div>
    );
  }

  // PIN verification modal
  if (gallery?.requires_pin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full border border-gray-100">
          <div className="text-center mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
              <FaLock className="h-8 w-8 text-blue-600" />
            </div>
            <h2 className="mt-3 text-2xl font-bold text-gray-900">Private Gallery</h2>
            <p className="mt-2 text-gray-500">Please enter the PIN to access this gallery</p>
          </div>
          
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            await verifyGalleryPin(formData.get('pin'));
          }}>
            <div className="mb-5">
              <input
                type="password"
                name="pin"
                required
                maxLength="6"
                pattern="\d{6}"
                placeholder="Enter 6-digit PIN"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isVerifying}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
            >
              {isVerifying ? 'Verifying...' : 'Access Gallery'}
            </button>
          </form>
          
          <div className="mt-5 text-center">
            <button
              onClick={() => navigate(-1)}
              className="text-blue-600 hover:text-blue-800 font-medium transition-colors"
            >
              Go back to events
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !gallery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center bg-white p-8 rounded-xl shadow-md max-w-md w-full mx-4">
          <div className="mb-5">
            <svg className="mx-auto h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Gallery Not Found</h2>
          <p className="text-gray-600 mb-6">The gallery you're looking for doesn't exist or is not available.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <button 
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors group"
        >
          <FaArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Back to event
        </button>
        
        {/* Gallery Header */}
        <div className="mb-8 bg-white p-6 rounded-xl shadow-md border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{gallery.title}</h1>
              {gallery.event && (
                <p className="text-gray-600">
                  From event: <span className="font-medium text-blue-700">{gallery.event.title}</span>
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-5 py-3 rounded-xl border border-blue-200">
                <div className="text-sm font-medium">Total Photos</div>
                <div className="text-2xl font-bold">{gallery.photos?.length || 0}</div>
              </div>
              
              <button
                onClick={() => handleShare()}
                className="flex items-center gap-2 px-4 py-3 bg-white text-blue-600 rounded-xl border border-blue-200 hover:bg-blue-50 transition-colors shadow-sm"
                title="Share this gallery"
              >
                <FaShareAlt className="w-5 h-5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>
          
          {gallery.photographer && (
            <div className="flex items-center text-gray-600 mb-3">
              <FaUser className="w-4 h-4 mr-2 text-gray-400" />
              <span>Photographer: {gallery.photographer.first_name || gallery.photographer.username}</span>
            </div>
          )}
          
          {gallery.created_at && (
            <div className="flex items-center text-gray-600 mb-3">
              <FaCalendar className="w-4 h-4 mr-2 text-gray-400" />
              <span>Created on {new Date(gallery.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
          )}
          
          {gallery.updated_at && (
            <div className="flex items-center text-gray-600 mb-4">
              <FaClock className="w-4 h-4 mr-2 text-gray-400" />
              <span>Last updated: {new Date(gallery.updated_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric'
              })}</span>
            </div>
          )}
          
          {gallery.description && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <h3 className="text-sm font-medium text-blue-700 mb-2">Gallery Description</h3>
              <p className="text-gray-700">{gallery.description}</p>
            </div>
          )}
        </div>

        {/* Selection and Download Controls */}
        <div className="mb-6 flex flex-wrap justify-between items-center gap-3">
          <h2 className="text-xl font-semibold text-gray-800">Gallery Photos</h2>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {selectedPhotos.size} {selectedPhotos.size === 1 ? 'image' : 'images'} selected
            </span>
            <button
              onClick={selectAllPhotos}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {selectedPhotos.size === gallery.photos?.length ? 'Deselect All' : 'Select All'}
            </button>
            {user && (
              <>
                <button
                  onClick={downloadSelectedImages}
                  disabled={isDownloading || selectedPhotos.size === 0}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md text-sm"
                >
                  <FaDownload className="h-4 w-4" />
                  Download Selected
                </button>
                <button
                  onClick={downloadAllImages}
                  disabled={isDownloading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-md text-sm"
                >
                  <FaDownload className="h-4 w-4" />
                  Download All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Photos Grid */}
        {gallery.photos && gallery.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {gallery.photos.map((photo) => (
                <div 
                  key={photo.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden shadow hover:shadow-lg transition"
                  onClick={() => handlePhotoClick(photo)}
                >
                  <img 
                    src={photo.image} 
                    alt={photo.caption || 'Photo'} 
                    className="w-full h-48 object-cover"
                  />

                  {/* Like button overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // prevent opening modal
                      toggleLike(photo.id); // 🚀 instantly simulates like/unlike
                    }}
                    className="absolute top-2 right-2 flex items-center gap-1 bg-gray-900 bg-opacity-60 text-white rounded-full px-2 py-1 text-sm hover:bg-opacity-80 transition"
                  >
                    {isLiked(photo.id) ? (
                      <FaHeart className="text-red-500" />
                    ) : (
                      <FaRegHeart className="text-white" />
                    )}
                    <span>{photo.like_count}</span>
                  </button>
                </div>
              ))}

          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
            <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No photos in this gallery yet.</p>
          </div>
        )}
      </div>

      {/* Fullscreen Photo View */}
      {isFullscreen && selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
          onClick={handleCloseFullscreen}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleCloseFullscreen();
              }}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10 bg-gray-900 bg-opacity-50 rounded-full p-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Navigation arrows */}
            {gallery.photos.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigatePhoto('prev');
                  }}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-gray-900 bg-opacity-50 rounded-full p-3 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigatePhoto('next');
                  }}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300 z-10 bg-gray-900 bg-opacity-50 rounded-full p-3 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            <div className="relative max-w-full max-h-full">
              <img
                src={selectedPhoto.image}
                alt={selectedPhoto.caption || 'Selected photo'}
                className="max-w-full max-h-[80vh] object-contain rounded-sm"
                style={{
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
              />
              
              {/* Controls overlay */}
              <div className="absolute top-4 left-4 flex items-center gap-4 z-10">
                {/* Selection checkbox */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePhotoSelection(selectedPhoto.id);
                  }}
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                    selectedPhotos.has(selectedPhoto.id) ? 'bg-blue-600' : 'bg-white bg-opacity-80'
                  }`}>
                    {selectedPhotos.has(selectedPhoto.id) && (
                      <FaCheck className="w-5 h-5 text-white" />
                    )}
                  </div>
                </div>
                
                {/* Like button */}
                <button
                  onClick={(e) => handleLikeToggle(selectedPhoto.id, e)}
                  className="flex items-center gap-1 text-white hover:text-red-400 transition-colors bg-gray-900 bg-opacity-50 rounded-full p-2"
                >
                  {isLiked(selectedPhoto.id) ? (
                    <FaHeart className="text-red-500 text-xl" />
                  ) : (
                    <FaRegHeart className="text-white text-xl" />
                  )}
                  <span className="text-white text-sm font-medium ml-1">
                    {selectedPhoto.like_count || 0}
                  </span>
                </button>
              </div>
              
              {/* Download button */}
              {user ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadImage(selectedPhoto);
                  }}
                  className="absolute top-4 right-16 text-white hover:text-gray-300 z-10 bg-gray-900 bg-opacity-50 rounded-full p-2 transition-colors"
                  title="Download Image"
                >
                  <FaDownload className="h-6 w-6" />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/login', { state: { from: window.location.pathname } });
                  }}
                  className="absolute top-4 right-16 text-white hover:text-gray-300 z-10 bg-gray-900 bg-opacity-50 rounded-full p-2 transition-colors"
                  title="Login to Download"
                >
                  Login
                </button>
              )}
            </div>
            
            {selectedPhoto.caption && (
              <div className="mt-4 text-white text-center text-lg font-medium">
                {selectedPhoto.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryDetail;