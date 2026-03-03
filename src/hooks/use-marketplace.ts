import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Listing, Order } from "@/hooks/use-seller-data";

export interface MarketplaceFilters {
  game?: string;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}

export const useMarketplaceListings = (filters: MarketplaceFilters = {}) => {
  return useQuery({
    queryKey: ["marketplace-listings", filters],
    queryFn: async () => {
      let query = supabase
        .from("listings")
        .select("*, profiles!listings_seller_id_profiles_fkey(username, avatar_url)")
        .eq("status", "active")
        .eq("is_invisible", false) // Filter out deleted/invisible listings
        .order("created_at", { ascending: false })
        .limit(50); // OPTIMIZATION: Limit initial load

      if (filters.game) query = query.eq("game", filters.game);
      if (filters.category) {
        query = query.contains("category", [filters.category]);
      }
      if (filters.search) query = query.ilike("title", `%${filters.search}%`);
      if (filters.minPrice !== undefined) query = query.gte("price", filters.minPrice);
      if (filters.maxPrice !== undefined) query = query.lte("price", filters.maxPrice);

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as (Listing & { profiles: { username: string | null; avatar_url: string | null } | null })[];
    },
  });
};

export const useMarketplaceGames = () => {
  return useQuery({
    queryKey: ["marketplace-games"],
    queryFn: async () => {
      // OPTIMIZATION: Only fetch unique games from the supported_games table instead of all listings
      const { data, error } = await supabase
        .from("supported_games")
        .select("name")
        .order("name");
      if (error) throw error;
      return data.map((g) => g.name);
    },
  });
};

export const useTopItemTypes = () => {
  return useQuery({
    queryKey: ["top-item-types"],
    queryFn: async () => {
      // OPTIMIZATION: Limit listing scan for categories to most recent 500
      const { data: listings, error } = await supabase
        .from("listings")
        .select("category")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(500);
      
      if (error) throw error;

      const counts: Record<string, number> = {};
      listings.forEach((l) => {
        if (Array.isArray(l.category)) {
          l.category.forEach((cat: string) => {
            counts[cat] = (counts[cat] || 0) + 1;
          });
        }
      });

      const uniqueTags = Object.keys(counts);
      if (uniqueTags.length === 0) return [];

      const { data: tagInfo } = await supabase
        .from("game_tags")
        .select("tag_name, supported_games(name)")
        .in("tag_name", uniqueTags);

      const tagMap: Record<string, string> = {};
      tagInfo?.forEach((ti: any) => {
        tagMap[ti.tag_name] = ti.supported_games?.name;
      });

      return Object.entries(counts)
        .map(([name, count]) => ({ 
          name, 
          count,
          gameName: tagMap[name] 
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
  });
};

export const useTopGamesWithTags = () => {
  return useQuery({
    queryKey: ["top-games-with-tags"],
    queryFn: async () => {
      // OPTIMIZATION: Limit listing scan to most recent 1000
      const { data: listings, error } = await supabase
        .from("listings")
        .select("game")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;

      const counts: Record<string, number> = {};
      listings.forEach((l) => { counts[l.game] = (counts[l.game] || 0) + 1; });

      const { data: games } = await supabase
        .from("supported_games")
        .select("name, image_url, game_tags(tag_name)");

      return Object.entries(counts)
        .map(([name, count]) => {
          const gameData = games?.find((g) => g.name === name);
          return {
            name,
            count,
            image_url: gameData?.image_url || null,
            tags: gameData?.game_tags?.map((t: any) => t.tag_name) || [],
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
  });
};

export const useTopSellingListings = () => {
  return useQuery({
    queryKey: ["top-selling-listings"],
    queryFn: async () => {
      // OPTIMIZATION: Only look at the last 1000 orders to calculate trending
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("listing_id")
        .in("status", ["delivered", "processing"])
        .order("created_at", { ascending: false })
        .limit(1000);
      
      if (ordersError) throw ordersError;

      const salesCounts: Record<string, number> = {};
      orders.forEach(o => {
        salesCounts[o.listing_id] = (salesCounts[o.listing_id] || 0) + 1;
      });

      const topListingIds = Object.entries(salesCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id]) => id);

      if (topListingIds.length === 0) return [];

      const { data: supportedGames } = await supabase
        .from("supported_games")
        .select("name, image_url");
      
      const gameImageMap: Record<string, string> = {};
      supportedGames?.forEach(g => {
        if (g.image_url) gameImageMap[g.name] = g.image_url;
      });

      const { data: listings, error: listingsError } = await supabase
        .from("listings")
        .select("*, profiles!listings_seller_id_profiles_fkey(username, avatar_url)")
        .in("id", topListingIds)
        .eq("status", "active")
        .eq("is_invisible", false);

      if (listingsError) throw listingsError;

      return (listings as any[]).map(l => ({
        ...l,
        purchase_count: salesCounts[l.id] || 0,
        game_image_url: gameImageMap[l.game] || null
      })).sort((a, b) => b.purchase_count - a.purchase_count);
    },
  });
};

export const usePlaceOrder = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      listing, 
      buyerUuid, 
      paymentMethod 
    }: { 
      listing: Listing; 
      buyerUuid: string; 
      paymentMethod: string 
    }) => {
      if (!user) throw new Error("You must be logged in to place an order");
      
      const { data, error } = await supabase
        .from("orders")
        .insert({
          listing_id: listing.id,
          buyer_id: user.id,
          seller_id: listing.seller_id,
          amount: listing.price,
          buyer_uuid: buyerUuid,
          payment_method: paymentMethod
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
      toast({ title: "Order Placed!", description: "Your order has been placed successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Order Failed", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: any }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (error: any) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });
};

export const useBuyerOrders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["buyer-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(*)")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50); // OPTIMIZATION: Limit order history
      if (error) throw error;
      return (data as any[]).map(order => ({
        ...order,
        listings: Array.isArray(order.listings) ? order.listings[0] : order.listings
      })) as (Order & { listings: Listing })[];
    },
    enabled: !!user,
  });
};
