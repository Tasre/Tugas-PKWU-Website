import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useFavorites = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_favorites")
        .select("listing_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((f) => f.listing_id));
    },
    enabled: !!user,
  });
};

export const useFavoritesCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorites-count", user?.id],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("listing_favorites")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
};

export const useToggleFavorite = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, isFavorited }: { listingId: string; isFavorited: boolean }) => {
      if (!user) throw new Error("Must be logged in");

      if (isFavorited) {
        const { error } = await supabase
          .from("listing_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("listing_id", listingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("listing_favorites")
          .insert({ user_id: user.id, listing_id: listingId });
        if (error) throw error;
      }
    },
    onMutate: async ({ listingId, isFavorited }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["favorites", user?.id] });
      await queryClient.cancelQueries({ queryKey: ["favorites-count", user?.id] });

      // Snapshot previous values
      const prevFavorites = queryClient.getQueryData<Set<string>>(["favorites", user?.id]);
      const prevCount = queryClient.getQueryData<number>(["favorites-count", user?.id]);

      // Optimistically update
      queryClient.setQueryData(["favorites", user?.id], (old: Set<string> | undefined) => {
        const next = new Set(old || []);
        if (isFavorited) next.delete(listingId);
        else next.add(listingId);
        return next;
      });

      queryClient.setQueryData(["favorites-count", user?.id], (old: number | undefined) => {
        const current = old || 0;
        return isFavorited ? Math.max(0, current - 1) : current + 1;
      });

      return { prevFavorites, prevCount };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(["favorites", user?.id], context.prevFavorites);
        queryClient.setQueryData(["favorites-count", user?.id], context.prevCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["favorites-count"] });
      // Removed "favorite-listings" invalidation so items persist until manual refresh
    },
  });
};
