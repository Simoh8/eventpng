import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export const usePhotoLikes = (galleryId) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ---------------- Helpers ----------------
  const getGallery = () => queryClient.getQueryData(['gallery', galleryId]);
  const getLikes = () => queryClient.getQueryData(['likedPhotos', galleryId]) || [];

  const updateGalleryCache = (photoId, updater) => {
    queryClient.setQueryData(['gallery', galleryId], (oldData) => {
      if (!oldData?.photos) return oldData;
      return {
        ...oldData,
        photos: oldData.photos.map((photo) =>
          photo.id === photoId ? updater(photo) : photo
        ),
      };
    });
  };

  const updateLikesCache = (photoId, isLiked) => {
    queryClient.setQueryData(['likedPhotos', galleryId], (prev = []) =>
      isLiked ? [...new Set([...prev, photoId])] : prev.filter((id) => id !== photoId)
    );
  };

  const rollback = (context) => {
    if (context?.previousGallery) {
      queryClient.setQueryData(['gallery', galleryId], context.previousGallery);
    }
    if (context?.previousLikes) {
      queryClient.setQueryData(['likedPhotos', galleryId], context.previousLikes);
    }
  };

  // ---------------- Query ----------------
  const { data: likedPhotos = [] } = useQuery({
    queryKey: ['likedPhotos', galleryId],
    queryFn: async () => {
      if (!user) return [];
      try {
        const response = await api.get('/api/gallery/users/me/likes/');
        return Array.isArray(response.data)
          ? response.data.map((photo) => photo.id)
          : [];
      } catch (error) {
        return [];
      }
    },
    enabled: !!user,
  });

  const { mutate: toggleLike } = useMutation({
    mutationFn: async (photoId) => {
      const response = await api.post(`/api/gallery/photos/${photoId}/like/`);
      return { 
        ...response.data.photo, 
        action: response.data.action,
        photoId 
      };
    },
    onMutate: async (photoId) => {
      await queryClient.cancelQueries({ queryKey: ['gallery', galleryId] });
      await queryClient.cancelQueries({ queryKey: ['likedPhotos', galleryId] });

      const previousGallery = getGallery();
      const previousLikes = getLikes();
      const currentPhoto = previousGallery?.photos?.find((p) => p.id === photoId);
      const isLiked = previousLikes.includes(photoId);
      const currentLikeCount = currentPhoto?.like_count || 0;

      // 🔥 Optimistic update
      updateGalleryCache(photoId, (photo) => ({
        ...photo,
        like_count: isLiked 
          ? Math.max(0, currentLikeCount - 1) 
          : currentLikeCount + 1,
        is_liked: !isLiked,
      }));

      updateLikesCache(photoId, !isLiked);

      return { previousGallery, previousLikes };
    },
    onError: (error, photoId, context) => {
      rollback(context);
      toast.error('Failed to update like');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery', galleryId], refetchType: 'inactive' });
      queryClient.invalidateQueries({ queryKey: ['likedPhotos', galleryId], refetchType: 'inactive' });
    },
  });

  // ---------------- Public API ----------------
  const isLiked = (photoId) => {
    const galleryData = getGallery();
    const photo = galleryData?.photos?.find((p) => p.id === photoId);
    if (typeof photo?.is_liked === 'boolean') return photo.is_liked;
    return Array.isArray(likedPhotos) ? likedPhotos.includes(photoId) : false;
  };

  const getLikeCount = (photoId) => {
    const galleryData = getGallery();
    const photo = galleryData?.photos?.find((p) => p.id === photoId);
    return photo?.like_count ?? 0;
  };

  return {
    likedPhotos: new Set(likedPhotos || []),
    isLiked,
    getLikeCount,
    toggleLike,
  };
};
