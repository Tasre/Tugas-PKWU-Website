import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTakedownPost } from "@/hooks/use-news";

import { toast } from "sonner";

interface StaffPostActionsProps {
  postId: string;
  authorId: string;
  authorName?: string;
}

const StaffPostActions = ({ postId, authorId, authorName }: StaffPostActionsProps) => {
  const takedown = useTakedownPost();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-400 hover:text-yellow-300" title="Flag post">
          <ShieldAlert className="w-3.5 h-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">Flag Post</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          This will flag the post for review and hide it from the public feed. The author ({authorName}) will be notified.
        </p>
        <div className="space-y-3 mt-2">
          <Textarea
            placeholder="Reason for flagging (optional)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-card/50 border-border min-h-[80px]"
          />
          <Button
            variant="destructive"
            onClick={() => {
              takedown.mutate(
                { postId, reason: reason.trim() || undefined },
                { 
                  onSuccess: () => { 
                    setOpen(false); 
                    setReason(""); 
                    toast.success("Post has been flagged for review");
                  },
                  onError: (err: any) => {
                    toast.error("Failed to flag post: " + err.message);
                  }
                }
              );
            }}
            disabled={takedown.isPending}
            className="w-full"
          >
            <ShieldAlert className="w-4 h-4 mr-2" /> Confirm Flagging
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StaffPostActions;
