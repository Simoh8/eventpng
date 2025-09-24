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
  const { mutateAsync: toggleLike, isLoading } = useMutation({
    mutationFn: async ({ photoId, currentLiked }) => {
      if (!user) throw new Error("User not authenticated");

      if (currentLiked) {
        await api.delete(`/api/gallery/photos/${photoId}/like/`);
      } else {
        await api.post(`/api/gallery/photos/${photoId}/like/`);
      }
    },
    onMutate: async ({ photoId, currentLiked }) => {
      await queryClient.cancelQueries(["gallery", galleryId]);

      const prevData = queryClient.getQueryData(["gallery", galleryId]);

      queryClient.setQueryData(["gallery", galleryId], (old) => {
        if (!old?.photos) return old;
        return {
          ...old,
          photos: old.photos.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  is_liked: !currentLiked,
                  like_count: (p.like_count || 0) + (currentLiked ? -1 : 1),
                }
              : p
          ),
        };
      });

      return { prevData };
    },
    onError: (err, _, context) => {
      queryClient.setQueryData(["gallery", galleryId], context?.prevData);
      if (err.message === "User not authenticated") {
        navigate("/login");
        toast("Please log in to like photos", { icon: "🔒" });
      } else {
        toast.error("Failed to update like status");
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(["gallery", galleryId]);
    },
  });

  return { isLiked, toggleLike, isLoading };
};
