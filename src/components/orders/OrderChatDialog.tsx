import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { MessageSquare, Send, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMarkOrderMessagesRead } from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";

interface OrderChatDialogProps {
  orderId: string;
  orderTitle: string;
  isUnread: boolean;
  otherPartyName: string;
  triggerClassName?: string;
  onOpenChange?: (open: boolean) => void;
}

const OrderChatDialog = ({ 
  orderId, 
  orderTitle, 
  isUnread, 
  otherPartyName,
  triggerClassName,
  onOpenChange 
}: OrderChatDialogProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const markRead = useMarkOrderMessagesRead();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["order-messages", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_messages")
        .select("*, profiles!order_messages_sender_id_fkey(username, avatar_url)")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open && !!orderId && !!user,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      markRead.mutate(orderId);
    }
    if (onOpenChange) onOpenChange(open);
  }, [open, orderId, messages?.length]); // Added messages?.length to re-mark when new messages arrive while open

  const handleSend = async () => {
    if (!msg.trim() || !user) return;
    const { error } = await supabase
      .from("order_messages")
      .insert({ order_id: orderId, message: msg.trim(), sender_id: user.id });
    if (!error) {
      setMsg("");
      queryClient.invalidateQueries({ queryKey: ["order-messages", orderId] });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-8 text-xs transition-all gap-1.5",
            isUnread ? "bg-primary/10 text-primary border-primary/30 animate-pulse shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]" : "text-muted-foreground hover:text-primary",
            triggerClassName
          )}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border sm:max-w-md flex flex-col h-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground flex items-center gap-2 uppercase tracking-widest text-sm">
            <MessageSquare className="w-4 h-4 text-primary" />
            Chat: {otherPartyName}
          </DialogTitle>
          <p className="text-[10px] text-muted-foreground truncate uppercase font-bold opacity-60">
            Re: {orderTitle}
          </p>
        </DialogHeader>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 p-2 my-4 rounded-xl bg-black/20 border border-border/10 custom-scrollbar scroll-smooth"
        >
          {isLoading ? (
            <div className="h-full flex items-center justify-center opacity-40 text-xs">Loading history...</div>
          ) : messages?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 opacity-20 py-12">
              <MessageSquare className="w-8 h-8" />
              <p className="text-[10px] font-black uppercase tracking-widest text-center">No messages yet.<br/>Start the conversation!</p>
            </div>
          ) : (
            messages?.map((m: any) => {
              const isMe = m.sender_id === user?.id;
              return (
                <div key={m.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl p-3 text-xs shadow-sm",
                    isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "glass border-border/20 rounded-tl-none"
                  )}>
                    <div className="flex items-center gap-1.5 mb-1 opacity-60 text-[9px] uppercase tracking-widest font-black">
                      {m.profiles?.avatar_url ? (
                        <img src={m.profiles.avatar_url} className="w-3 h-3 rounded-full object-cover" />
                      ) : (
                        <User className="w-2 h-2" />
                      )}
                      {m.profiles?.username || "System"}
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{m.message}</p>
                  </div>
                  <span className="text-[8px] opacity-30 mt-1 px-1">
                    {format(new Date(m.created_at), "HH:mm")}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          <Input 
            placeholder="Type your message..." 
            value={msg} 
            onChange={(e) => setMsg(e.target.value)}
            className="glass border-border/20 h-10 text-xs resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button size="icon" onClick={handleSend} disabled={!msg.trim()} className="h-10 w-10 shrink-0 shadow-lg glow-cyan">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderChatDialog;
