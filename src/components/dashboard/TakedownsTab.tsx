import { useState } from "react";
import { AlertTriangle, MessageSquare, Clock, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSellerTakedowns, useListingTakedownMessages, useSendListingTakedownMessage } from "@/hooks/use-staff";
import TakedownChat from "../news/TakedownChat";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  seller_responded: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-green-500/20 text-green-400 border-green-500/30",
  confirmed: "bg-destructive/20 text-destructive border-destructive/30",
};

const TakedownsTab = () => {
  const { data: takedowns, isLoading } = useSellerTakedowns();
  const [activeChat, setActiveChat] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!takedowns?.length) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
        <p className="text-muted-foreground font-display uppercase tracking-widest text-[10px] font-black opacity-40">No flagged listings</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {takedowns.map((td: any) => (
        <div key={td.id} className="glass rounded-2xl p-6 space-y-4 border border-border/10 shadow-xl overflow-hidden relative">
          {td.status === 'pending' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/40" />}
          
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-display font-black text-foreground text-sm mb-1">
                {td.listings?.title || "Listing"}
              </h4>
              <p className="text-xs text-muted-foreground">
                {td.listings?.game} • {td.listings?.category}
              </p>
            </div>
            <Badge variant="outline" className={statusColors[td.status] || ""}>
              {td.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                <p className="text-[9px] text-destructive uppercase tracking-widest font-black mb-2 opacity-60">Staff Reason</p>
                <p className="text-xs text-foreground">{td.reason}</p>
              </div>

              {td.status === 'cancelled' && (
                <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
                  <p className="text-xs text-green-400/80">✓ Flag removed. Your listing is back online.</p>
                </div>
              )}
              {td.status === 'confirmed' && (
                <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                  <p className="text-xs text-destructive/80">✗ Takedown confirmed. This listing is permanently removed.</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setActiveChat(activeChat === td.id ? null : td.id)}
                className="w-full justify-between h-12 border border-border/10 hover:bg-primary/5 group rounded-xl"
              >
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">
                  <MessageSquare className="w-4 h-4 text-primary" /> Appeal Discussion
                </span>
                <span className="text-[10px] opacity-40">{activeChat === td.id ? "Close Chat" : "Open Chat"}</span>
              </Button>
              
              {(td.status === 'pending' || td.status === 'seller_responded') && (
                <p className="text-[9px] text-center text-muted-foreground italic px-4">
                  Chat with the staff to appeal this flag.
                </p>
              )}
            </div>
          </div>

          {activeChat === td.id && (
            <div className="mt-6 pt-6 border-t border-border/10">
              <TakedownChat 
                takedownId={td.id} 
                useMessagesHook={useListingTakedownMessages}
                useSendMessageHook={useSendListingTakedownMessage}
                isClosed={td.status === 'confirmed'}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[8px] text-muted-foreground uppercase tracking-widest font-bold opacity-40">
            <span>Ref: {td.id.slice(0, 8)}</span>
            <span>{new Date(td.created_at).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TakedownsTab;
