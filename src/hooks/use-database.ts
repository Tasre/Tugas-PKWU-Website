import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Listing = Database["public"]["Tables"]["listings"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];

export const useAllProfiles = () => {
  return useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      return (data as any[]).map(profile => ({
        ...profile,
        user_roles: Array.isArray(profile.user_roles) ? profile.user_roles : (profile.user_roles ? [profile.user_roles] : [])
      }));
    },
  });
};

export const useAllListings = () => {
  return useQuery({
    queryKey: ["admin-listings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*, profiles!listings_seller_id_profiles_fkey(username)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      return (data as any[]).map(listing => ({
        ...listing,
        profiles: Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles
      }));
    },
  });
};

export const useAllOrders = () => {
  return useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          listings(title),
          buyer:profiles!orders_buyer_id_profiles_fkey(username),
          seller:profiles!orders_seller_id_profiles_fkey(username)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      return (data as any[]).map(order => ({
        ...order,
        listings: Array.isArray(order.listings) ? order.listings[0] : order.listings,
        buyer: Array.isArray(order.buyer) ? order.buyer[0] : order.buyer,
        seller: Array.isArray(order.seller) ? order.seller[0] : order.seller
      }));
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast({ title: "User Deleted", description: "The user profile has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateUserRole = () => {
  // ... existing code ...
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "user" | "staff" | "admin" | "owner" }) => {
      const { error } = await supabase.rpc("update_user_role", {
        target_user_id: userId,
        new_role: role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["all-users-with-roles"] });
      toast({ title: "Role Updated", description: "The user role has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useSchemaInfo = () => {
  return useQuery({
    queryKey: ["database-schema"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_schema_info");
      if (error) throw error;
      return data as Array<{
        table_name: string;
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
        is_foreign_key: boolean;
        foreign_table: string | null;
        foreign_column: string | null;
      }>;
    },
  });
};
