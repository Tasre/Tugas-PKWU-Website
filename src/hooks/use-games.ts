import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GamesFilters {
  search?: string;
  game?: string;
  category?: string[];
  sellerSearch?: string;
  sortBy?: "default" | "newest" | "oldest" | "date_before" | "date_after";
  dateFilter?: string;
}

export interface ListingWithSeller {
  id: string;
  title: string;
  description: string | null;
  price: number;
  game: string;
  category: string[];
  image_url: string | null;
  quantity: string | null;
  status: string;
  seller_id: string;
  created_at: string;
  updated_at: string;
  profiles: { username: string | null; avatar_url: string | null; id: string } | null;
  seller_avg_rating?: number;
  seller_total_sales?: number;
  supported_games?: { image_url: string | null } | null;
}

const getActiveGameNames = async (category?: string[]) => {
  let query = supabase
    .from("listings")
    .select("game")
    .eq("status", "active")
    .limit(1000); // OPTIMIZATION: Limit scan
  
  if (category && category.length > 0) {
    query = query.contains("category", category);
  }

  const { data, error } = await query;
  if (error) throw error;
  return [...new Set(data.map(l => l.game))];
};

export const useSupportedGames = () => {
  return useQuery({
    queryKey: ["all-supported-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supported_games")
        .select("name, image_url")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });
};

// Fetch all listings for a specific user (including hidden/flagged)
export const useUserListings = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*, profiles:seller_id(username, avatar_url)")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ListingWithSeller[];
    },
    enabled: !!user,
  });
};

// Update a listing's status (active/hidden)
export const useUpdateListingStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ listingId, status }: { listingId: string; status: 'active' | 'hidden' }) => {
      const { error } = await supabase
        .from("listings")
        .update({ status } as any)
        .eq("id", listingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-listings"] });
      queryClient.invalidateQueries({ queryKey: ["games-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
    },
  });
};

export const usePopularGames = () => {
  return useQuery({
    queryKey: ["popular-games"],
    queryFn: async () => {
      // OPTIMIZATION: Only scan last 1000 orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("listings(game)")
        .in("status", ["delivered", "processing"])
        .order("created_at", { ascending: false })
        .limit(1000);
      
      if (ordersError) throw ordersError;

      const salesCounts: Record<string, number> = {};
      orders.forEach((o: any) => {
        const gameName = o.listings?.game;
        if (gameName) {
          salesCounts[gameName] = (salesCounts[gameName] || 0) + 1;
        }
      });

      const trendingGameNames = Object.keys(salesCounts);
      if (trendingGameNames.length === 0) return [];

      const { data: supportedGames, error: gamesError } = await supabase
        .from("supported_games")
        .select("name, image_url, game_tags(tag_name)")
        .in("name", trendingGameNames);
      
      if (gamesError) throw gamesError;

      return supportedGames
        .map(game => ({
          ...game,
          sales: salesCounts[game.name] || 0,
          tags: game.game_tags?.map((t: any) => t.tag_name) || []
        }))
        .filter(game => game.sales > 0)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);
    },
  });
};

export const useAlphabeticalGames = () => {
  return useQuery({
    queryKey: ["alphabetical-games"],
    queryFn: async () => {
      const activeGameNames = await getActiveGameNames();
      if (activeGameNames.length === 0) return [];

      const { data, error } = await supabase
        .from("supported_games")
        .select("name, image_url")
        .in("name", activeGameNames);
      
      if (error) throw error;

      return [...(data || [])].sort((a, b) => {
        const nameA = a.name.trim();
        const nameB = b.name.trim();
        const isNumA = /^\d/.test(nameA);
        const isNumB = /^\d/.test(nameB);
        const isAlphaA = /^[a-zA-Z]/.test(nameA);
        const isAlphaB = /^[a-zA-Z]/.test(nameB);
        if (isNumA && !isNumB) return -1;
        if (!isNumA && isNumB) return 1;
        if (isNumA && isNumB) return nameA.localeCompare(nameB, undefined, { numeric: true });
        if (!isAlphaA && isAlphaB) return -1;
        if (isAlphaA && !isAlphaB) return 1;
        return nameA.localeCompare(nameB);
      });
    },
  });
};

export const useGameInfo = (name: string) => {
  return useQuery({
    queryKey: ["game-info", name],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supported_games")
        .select("*")
        .eq("name", name)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!name,
  });
};

export const useActiveGames = (category?: string[]) => {
  return useQuery({
    queryKey: ["active-games", category],
    queryFn: async () => {
      const activeGameNames = await getActiveGameNames(category);
      if (activeGameNames.length === 0) return [];

      const { data: games, error: gamesError } = await supabase
        .from("supported_games")
        .select("name, image_url")
        .in("name", activeGameNames);
      
      if (gamesError) throw gamesError;

      const gameMap: Record<string, string | null> = {};
      games?.forEach(g => {
        gameMap[g.name] = g.image_url;
      });

      return activeGameNames.sort().map(name => ({
        name,
        image_url: gameMap[name] || null
      }));
    },
  });
};

export const useGameTags = (gameName?: string) => {
  return useQuery({
    queryKey: ["game-tags", gameName],
    enabled: !!gameName,
    queryFn: async () => {
      const { data: game } = await supabase
        .from("supported_games")
        .select("id")
        .eq("name", gameName!)
        .single();
      
      if (!game) return [];

      const { data, error } = await supabase
        .from("game_tags")
        .select("tag_name")
        .eq("game_id", game.id);
      
      if (error) throw error;
      return data.map((t) => t.tag_name);
    },
  });
};

export const useGamesListings = (filters: GamesFilters = {}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["games-listings", filters, user?.id],
    enabled: !!filters.game || (!!filters.category && filters.category.length > 0),
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("*, profiles!listings_seller_id_profiles_fkey(username, avatar_url, id)")
        .eq("status", "active")
        .eq("is_invisible", false) // Filter out deleted/invisible listings
        .limit(100); // OPTIMIZATION: Limit total results

      if (filters.game) {
        query = query.eq("game", filters.game);
      }
      if (filters.category && filters.category.length > 0) {
        query = query.contains("category", filters.category);
      }
      if (filters.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      if (filters.sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (filters.sortBy === "oldest") {
        query = query.order("created_at", { ascending: true });
      } else if (filters.sortBy === "date_before" && filters.dateFilter) {
        query = query.lte("created_at", filters.dateFilter).order("created_at", { ascending: false });
      } else if (filters.sortBy === "date_after" && filters.dateFilter) {
        query = query.gte("created_at", filters.dateFilter).order("created_at", { ascending: false });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      let gameImage: string | null = null;
      if (filters.game) {
        const { data: gameData } = await supabase
          .from("supported_games")
          .select("image_url")
          .eq("name", filters.game)
          .maybeSingle();
        gameImage = gameData?.image_url || null;
      }

      let listings = (data as any[]).map(listing => ({
        ...listing,
        profiles: Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles,
        supported_games: gameImage ? { image_url: gameImage } : null,
      })) as ListingWithSeller[];

      if (filters.sellerSearch) {
        const search = filters.sellerSearch.toLowerCase();
        listings = listings.filter((l) => {
          const username = l.profiles?.username?.toLowerCase() || "";
          const sellerId = l.seller_id.toLowerCase();
          return username.includes(search) || sellerId.includes(search);
        });
      }

      if (!filters.sortBy || filters.sortBy === "default") {
        let buyerPrefs: { favorite_games: string[]; favorite_categories: string[] } | null = null;
        if (user) {
          const { data: prefs } = await supabase
            .from("buyer_preferences")
            .select("favorite_games, favorite_categories")
            .eq("user_id", user.id)
            .maybeSingle();
          buyerPrefs = prefs;
          
          // OPTIMIZATION: Limit preference history scan
          const { data: orders } = await supabase
            .from("orders")
            .select("listings(game, category)")
            .eq("buyer_id", user.id)
            .limit(50);

          if (orders) {
            const historyGames = orders.map((o: any) => o.listings?.game).filter(Boolean);
            const historyCats = orders.flatMap((o: any) => o.listings?.category || []).filter(Boolean);
            const allGames = new Set([...(buyerPrefs?.favorite_games || []), ...historyGames]);
            const allCats = new Set([...(buyerPrefs?.favorite_categories || []), ...historyCats]);
            buyerPrefs = { favorite_games: [...allGames], favorite_categories: [...allCats] };
          }
        }
        
        const sellerIds = [...new Set(listings.map((l) => l.seller_id))];
        const { data: reviews } = await supabase
          .from("reviews")
          .select("seller_id, rating")
          .in("seller_id", sellerIds.length > 0 ? sellerIds : ["none"])
          .limit(500);

        const sellerStats: Record<string, { avgRating: number; totalReviews: number }> = {};
        if (reviews) {
          for (const r of reviews) {
            if (!sellerStats[r.seller_id]) { sellerStats[r.seller_id] = { avgRating: 0, totalReviews: 0 }; }
            sellerStats[r.seller_id].totalReviews++;
            sellerStats[r.seller_id].avgRating += r.rating;
          }
          for (const sid of Object.keys(sellerStats)) { sellerStats[sid].avgRating = sellerStats[sid].avgRating / sellerStats[sid].totalReviews; }
        }
        listings = listings.map((l) => ({ ...l, seller_avg_rating: sellerStats[l.seller_id]?.avgRating || 0, seller_total_sales: sellerStats[l.seller_id]?.totalReviews || 0 }));
        listings.sort((a, b) => {
          let scoreA = 0; let scoreB = 0;
          if (buyerPrefs) {
            if (buyerPrefs.favorite_games.includes(a.game)) scoreA += 20;
            if (buyerPrefs.favorite_games.includes(b.game)) scoreB += 20;
            if (a.category.some(cat => buyerPrefs?.favorite_categories.includes(cat))) scoreA += 15;
            if (b.category.some(cat => buyerPrefs?.favorite_categories.includes(cat))) scoreB += 15;
          }
          const ratingA = a.seller_avg_rating || 0; const ratingB = b.seller_avg_rating || 0;
          scoreA += ratingA * 5; scoreB += ratingB * 5;
          const salesA = a.seller_total_sales || 0; const salesB = b.seller_total_sales || 0;
          const maxSales = Math.max(salesA, salesB, 1);
          const usageScoreA = (salesA / maxSales) * 10; const usageScoreB = (salesB / maxSales) * 10;
          const ratingPenaltyA = ratingA < 3 && ratingA > 0 ? -15 : 0; const ratingPenaltyB = ratingB < 3 && ratingB > 0 ? -15 : 0;
          scoreA += usageScoreA + ratingPenaltyA; scoreB += usageScoreB + ratingPenaltyB;
          return scoreB - scoreA;
        });
      }
      return listings;
    },
  });
};

export const useSearchSellers = (search: string) => {
  return useQuery({
    queryKey: ["search-sellers", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(search);
      let query = supabase.from("profiles").select("id, username, avatar_url");
      if (isUuid) { query = query.eq("id", search); } else { query = query.ilike("username", `%${search}%`); }
      const { data, error } = await query.limit(10);
      if (error) throw error;
      return data;
    },
    enabled: search.length >= 2,
  });
};
