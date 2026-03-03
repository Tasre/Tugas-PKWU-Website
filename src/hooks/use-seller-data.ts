import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type ListingStatus = "active" | "sold" | "paused" | "draft" | "hidden";
export type OrderStatus = "pending" | "processing" | "delivered" | "cancelled" | "disputed";

export interface Listing {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  game: string;
  category: string[];
  price: number;
  quantity: string | null;
  image_url: string | null;
  status: ListingStatus;
  is_invisible: boolean;
  stock: number | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  buyer_uuid?: string;
  payment_method?: string;
  dispute_reason?: string;
  dispute_at?: string;
  seller_read?: boolean;
  buyer_read?: boolean;
  staff_read?: boolean;
  listings?: Listing;
}

export interface ListingFormData {
  title: string;
  description: string;
  game: string;
  category: string[];
  price: number;
  quantity: string;
  image_url: string;
  stock?: number | null;
}

export const useSellerListings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["seller-listings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listings")
        .select("*")
        .eq("seller_id", user!.id)
        .eq("is_invisible", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Listing[];
    },
    enabled: !!user,
  });
};

export const useSellerOrders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["seller-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(*)")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data as any[]).map(order => ({
        ...order,
        listings: Array.isArray(order.listings) ? order.listings[0] : order.listings
      })) as Order[];
    },
    enabled: !!user,
  });
};

export const useCreateListing = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (listing: ListingFormData) => {
      const { data, error } = await supabase
        .from("listings")
        .insert({
          seller_id: user!.id,
          title: listing.title,
          description: listing.description || null,
          game: listing.game,
          category: listing.category,
          price: listing.price,
          quantity: listing.quantity || null,
          image_url: listing.image_url || null,
          stock: listing.stock || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-listings"] });
      toast({ title: "Listing Created", description: "Your item has been listed successfully." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateListingStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ListingStatus }) => {
      const { error } = await supabase
        .from("listings")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-listings"] });
      toast({ title: "Updated", description: "Listing status has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useDeleteListing = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // SOFT DELETE: Make invisible instead of physical deletion
      const { error } = await supabase
        .from("listings")
        .update({ is_invisible: true } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-listings"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-listings"] });
      queryClient.invalidateQueries({ queryKey: ["games-listings"] });
      toast({ title: "Deleted", description: "Listing has been removed." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      toast({ title: "Updated", description: "Order status has been updated." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};
