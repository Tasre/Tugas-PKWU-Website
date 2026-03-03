import { useState } from "react";
import { Send, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/use-staff";
import { cn } from "@/lib/utils";

interface TakedownChatProps {
  takedownId: string;
  useMessagesHook: any;
  useSendMessageHook: any;
  isClosed?: boolean;
}

const TakedownChat = ({ takedownId, useMessagesHook, useSendMessageHook, isClosed = false }: TakedownChatProps) => {
  const { user } = useAuth();
  const { isStaff: isViewerStaff } = useRole();
  const { data: messages, isLoading } = useMessagesHook(takedownId);
  const sendMessage = useSendMessageHook();
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (!newMessage.trim() || !user || isClosed) return;
    sendMessage.mutate({ takedownId, message: newMessage.trim() }, {
      onSuccess: () => setNewMessage("")
    });
  };

  if (isLoading) return <div className="py-4 text-center text-xs opacity-40">Loading appeal history...</div>;

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {messages?.length === 0 ? (
          <p className="text-[10px] italic opacity-30 text-center py-4">No messages yet. Start the appeal below.</p>
        ) : (
          messages?.map((msg: any) => {
            const isMe = msg.sender_id === user?.id;
            const isStaffSender = msg.profiles?.username && !isMe && !msg.isAuthor; 
            const displayName = (isStaffSender && !isViewerStaff) 
              ? "Staff" 
              : (msg.profiles?.username || "Staff");

            return (
              <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[80%] rounded-2xl p-3 text-xs shadow-sm",
                  isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "glass border-border/20 rounded-tl-none"
                )}>
                  <div className="flex items-center gap-1.5 mb-1 opacity-60 text-[9px] uppercase tracking-widest font-black">
                    {isStaffSender && !isViewerStaff ? (
                      <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center">
                        <ShieldCheck className="w-2 h-2 text-primary" />
                      </div>
                    ) : (
                      <>
                        {msg.profiles?.avatar_url ? (
                          <img src={msg.profiles.avatar_url} className="w-3 h-3 rounded-full object-cover" />
                        ) : (
                          <div className="w-3 h-3 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-2 h-2" /></div>
                        )}
                      </>
                    )}
                    {displayName}
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.message}</p>
                </div>
                <span className="text-[8px] opacity-30 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {isClosed ? (
        <div className="py-3 px-4 rounded-xl bg-muted/10 border border-border/10 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-2">
            <ShieldCheck className="w-3 h-3" />
            Discussion Closed
          </p>
          <p className="text-[9px] text-muted-foreground mt-1 opacity-60">A final decision has been reached by the moderation team.</p>
        </div>
      ) : (
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your appeal or reply..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="bg-background/40 border-border/20 min-h-[40px] text-xs resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={!newMessage.trim() || sendMessage.isPending}
            className="h-10 w-10 flex-shrink-0"
          >
            {sendMessage.isPending ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </div>
  );
};

export default TakedownChat;
