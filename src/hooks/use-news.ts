import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const POSTS_PER_PAGE = 10;

// Fetch all posts for the general feed (Paginated)
export const useAllPostsFeed = (searchQuery: string = "", gameFilter: string = "") => {
  return useInfiniteQuery({
    queryKey: ["all_posts_feed", searchQuery, gameFilter],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("posts")
        .select("*, profiles:author_id(username, avatar_url)")
        .eq("status", "public") // NEW STATUS: public
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + POSTS_PER_PAGE - 1);

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }
      if (gameFilter) {
        query = query.eq("game", gameFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === POSTS_PER_PAGE ? allPages.length * POSTS_PER_PAGE : undefined;
    },
  });
};

// Fetch top 5 targeted posts (personalized "Smart" sorting)
export const useTopTargetedPosts = (searchQuery: string = "", gameFilter: string = "") => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["top_targeted_posts", searchQuery, gameFilter, user?.id],
    queryFn: async () => {
      // 1. Fetch a pool of high-quality public posts
      let query = supabase
        .from("posts")
        .select("*, profiles:author_id(username, avatar_url)")
        .eq("status", "public")
        .order("likes_count", { ascending: false })
        .limit(50); // Fetch a pool to rank from

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }
      if (gameFilter) {
        query = query.eq("game", gameFilter);
      }

      const { data: posts, error } = await query;
      if (error) throw error;
      if (!posts?.length) return [];

      // 2. Fetch User Affinity Signals
      let userPrefs: { favorite_games: string[] } | null = null;
      let historyGames = new Set<string>();

      if (user) {
        const { data: prefs } = await supabase
          .from("buyer_preferences")
          .select("favorite_games")
          .eq("user_id", user.id)
          .maybeSingle();
        userPrefs = prefs;

        // Learn from order history (last 20 orders)
        const { data: orders } = await supabase
          .from("orders")
          .select("listings(game)")
          .eq("buyer_id", user.id)
          .limit(20);
        
        orders?.forEach((o: any) => {
          if (o.listings?.game) historyGames.add(o.listings.game);
        });
      }

      // 3. Score and Rank
      const rankedPosts = posts.map((post) => {
        let score = 0;

        // Affinity Score (+30 pts for game match)
        const isFavGame = userPrefs?.favorite_games?.includes(post.game);
        const isHistoryGame = historyGames.has(post.game);
        if (isFavGame || isHistoryGame) score += 30;

        // Social Proof Score
        // Net Likes (likes - dislikes)
        const netLikes = (post.likes_count || 0); // Using likes_count directly as it's already triggered
        score += netLikes * 2;

        // Recency Bonus (Exponential decay or simple age bonus)
        const ageInDays = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60 * 24);
        const recencyBonus = Math.max(0, 20 - ageInDays); // Up to 20 pts for fresh posts
        score += recencyBonus;

        return { ...post, smartScore: score };
      });

      // Sort by smart score descending and return top 5
      return rankedPosts
        .sort((a, b) => b.smartScore - a.smartScore)
        .slice(0, 5);
    },
  });
};

// Fetch top 5 posts from preferred games
export const useTopGamesPosts = (searchQuery: string = "", gameFilter: string = "") => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["top_games_posts", searchQuery, gameFilter, user?.id],
    queryFn: async () => {
      let gamesToFetch = [];
      if (gameFilter) {
        gamesToFetch = [gameFilter];
      } else if (user) {
        const { data: favs } = await supabase.from("favorite_games").select("game_name").eq("user_id", user.id);
        gamesToFetch = favs?.map(f => f.game_name) || [];
      }

      if (gamesToFetch.length === 0) {
        const { data: topGames } = await supabase.from("posts").select("game").limit(50);
        const uniqueGames = Array.from(new Set(topGames?.map(p => p.game))).slice(0, 3);
        gamesToFetch = uniqueGames;
      }

      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:author_id(username, avatar_url)")
        .in("game", gamesToFetch)
        .eq("status", "public") // NEW STATUS: public
        .order("likes_count", { ascending: false });

      if (error) throw error;

      const grouped = gamesToFetch.map(game => ({
        game,
        posts: data.filter(p => p.game === game).slice(0, 5)
      })).filter(g => g.posts.length > 0);

      return grouped;
    },
  });
};

// Fetch all posts by a specific user (includes all statuses)
export const useUserPosts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:author_id(username, avatar_url)")
        .eq("author_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// Update a post's status (public/hidden)
export const useUpdatePostStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, status }: { postId: string; status: 'public' | 'hidden' }) => {
      const { error } = await supabase
        .from("posts")
        .update({ status } as any)
        .eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_posts"] });
      queryClient.invalidateQueries({ queryKey: ["all_posts_feed"] });
      queryClient.invalidateQueries({ queryKey: ["top_targeted_posts"] });
      queryClient.invalidateQueries({ queryKey: ["top_games_posts"] });
    },
  });
};

// Fetch single post detail
export const usePost = (id: string) => {
  return useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:author_id(username, avatar_url)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// Toggle Like
export const useToggleLike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (liked) {
        const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        // If liking, remove existing dislike first
        await supabase.from("post_dislikes" as any).delete().eq("post_id", postId).eq("user_id", user.id);
        const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, liked }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["user_liked_posts"] });
      await queryClient.cancelQueries({ queryKey: ["user_disliked_posts"] });

      // Snapshot the previous value
      const prevLiked = queryClient.getQueryData<Set<string>>(["user_liked_posts"]);
      const prevDisliked = queryClient.getQueryData<Set<string>>(["user_disliked_posts"]);

      // Optimistically update to the new value
      queryClient.setQueryData(["user_liked_posts"], (old: Set<string> | undefined) => {
        const next = new Set(old || []);
        if (liked) next.delete(postId);
        else next.add(postId);
        return next;
      });

      // If liking, optimistically remove dislike
      if (!liked) {
        queryClient.setQueryData(["user_disliked_posts"], (old: Set<string> | undefined) => {
          const next = new Set(old || []);
          next.delete(postId);
          return next;
        });
      }

      return { prevLiked, prevDisliked };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(["user_liked_posts"], context.prevLiked);
        queryClient.setQueryData(["user_disliked_posts"], context.prevDisliked);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user_liked_posts"] });
      queryClient.invalidateQueries({ queryKey: ["user_disliked_posts"] });
      queryClient.invalidateQueries({ queryKey: ["all_posts_feed"] });
      queryClient.invalidateQueries({ queryKey: ["top_targeted_posts"] });
      queryClient.invalidateQueries({ queryKey: ["top_games_posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });
};

// Toggle Dislike
export const useToggleDislike = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, disliked }: { postId: string; disliked: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (disliked) {
        const { error } = await supabase.from("post_dislikes" as any).delete().eq("post_id", postId).eq("user_id", user.id);
        if (error) throw error;
      } else {
        // If disliking, remove existing like first
        await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
        const { error } = await supabase.from("post_dislikes" as any).insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onMutate: async ({ postId, disliked }) => {
      await queryClient.cancelQueries({ queryKey: ["user_liked_posts"] });
      await queryClient.cancelQueries({ queryKey: ["user_disliked_posts"] });

      const prevLiked = queryClient.getQueryData<Set<string>>(["user_liked_posts"]);
      const prevDisliked = queryClient.getQueryData<Set<string>>(["user_disliked_posts"]);

      queryClient.setQueryData(["user_disliked_posts"], (old: Set<string> | undefined) => {
        const next = new Set(old || []);
        if (disliked) next.delete(postId);
        else next.add(postId);
        return next;
      });

      // If disliking, optimistically remove like
      if (!disliked) {
        queryClient.setQueryData(["user_liked_posts"], (old: Set<string> | undefined) => {
          const next = new Set(old || []);
          next.delete(postId);
          return next;
        });
      }

      return { prevLiked, prevDisliked };
    },
    onError: (err, variables, context) => {
      if (context) {
        queryClient.setQueryData(["user_liked_posts"], context.prevLiked);
        queryClient.setQueryData(["user_disliked_posts"], context.prevDisliked);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["user_liked_posts"] });
      queryClient.invalidateQueries({ queryKey: ["user_disliked_posts"] });
      queryClient.invalidateQueries({ queryKey: ["all_posts_feed"] });
      queryClient.invalidateQueries({ queryKey: ["top_targeted_posts"] });
      queryClient.invalidateQueries({ queryKey: ["top_games_posts"] });
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });
};

// User's liked IDs
export const useUserLikedPosts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_liked_posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_likes").select("post_id").eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((l: any) => l.post_id));
    },
    enabled: !!user,
  });
};

// User's liked posts actual data
export const useUserLikedPostsData = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_liked_posts_data", user?.id],
    queryFn: async () => {
      const { data: likes, error: likeError } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user!.id);
      
      if (likeError) throw likeError;
      if (!likes.length) return [];

      const postIds = likes.map(l => l.post_id);
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles:author_id(username, avatar_url)")
        .in("id", postIds)
        .eq("status", "public") // Only show currently public posts in favorites
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

// User's disliked IDs
export const useUserDislikedPosts = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user_disliked_posts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_dislikes" as any).select("post_id").eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((l: any) => l.post_id));
    },
    enabled: !!user,
  });
};

// Create a post
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ title, content, game, image_url, links, toc }: { title: string; content: string; game: string; image_url?: string; links?: string[]; toc?: any[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("posts")
        .insert({ 
          author_id: user.id, 
          title, 
          content, 
          game, 
          image_url, 
          links: links || [],
          toc: toc || [],
          status: "public" // NEW STATUS: public
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_posts_feed"] });
      queryClient.invalidateQueries({ queryKey: ["top_targeted_posts"] });
      queryClient.invalidateQueries({ queryKey: ["top_games_posts"] });
    },
  });
};

// Toggle Follow
export const useToggleFollow = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (isFollowing) {
        const { error } = await supabase.from("user_follows").delete().eq("follower_id", user.id).eq("following_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_follows").insert({ follower_id: user.id, following_id: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["following_ids"] });
      queryClient.invalidateQueries({ queryKey: ["all_posts_feed"] });
      queryClient.invalidateQueries({ queryKey: ["top_targeted_posts"] });
    },
  });
};

// Fetch following
export const useFollowing = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["following_ids", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_follows").select("following_id").eq("follower_id", user!.id);
      if (error) throw error;
      return data.map(f => f.following_id);
    },
    enabled: !!user,
  });
};

// Related posts
export const useRelatedPosts = (game: string, excludeId?: string) => {
  return useQuery({
    queryKey: ["related_posts", game, excludeId],
    queryFn: async () => {
      let query = supabase.from("posts").select("id, title, created_at, image_url").eq("game", game).eq("status", "public").order("created_at", { ascending: false }).limit(6);
      if (excludeId) query = query.neq("id", excludeId);
      const { data, error } = await query;
      if (error) throw error;
      return data.slice(0, 5);
    },
    enabled: !!game,
  });
};

// Comments
export const usePostComments = (postId: string) => {
  return useQuery({
    queryKey: ["post_comments", postId],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_comments").select("*, profiles:user_id(username, avatar_url)").eq("post_id", postId).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!postId,
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, content, rating }: { postId: string; content: string; rating?: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: user.id, content, rating: rating || null }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => { queryClient.invalidateQueries({ queryKey: ["post_comments", variables.postId] }); },
  });
};

// Image Upload
export const useUploadPostImage = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(path);
      return urlData.publicUrl;
    },
  });
};

// FLAG A POST (NEW TERMINOLOGY)
export const useTakedownPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ postId, reason }: { postId: string; reason?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Set status to 'flagged' (instantly hides it)
      const { error: postErr } = await supabase.from("posts").update({ status: "flagged" } as any).eq("id", postId);
      if (postErr) throw postErr;

      // Create record
      const { error } = await supabase.from("post_takedowns" as any).insert({ post_id: postId, staff_id: user.id, reason, status: 'pending' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all_posts_feed"] });
      queryClient.invalidateQueries({ queryKey: ["top_targeted_posts"] });
      queryClient.invalidateQueries({ queryKey: ["top_games_posts"] });
      queryClient.invalidateQueries({ queryKey: ["all-post-takedowns"] });
    },
  });
};

// Fetch all takedowns
export const useAllPostTakedowns = () => {
  return useQuery({
    queryKey: ["all-post-takedowns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_takedowns" as any).select("*, post:post_id(id, title, game, author_id, profiles:author_id(username))").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

// RESOLVE (RESTORE OR REMOVE)
export const useResolvePostTakedown = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, postId, action }: { id: string; postId: string; action: "cancel" | "confirm" }) => {
      const status = action === "cancel" ? "cancelled" : "confirmed";
      const { error } = await supabase.from("post_takedowns" as any).update({ status }).eq("id", id);
      if (error) throw error;

      if (action === "cancel") {
        await supabase.from("posts").update({ status: "public" } as any).eq("id", postId);
      }
      // If confirmed, status stays 'flagged' (or you could add 'removed' if needed)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-post-takedowns"] });
      queryClient.invalidateQueries({ queryKey: ["all_posts_feed"] });
      queryClient.invalidateQueries({ queryKey: ["top_targeted_posts"] });
      queryClient.invalidateQueries({ queryKey: ["top_games_posts"] });
      queryClient.invalidateQueries({ queryKey: ["author-post-takedowns"] });
    },
  });
};

// Author appeals
export const useAuthorPostTakedowns = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["author-post-takedowns", user?.id],
    queryFn: async () => {
      const { data: posts } = await supabase.from("posts").select("id, title, game").eq("author_id", user!.id);
      if (!posts?.length) return [];
      const postIds = posts.map(p => p.id);
      const { data, error } = await supabase.from("post_takedowns" as any).select("*").in("post_id", postIds).order("created_at", { ascending: false });
      if (error) throw error;
      const postMap = new Map(posts.map(p => [p.id, p]));
      return (data || []).map((t: any) => ({ ...t, post: postMap.get(t.post_id) }));
    },
    enabled: !!user,
  });
};

// Chat
export const usePostTakedownMessages = (takedownId: string) => {
  return useQuery({
    queryKey: ["post_takedown_messages", takedownId],
    queryFn: async () => {
      const { data, error } = await supabase.from("post_takedown_messages" as any).select("*, profiles:sender_id(username, avatar_url)").eq("takedown_id", takedownId).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!takedownId,
  });
};

export const useSendPostTakedownMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ takedownId, message }: { takedownId: string; message: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: td } = await supabase.from("post_takedowns" as any).select("post:posts(author_id)").eq("id", takedownId).single();
      const isAuthor = (td as any)?.post?.author_id === user.id;
      const { data, error } = await supabase.from("post_takedown_messages" as any).insert({ takedown_id: takedownId, sender_id: user.id, message }).select().single();
      if (error) throw error;
      if (isAuthor) {
        await supabase.from("post_takedowns" as any).update({ status: "author_responded" }).eq("id", takedownId);
      }
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post_takedown_messages", variables.takedownId] });
      queryClient.invalidateQueries({ queryKey: ["all-post-takedowns"] });
      queryClient.invalidateQueries({ queryKey: ["author-post-takedowns"] });
    },
  });
};
