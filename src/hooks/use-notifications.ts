import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useNotifications = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
};

export const useUnreadCount = () => {
  const { user } = useAuth();
  const { data: count } = useQuery({
    queryKey: ["notifications-unread-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });
  return (typeof count === 'number' && !isNaN(count)) ? count : 0;
};

export const useUnreadStaffDisputeCount = () => {
  const { user } = useAuth();
  const { data: count } = useQuery({
    queryKey: ["staff-disputes-unread-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count, error } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .in("type", ["staff_dispute", "staff_dispute_message"]);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });
  return (typeof count === 'number' && !isNaN(count)) ? count : 0;
};

export const useUnreadDashboardCount = () => {
  const { user } = useAuth();
  const { data: count } = useQuery({
    queryKey: ["dashboard-unread-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      // 1. Get unread notifications related to disputes
      const { count: notifCount, error: notifError } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false)
        .in("type", ["dispute", "dispute_message"]);
      
      const safeNotifCount = notifError ? 0 : (notifCount ?? 0);

      // 2. Count total individual unread messages for the seller
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("seller_id", user.id)
        .in("status", ["pending", "processing", "disputed"]);
      
      if (ordersError || !orders?.length) return safeNotifCount;

      const orderIds = orders.map(o => o.id);
      const { count: msgCount, error: msgError } = await supabase
        .from("order_messages" as any)
        .select("id", { count: "exact", head: true })
        .in("order_id", orderIds)
        .eq("read", false)
        .neq("sender_id", user.id);
      
      const safeMsgCount = msgError ? 0 : (msgCount ?? 0);

      return safeNotifCount + safeMsgCount;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });
  return (typeof count === 'number' && !isNaN(count)) ? count : 0;
};

export const useUnreadBuyerOrderCount = () => {
  const { user } = useAuth();
  const { data: count } = useQuery({
    queryKey: ["buyer-order-unread-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      // 1. Find buyer's active orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id")
        .eq("buyer_id", user.id)
        .in("status", ["pending", "processing", "disputed"]);
      
      if (ordersError || !orders?.length) return 0;

      // 2. Count total individual unread messages
      const orderIds = orders.map(o => o.id);
      const { count: msgCount, error: msgError } = await supabase
        .from("order_messages" as any)
        .select("id", { count: "exact", head: true })
        .in("order_id", orderIds)
        .eq("read", false)
        .neq("sender_id", user.id);
      
      return msgError ? 0 : (msgCount ?? 0);
    },
    enabled: !!user,
    refetchInterval: 10000,
  });
  return (typeof count === 'number' && !isNaN(count)) ? count : 0;
};

export const useUnreadOrderMessageCount = (orderId: string) => {
  const { user, role } = useAuth();
  const { data: count } = useQuery({
    queryKey: ["order-read-status", orderId, user?.id],
    queryFn: async () => {
      if (!user || !orderId) return 0;
      
      const { data, error } = await supabase
        .from("orders")
        .select("buyer_id, seller_id, buyer_read, seller_read, staff_read")
        .eq("id", orderId)
        .single();
      
      if (error) return 0;

      const isStaff = ["staff", "admin", "owner"].includes(role || "");
      let isUnread = false;
      
      if (isStaff) isUnread = data.staff_read === false;
      else if (user.id === data.buyer_id) isUnread = data.buyer_read === false;
      else if (user.id === data.seller_id) isUnread = data.seller_read === false;
      
      return isUnread ? 1 : 0;
    },
    enabled: !!user && !!orderId,
    refetchInterval: 5000,
  });
  return (typeof count === 'number' && !isNaN(count)) ? count : 0;
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
};

export const useMarkOrderMessagesRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc("mark_order_messages_read", { p_order_id: orderId });
      if (error) throw error;
    },
    onSuccess: (_, orderId) => {
      queryClient.invalidateQueries({ queryKey: ["order-read-status", orderId] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["buyer-order-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["staff-disputes-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["staff-disputes"] });
    },
  });
};

export const useMarkSellerOrdersRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("mark_seller_orders_read");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-unread-count"] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
};
