import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// Check if current user has a specific role
export const useRole = () => {
  const { role } = useAuth();
  
  return {
    isOwner: role === "owner",
    isAdmin: role === "owner" || role === "admin",
    isStaff: role === "owner" || role === "admin" || role === "staff",
    currentRole: role,
  };
};

// Old hook compatibility (alias)
export const useIsStaff = () => {
  const { isStaff } = useRole();
  return { data: isStaff, isLoading: false };
};

// Update user role mutation
export const useUpdateUserRole = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "owner" | "admin" | "staff" | "user" }) => {
      // Use the security definer function we created in the migration
      const { error } = await supabase.rpc("update_user_role", {
        target_user_id: userId,
        new_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-users-with-roles"] });
      toast({ title: "User role updated successfully" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

// Fetch all users with their roles (for management)
export const useAllUsersWithRoles = () => {
  return useQuery({
    queryKey: ["all-users-with-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, user_roles(role)");
      if (error) throw error;
      return (data as any[]).map(user => {
        let role = "user";
        if (user.user_roles) {
          if (Array.isArray(user.user_roles)) {
            role = user.user_roles[0]?.role || "user";
          } else {
            role = (user.user_roles as any).role || "user";
          }
        }
        return {
          ...user,
          role
        };
      });
    },
  });
};

// Supported games
export const useSupportedGames = () => {
  return useQuery({
    queryKey: ["supported-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supported_games")
        .select("*, game_tags(*)")
        .order("name");
      if (error) throw error;
      return data.map((g:any) => ({
        ...g,
        image_url: g.image_url || null // Ensure image_url exists
      }));
    },
  });
};

export const useAddGame = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("supported_games")
        .insert({ name, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supported-games"] });
      toast({ title: "Game added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteGame = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supported_games").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supported-games"] });
      toast({ title: "Game removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useAddGameTag = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ gameId, tagName }: { gameId: string; tagName: string }) => {
      const { error } = await supabase
        .from("game_tags")
        .insert({ game_id: gameId, tag_name: tagName, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supported-games"] });
      toast({ title: "Tag added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteGameTag = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("game_tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supported-games"] });
      toast({ title: "Tag removed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateGameImage = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ gameId, imageUrl }: { gameId: string; imageUrl: string | null }) => {
      const { error } = await supabase
        .from("supported_games")
        .update({ image_url: imageUrl })
        .eq("id", gameId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["supported-games"] });
      toast({ title: "Game image updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

// Takedowns (Listings)
export const useTakedownListing = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ listingId, reason }: { listingId: string; reason?: string }) => {
      // Phase 1: Flag the listing (instantly hides it)
      const { error: listingErr } = await supabase
        .from("listings")
        .update({ status: "flagged" as any })
        .eq("id", listingId);
      if (listingErr) throw listingErr;

      // Create takedown record
      const { error } = await supabase.from("listing_takedowns").insert({
        listing_id: listingId,
        staff_id: user!.id,
        reason,
        status: 'pending'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-takedowns"] });
      qc.invalidateQueries({ queryKey: ["games-listings"] });
      qc.invalidateQueries({ queryKey: ["marketplace-listings"] });
      toast({ title: "Listing has been flagged for review" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useAllTakedowns = () => {
  return useQuery({
    queryKey: ["all-takedowns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_takedowns")
        .select(`
          *,
          listings:listing_id (
            title,
            seller_id,
            game,
            category,
            profiles:seller_id (
              username
            )
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data as any[]).map(td => {
        // Supabase might return listings as an array or object depending on schema
        const listing = Array.isArray(td.listings) ? td.listings[0] : td.listings;
        if (listing) {
          // Same for profiles inside listing
          listing.profiles = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
        }
        return { ...td, listings: listing };
      });
    },
  });
};

export const useSellerTakedowns = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["seller-takedowns", user?.id],
    queryFn: async () => {
      // Get seller's listing IDs first
      const { data: listings } = await supabase
        .from("listings")
        .select("id")
        .eq("seller_id", user!.id);
      if (!listings?.length) return [];

      const listingIds = listings.map((l) => l.id);
      const { data, error } = await supabase
        .from("listing_takedowns")
        .select(`
          *,
          listings:listing_id (
            title,
            game,
            category
          )
        `)
        .in("listing_id", listingIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      return (data as any[]).map(td => ({
        ...td,
        listings: Array.isArray(td.listings) ? td.listings[0] : td.listings
      }));
    },
    enabled: !!user,
  });
};

export const useResolveTakedown = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, listingId, action }: { id: string; listingId: string; action: "cancel" | "confirm" }) => {
      const status = action === "cancel" ? "cancelled" : "confirmed";
      
      // Phase 1: Update the takedown record status
      const { error: tdError } = await supabase
        .from("listing_takedowns")
        .update({ status: status as any })
        .eq("id", id);
      if (tdError) throw tdError;

      // Phase 2: Action on the listing itself
      if (action === "cancel") {
        // If flag is removed, restore listing to active
        await supabase.from("listings").update({ status: "active" as any }).eq("id", listingId);
      } else {
        // SOFT DELETE: Match seller deletion logic
        const { error: deleteErr } = await supabase
          .from("listings")
          .update({ is_invisible: true } as any)
          .eq("id", listingId);
        if (deleteErr) throw deleteErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-takedowns"] });
      qc.invalidateQueries({ queryKey: ["seller-takedowns"] });
      qc.invalidateQueries({ queryKey: ["games-listings"] });
      qc.invalidateQueries({ queryKey: ["marketplace-listings"] });
      qc.invalidateQueries({ queryKey: ["seller-listings"] });
      qc.invalidateQueries({ queryKey: ["user-listings"] });
      toast({ title: "Resolution confirmed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

// Chat hooks for Listing Takedowns
export const useListingTakedownMessages = (takedownId: string) => {
  return useQuery({
    queryKey: ["listing_takedown_messages", takedownId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listing_takedown_messages" as any)
        .select("*, profiles:sender_id(username, avatar_url)")
        .eq("takedown_id", takedownId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!takedownId,
  });
};

export const useSendListingTakedownMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ takedownId, message }: { takedownId: string; message: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if author
      const { data: td } = await supabase
        .from("listing_takedowns")
        .select("listings:listing_id(seller_id)")
        .eq("id", takedownId)
        .single();

      const isSeller = (td as any)?.listings?.seller_id === user.id;

      const { data, error } = await supabase
        .from("listing_takedown_messages" as any)
        .insert({
          takedown_id: takedownId,
          sender_id: user.id,
          message,
        })
        .select()
        .single();
      if (error) throw error;

      if (isSeller) {
        await supabase
          .from("listing_takedowns")
          .update({ status: "seller_responded" as any })
          .eq("id", takedownId);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["listing_takedown_messages", variables.takedownId] });
      queryClient.invalidateQueries({ queryKey: ["all-takedowns"] });
      queryClient.invalidateQueries({ queryKey: ["seller-takedowns"] });
    },
  });
};

// Bans
export const useBanUser = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, banType, reason }: { userId: string; banType: "sell_ban" | "full_ban"; reason?: string }) => {
      const { error } = await supabase.from("user_bans").insert({
        user_id: userId,
        banned_by: user!.id,
        ban_type: banType as any,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-bans"] });
      toast({ title: "User banned" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useUnbanUser = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_bans").update({ active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-bans"] });
      toast({ title: "Ban lifted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useAllBans = () => {
  return useQuery({
    queryKey: ["all-bans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_bans")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

// Search users for banning
export const useSearchUsersForBan = (search: string) => {
  return useQuery({
    queryKey: ["search-users-ban", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .ilike("username", `%${search}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: search.length >= 2,
  });
};
