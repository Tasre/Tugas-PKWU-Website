import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, MessageSquare, AlertCircle } from "lucide-react";
import { useAllPostTakedowns, useResolvePostTakedown, usePostTakedownMessages, useSendPostTakedownMessage } from "@/hooks/use-news";
import TakedownChat from "../news/TakedownChat";
import { useState } from "react";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  author_responded: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-green-500/20 text-green-400 border-green-500/30",
  confirmed: "bg-destructive/20 text-destructive border-destructive/30",
};

const PostTakedownManagement = () => {
  const { data: takedowns, isLoading } = useAllPostTakedowns();
  const resolve = useResolvePostTakedown();
  const [activeChat, setActiveChat] = useState<string | null>(null);

  if (isLoading) return <div className="text-muted-foreground text-sm flex items-center gap-2"><Clock className="w-4 h-4 animate-spin" /> Loading post takedowns...</div>;

  if (!takedowns?.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p className="font-display uppercase tracking-widest text-[10px] font-black opacity-40">No pending takedowns</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {takedowns.map((td: any) => (
        <div key={td.id} className="glass rounded-2xl p-6 space-y-4 border border-border/10 shadow-xl overflow-hidden relative">
          {/* Subtle background indicator for pending actions */}
          {td.status === 'pending' && <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/40" />}
          
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-display font-black text-foreground text-base leading-tight mb-1">
                {td.post?.title || "Unknown Post"}
              </h4>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold opacity-60">
                {td.post?.game} • Author: <span className="text-primary">{td.post?.profiles?.username || "Unknown"}</span>
              </p>
            </div>
            <Badge variant="outline" className={statusColors[td.status] || ""}>
              {td.status.replace("_", " ").toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
              <p className="text-[9px] text-destructive uppercase tracking-widest font-black mb-2 opacity-60">Staff Reason</p>
              <p className="text-xs text-foreground leading-relaxed italic">"{td.reason || "No reason provided"}"</p>
            </div>

            <div className="space-y-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setActiveChat(activeChat === td.id ? null : td.id)}
                className="w-full justify-between h-10 border border-border/10 hover:bg-primary/5 group"
              >
                <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60 group-hover:opacity-100">
                  <MessageSquare className="w-3.5 h-3.5" /> Appeal Chat
                </span>
                <span className="text-[10px] opacity-40">{activeChat === td.id ? "Close" : "Open"}</span>
              </Button>

              {(td.status === "pending" || td.status === "author_responded") && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolve.mutate({ id: td.id, postId: td.post_id, action: "cancel" })}
                    disabled={resolve.isPending}
                    className="flex-1 h-10 border-green-500/20 text-green-400 hover:bg-green-500/10 hover:text-green-300 font-black uppercase tracking-widest text-[10px]"
                  >
                    <X className="w-3 h-3 mr-1.5" /> Remove Flag
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => resolve.mutate({ id: td.id, postId: td.post_id, action: "confirm" })}
                    disabled={resolve.isPending}
                    className="flex-1 h-10 font-black uppercase tracking-widest text-[10px] glow-destructive"
                  >
                    <Check className="w-3 h-3 mr-1.5" /> Confirm Takedown
                  </Button>
                </div>
              )}
            </div>
          </div>

          {activeChat === td.id && (
            <div className="pt-4 border-t border-border/10">
              <TakedownChat 
                takedownId={td.id} 
                useMessagesHook={usePostTakedownMessages}
                useSendMessageHook={useSendPostTakedownMessage}
                isClosed={td.status === 'confirmed'}
              />
            </div>
          )}

          <div className="flex items-center justify-between text-[8px] text-muted-foreground uppercase tracking-widest font-bold opacity-40">
            <span>Ref: {td.id.slice(0, 8)}</span>
            <span>Flagged on: {new Date(td.created_at).toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PostTakedownManagement;
