import { useState } from "react";
import { ShieldAlert, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTakedownListing, useBanUser } from "@/hooks/use-staff";

interface StaffListingActionsProps {
  listingId: string;
  sellerId: string;
  sellerName?: string;
}

const StaffListingActions = ({ listingId, sellerId, sellerName }: StaffListingActionsProps) => {
  const takedown = useTakedownListing();
  const banUser = useBanUser();
  const [takedownOpen, setTakedownOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [banType, setBanType] = useState<"sell_ban" | "full_ban">("sell_ban");
  const [banReason, setBanReason] = useState("");

  return (
    <div className="flex gap-1">
      {/* Flag */}
      <Dialog open={takedownOpen} onOpenChange={setTakedownOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-400 hover:text-yellow-300" title="Flag listing">
            <ShieldAlert className="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Flag Listing</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            This will flag the listing for review and hide it from the marketplace. The seller ({sellerName}) will be notified.
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
                takedown.mutate({ listingId, reason: reason.trim() || undefined }, {
                  onSuccess: () => { setTakedownOpen(false); setReason(""); },
                });
              }}
              disabled={takedown.isPending}
              className="w-full"
            >
              <ShieldAlert className="w-4 h-4 mr-2" /> Confirm Flagging
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban */}
      <Dialog open={banOpen} onOpenChange={setBanOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Ban seller">
            <Ban className="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="glass border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">Ban {sellerName || "User"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Select value={banType} onValueChange={(v: any) => setBanType(v)}>
              <SelectTrigger className="bg-card/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass border-border">
                <SelectItem value="sell_ban">Sell Ban</SelectItem>
                <SelectItem value="full_ban">Full Ban</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Reason for ban (optional)..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="bg-card/50 border-border min-h-[80px]"
            />
            <Button
              variant="destructive"
              onClick={() => {
                banUser.mutate({ userId: sellerId, banType, reason: banReason.trim() || undefined }, {
                  onSuccess: () => { setBanOpen(false); setBanReason(""); },
                });
              }}
              disabled={banUser.isPending}
              className="w-full"
            >
              <Ban className="w-4 h-4 mr-2" /> Ban User
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffListingActions;
