import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

// FAQ
export const useFaqItems = () => {
  return useQuery({
    queryKey: ["faq-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_items")
        .select("*")
        .order("sort_order")
        .limit(100); // OPTIMIZATION
      if (error) throw error;
      return data;
    },
  });
};

export const useAddFaq = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (faq: { question: string; answer: string; category: string }) => {
      const { error } = await supabase.from("faq_items").insert({ ...faq, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faq-items"] });
      toast({ title: "FAQ added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateFaq = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; question?: string; answer?: string; category?: string; published?: boolean }) => {
      const { error } = await supabase.from("faq_items").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faq-items"] });
      toast({ title: "FAQ updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteFaq = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("faq_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faq-items"] });
      toast({ title: "FAQ deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

// Help Articles
export const useHelpArticles = () => {
  return useQuery({
    queryKey: ["help-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("help_articles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100); // OPTIMIZATION
      if (error) throw error;
      return data;
    },
  });
};

export const useAddArticle = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (article: { title: string; content: string; category: string }) => {
      const { error } = await supabase.from("help_articles").insert({ ...article, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help-articles"] });
      toast({ title: "Article added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useDeleteArticle = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("help_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["help-articles"] });
      toast({ title: "Article deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

// Support Tickets
export const useMyTickets = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-tickets", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50); // OPTIMIZATION
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useAllTickets = () => {
  return useQuery({
    queryKey: ["all-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100); // OPTIMIZATION
      if (error) throw error;
      
      const userIds = [...new Set(data.map((t: any) => t.user_id))];
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p.username]) || []);
      
      return data.map((t: any) => ({ ...t, profiles: { username: profileMap.get(t.user_id) || "Unknown" } }));
    },
  });
};

export const useCreateTicket = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ticket: { subject: string; description: string; category: string }) => {
      const { error } = await supabase.from("support_tickets").insert({ ...ticket, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      toast({ title: "Ticket submitted", description: "Our staff will respond shortly." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateTicketStatus = () => {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["all-tickets"] });
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      toast({ title: "Ticket updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};

// Ticket Replies
export const useTicketReplies = (ticketId: string) => {
  return useQuery({
    queryKey: ["ticket-replies", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_replies")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at")
        .limit(200); // OPTIMIZATION
      if (error) throw error;
      
      const userIds = [...new Set(data.map((r: any) => r.user_id))];
      if (userIds.length === 0) return data.map((r: any) => ({ ...r, profiles: { username: "System" } }));

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.id, p.username]) || []);
      
      return data.map((r: any) => ({ ...r, profiles: { username: profileMap.get(r.user_id) || "Unknown" } }));
    },
    enabled: !!ticketId,
  });
};

export const useAddReply = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ ticketId, message, isStaff }: { ticketId: string; message: string; isStaff: boolean }) => {
      const { error } = await supabase.from("ticket_replies").insert({
        ticket_id: ticketId,
        user_id: user!.id,
        message,
        is_staff: isStaff,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["ticket-replies", vars.ticketId] });
      toast({ title: "Reply sent" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
};
