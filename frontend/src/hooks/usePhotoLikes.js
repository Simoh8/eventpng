import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import toast from "react-hot-toast";

export const usePhotoLikes = (galleryId) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Check if a photo is liked
  const isLiked = (photoId) => {
    const gallery = queryClient.getQueryData(["gallery", galleryId]);
    if (!gallery?.photos) return false;
    return gallery.photos.some((p) => p.id === photoId && p.is_liked);
  };

  // Mutation for toggling like
// In usePhotoLikes.js
const { mutateAsync: toggleLike, isLoading } = useMutation({
  mutationFn: async ({ photoId, currentLiked }) => {
    if (!user) {
      const currentPath = window.location.pathname;
      navigate('/login', { 
        state: { from: currentPath },
        replace: true 
      });
      throw new Error('User not authenticated');
    }

    if (currentLiked) {
      await api.delete(`/api/gallery/photos/${photoId}/like/`);
    } else {
      await api.post(`/api/gallery/photos/${photoId}/like/`);
    }
  },
  onError: (err) => {
    // Only show error toast if it's not an auth error
    if (err.message !== 'User not authenticated') {
      toast.error("Failed to update like status");
    }
  },
  // ... rest of the code
});

  return { isLiked, toggleLike, isLoading };
};
