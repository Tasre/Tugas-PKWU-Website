import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type SubscriptionType = 'posts' | 'listings';

export const useUserSubscriptions = (followingId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-subscriptions", user?.id, followingId],
    queryFn: async () => {
      if (!user || !followingId) return [];
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("sub_type")
        .eq("follower_id", user.id)
        .eq("following_id", followingId);
      
      if (error) throw error;
      return data.map(s => s.sub_type) as SubscriptionType[];
    },
    enabled: !!user && !!followingId,
  });
};

export const useAllFollowings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-all-followings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("sub_type, following:following_id(id, username, avatar_url)")
        .eq("follower_id", user.id);
      
      if (error) throw error;
      
      // Group by user
      const grouped = data.reduce((acc: any, curr: any) => {
        const followingId = curr.following.id;
        if (!acc[followingId]) {
          acc[followingId] = {
            ...curr.following,
            subTypes: []
          };
        }
        acc[followingId].subTypes.push(curr.sub_type);
        return acc;
      }, {});

      return Object.values(grouped);
    },
    enabled: !!user,
  });
};

export const useToggleSubscription = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ followingId, subType, isSubscribed }: { followingId: string; subType: SubscriptionType; isSubscribed: boolean }) => {
      if (!user) throw new Error("Must be logged in");

      if (isSubscribed) {
        // DELETE requires the USING clause in RLS (which we are fixing in DB)
        const { error } = await supabase
          .from("user_subscriptions")
          .delete()
          .match({ 
            follower_id: user.id, 
            following_id: followingId, 
            sub_type: subType 
          });
        
        if (error) {
          console.error("Unsubscribe error:", error);
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("user_subscriptions")
          .insert({ 
            follower_id: user.id, 
            following_id: followingId, 
            sub_type: subType 
          });
        
        if (error) {
          console.error("Subscribe error:", error);
          throw error;
        }
      }
    },
    onMutate: async ({ followingId, subType, isSubscribed }) => {
      // Optimistic Update for immediate UI feedback
      await queryClient.cancelQueries({ queryKey: ["user-subscriptions", user?.id, followingId] });
      const previousSubs = queryClient.getQueryData<SubscriptionType[]>(["user-subscriptions", user?.id, followingId]);

      queryClient.setQueryData(["user-subscriptions", user?.id, followingId], (old: SubscriptionType[] | undefined) => {
        const current = old || [];
        if (isSubscribed) {
          return current.filter(s => s !== subType);
        } else {
          return [...current, subType];
        }
      });

      return { previousSubs };
    },
    onError: (err, variables, context) => {
      if (context?.previousSubs) {
        queryClient.setQueryData(["user-subscriptions", user?.id, variables.followingId], context.previousSubs);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-subscriptions", user?.id, variables.followingId] });
      queryClient.invalidateQueries({ queryKey: ["user-all-followings", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count", user?.id] });
    },
  });
};
