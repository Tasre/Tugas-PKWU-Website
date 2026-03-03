import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, MessageSquare, Send, Eye, EyeOff, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useFaqItems, useAddFaq, useDeleteFaq, useUpdateFaq,
  useHelpArticles, useAddArticle, useDeleteArticle,
  useAllTickets, useUpdateTicketStatus, useTicketReplies, useAddReply,
} from "@/hooks/use-support";

import { useUnreadStaffDisputeCount, useUnreadOrderMessageCount, useMarkOrderMessagesRead } from "@/hooks/use-notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

const DisputeManagement = () => {
  const queryClient = useQueryClient();
  const { data: disputes, isLoading } = useQuery({
    queryKey: ["staff-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(title), buyer:profiles!orders_buyer_id_profiles_fkey(username), seller:profiles!orders_seller_id_profiles_fkey(username)")
        .eq("status", "disputed")
        .order("dispute_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resolveDisputeMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: "delivered" | "cancelled" }) => {
      const { error } = await supabase.rpc("resolve_dispute_as_staff", {
        p_order_id: orderId,
        p_resolution: status
      });
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["staff-disputes"] });
      toast.success(`Dispute resolved as ${status}`);
    },
    onError: (e: any) => {
      toast.error(`Resolution failed: ${e.message}`);
    }
  });

  const [expanded, setExpanded] = useState<string | null>(null);

  if (isLoading) return <div className="py-8 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-3">
      {disputes?.map((d: any) => (
        <DisputeCard 
          key={d.id} 
          dispute={d} 
          isExpanded={expanded === d.id} 
          onToggle={() => setExpanded(expanded === d.id ? null : d.id)}
          onResolve={(status) => resolveDisputeMutation.mutate({ orderId: d.id, status })}
          isResolving={resolveDisputeMutation.isPending}
        />
      ))}
      {!disputes?.length && <p className="text-center py-8 text-muted-foreground text-sm">No active disputes.</p>}
    </div>
  );
};

const DisputeCard = ({ dispute, isExpanded, onToggle, onResolve, isResolving }: any) => {
  const unreadCount = useUnreadOrderMessageCount(dispute.id);
  const markRead = useMarkOrderMessagesRead();

  useEffect(() => {
    if (isExpanded && unreadCount > 0) {
      markRead.mutate(dispute.id);
    }
  }, [isExpanded, unreadCount, dispute.id]);

  return (
    <div className={`glass rounded-xl overflow-hidden bg-destructive/5 shadow-[0_0_15px_rgba(239,68,68,0.05)] transition-all ${isExpanded ? 'ring-1 ring-destructive/30' : ''} ${unreadCount > 0 ? 'animate-dispute-pulse' : 'border-destructive/30'}`}>
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-3 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm truncate">{dispute.listings?.title}</p>
            {unreadCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Buyer: {dispute.buyer?.username} • Seller: {dispute.seller?.username} • Disputed: {dispute.dispute_at ? format(new Date(dispute.dispute_at), "MMM d") : "Unknown"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-destructive/20 text-destructive border-destructive/30 pointer-events-none uppercase text-[10px]">Disputed</Badge>
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          <div className="p-3 rounded bg-black/40 border border-destructive/20">
            <p className="text-xs font-semibold text-destructive uppercase mb-1">Dispute Reason</p>
            <p className="text-sm text-foreground">{dispute.dispute_reason}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
                <MessageSquare className="w-3 h-3" /> Dispute Chat
              </p>
              {unreadCount > 0 && (
                <span className="text-[10px] text-primary font-bold animate-pulse">NEW MESSAGES</span>
              )}
            </div>
            <TicketReplySection ticketId={dispute.id} isOrder={true} />
          </div>
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border/30">
            <Button 
              size="sm" 
              onClick={() => onResolve("delivered")} 
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
              disabled={isResolving}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Release to Seller
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onResolve("cancelled")} 
              className="border-destructive/30 text-destructive hover:bg-destructive/10 flex-1"
              disabled={isResolving}
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Refund Buyer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const TicketReplySection = ({ ticketId, isOrder = false }: { ticketId: string; isOrder?: boolean }) => {
  const { user } = useAuth();
  const queryKey = isOrder ? ["order-messages", ticketId] : ["ticket-replies", ticketId];
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: replies } = useQuery({
    queryKey,
    queryFn: async () => {
      if (isOrder) {
        const { data, error } = await supabase
          .from("order_messages")
          .select("*, profiles:sender_id(username)")
          .eq("order_id", ticketId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("ticket_replies")
          .select("*, profiles:user_id(username)")
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });
        if (error) throw error;
        return data;
      }
    }
  });

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies]);

  const queryClient = useQueryClient();
  const addReply = useMutation({
    mutationFn: async (message: string) => {
      if (isOrder) {
        const { error } = await supabase
          .from("order_messages")
          .insert({ order_id: ticketId, message, sender_id: user!.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ticket_replies")
          .insert({ ticket_id: ticketId, message, user_id: user!.id, is_staff: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKey });
    }
  });

  const [msg, setMsg] = useState("");

  return (
    <div className="space-y-2 mt-2 pt-2 border-t border-border/30">
      <div 
        ref={scrollRef}
        className="max-h-[200px] overflow-y-auto space-y-2 p-2 scroll-smooth"
      >
        {replies?.map((r: any) => (
          <div key={r.id} className={`p-2 rounded text-xs ${(r.is_staff || r.sender_id === user?.id) ? "bg-primary/10 border border-primary/20" : "bg-muted/50"}`}>
            <span className="font-medium">{(r.is_staff || r.sender_id === user?.id) ? "You/Staff" : (r.profiles?.username || "User")}: </span>
            {r.message}
          </div>
        ))}
        {!replies?.length && <p className="text-center py-4 text-[10px] text-muted-foreground opacity-50 italic">Communication channel active.</p>}
      </div>
      <div className="flex gap-2">
        <Input 
          placeholder="Type message..." 
          value={msg} 
          onChange={(e) => setMsg(e.target.value)} 
          className="bg-card/50 border-border text-xs h-8"
          onKeyDown={(e) => e.key === "Enter" && msg.trim() && (addReply.mutate(msg.trim()), setMsg(""))}
        />
        <Button size="sm" className="h-8 bg-primary text-primary-foreground" disabled={!msg.trim() || addReply.isPending}
          onClick={() => { addReply.mutate(msg.trim()); setMsg(""); }}>
          <Send className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

const SupportManagement = () => {
  const disputeCount = useUnreadStaffDisputeCount();
  const { data: faqs } = useFaqItems();
  const addFaq = useAddFaq();
  const deleteFaq = useDeleteFaq();
  const updateFaq = useUpdateFaq();
  const { data: articles } = useHelpArticles();
  const addArticle = useAddArticle();
  const deleteArticle = useDeleteArticle();
  const { data: tickets } = useAllTickets();
  const updateStatus = useUpdateTicketStatus();

  const [newFaq, setNewFaq] = useState({ question: "", answer: "", category: "General" });
  const [newArticle, setNewArticle] = useState({ title: "", content: "", category: "Getting Started" });
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  const statusColors: Record<string, string> = {
    open: "bg-green-500/20 text-green-400 border-green-500/30",
    in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    resolved: "bg-muted text-muted-foreground border-border",
    closed: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Tabs defaultValue="faqs" className="space-y-4">
      <TabsList className="glass border-border">
        <TabsTrigger value="faqs" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs font-display">FAQs</TabsTrigger>
        <TabsTrigger value="articles" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs font-display">Articles</TabsTrigger>
        <TabsTrigger value="tickets" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs font-display">Tickets</TabsTrigger>
        <TabsTrigger value="disputes" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary text-xs font-display relative">
          Disputes
          {disputeCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] flex items-center justify-center text-primary-foreground font-bold shadow-[0_0_8px_hsl(var(--primary)/0.5)]">
              {disputeCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Disputes */}
      <TabsContent value="disputes" className="space-y-4">
        <DisputeManagement />
      </TabsContent>

      {/* FAQs */}
      <TabsContent value="faqs" className="space-y-4">
        <div className="glass rounded-xl p-4 space-y-3">
          <h4 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">Add FAQ</h4>
          <Input placeholder="Question" value={newFaq.question} onChange={(e) => setNewFaq(p => ({ ...p, question: e.target.value }))} className="bg-card/50 border-border h-9" />
          <Textarea placeholder="Answer" value={newFaq.answer} onChange={(e) => setNewFaq(p => ({ ...p, answer: e.target.value }))} className="bg-card/50 border-border min-h-[60px]" />
          <div className="flex gap-2">
            <Input placeholder="Category" value={newFaq.category} onChange={(e) => setNewFaq(p => ({ ...p, category: e.target.value }))} className="bg-card/50 border-border h-9" />
            <Button size="sm" className="bg-primary text-primary-foreground h-9 px-4" disabled={!newFaq.question.trim() || !newFaq.answer.trim() || addFaq.isPending}
              onClick={() => { addFaq.mutate(newFaq); setNewFaq({ question: "", answer: "", category: "General" }); }}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </div>
        {faqs?.map((faq: any) => (
          <div key={faq.id} className="glass rounded-xl p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{faq.question}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{faq.answer}</p>
              <Badge variant="outline" className="mt-2 text-[10px] font-mono opacity-50 uppercase tracking-wider">{faq.category}</Badge>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" onClick={() => updateFaq.mutate({ id: faq.id, published: !faq.published })} className="text-muted-foreground hover:text-foreground shrink-0 w-8 h-8">
                {faq.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </Button>
              <Button size="icon" variant="ghost" onClick={() => deleteFaq.mutate(faq.id)} className="text-destructive hover:bg-destructive/10 shrink-0 w-8 h-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </TabsContent>

      {/* Articles */}
      <TabsContent value="articles" className="space-y-4">
        <div className="glass rounded-xl p-4 space-y-3">
          <h4 className="font-display text-sm font-semibold text-foreground uppercase tracking-wider">Add Article</h4>
          <Input placeholder="Title" value={newArticle.title} onChange={(e) => setNewArticle(p => ({ ...p, title: e.target.value }))} className="bg-card/50 border-border h-9" />
          <Textarea placeholder="Content" value={newArticle.content} onChange={(e) => setNewArticle(p => ({ ...p, content: e.target.value }))} className="bg-card/50 border-border min-h-[100px]" />
          <div className="flex gap-2">
            <Input placeholder="Category" value={newArticle.category} onChange={(e) => setNewArticle(p => ({ ...p, category: e.target.value }))} className="bg-card/50 border-border h-9" />
            <Button size="sm" className="bg-primary text-primary-foreground h-9 px-4" disabled={!newArticle.title.trim() || !newArticle.content.trim() || addArticle.isPending}
              onClick={() => { addArticle.mutate(newArticle); setNewArticle({ title: "", content: "", category: "Getting Started" }); }}>
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
        </div>
        {articles?.map((a: any) => (
          <div key={a.id} className="glass rounded-xl p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{a.content}</p>
              <Badge variant="outline" className="mt-2 text-[10px] font-mono opacity-50 uppercase tracking-wider">{a.category}</Badge>
            </div>
            <Button size="icon" variant="ghost" onClick={() => deleteArticle.mutate(a.id)} className="text-destructive hover:bg-destructive/10 shrink-0 w-8 h-8">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </TabsContent>

      {/* Tickets */}
      <TabsContent value="tickets" className="space-y-3">
        {!tickets?.length ? (
          <p className="text-center text-muted-foreground py-8 text-sm">No tickets.</p>
        ) : (
          tickets.map((t: any) => (
            <div key={t.id} className="glass rounded-xl overflow-hidden">
              <button onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)} className="w-full p-4 flex items-center gap-3 text-left">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">{(t as any).profiles?.username || "Unknown"} • {t.category} • {format(new Date(t.created_at), "MMM d")}</p>
                </div>
                <Badge className={`${statusColors[t.status] || ""} pointer-events-none`}>{t.status.replace("_", " ")}</Badge>
              </button>
              {expandedTicket === t.id && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="p-3 rounded bg-black/40 border border-border/30">
                    <p className="text-sm text-foreground leading-relaxed">{t.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {["open", "in_progress", "resolved", "closed"].map((s) => (
                      <Button key={s} size="sm" variant={t.status === s ? "default" : "outline"} className="text-[10px] h-7 px-3 uppercase tracking-wider"
                        onClick={() => updateStatus.mutate({ id: t.id, status: s })}>
                        {s.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                  <TicketReplySection ticketId={t.id} />
                </div>
              )}
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
};

export default SupportManagement;
