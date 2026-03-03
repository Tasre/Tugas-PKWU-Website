import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Star, ShoppingCart, Clock, AlertTriangle, CreditCard, Hash, CheckCircle2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePlaceOrder, useUpdateProfile } from "@/hooks/use-marketplace";
import type { Listing } from "@/hooks/use-seller-data";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import FavoriteUserButton from "@/components/FavoriteUserButton";

interface ListingDetailDialogProps {
  listing: (Listing & { profiles: { username: string | null; avatar_url: string | null } | null }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ListingDetailDialog = ({ listing, open, onOpenChange }: ListingDetailDialogProps) => {
  const { formatPrice } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const placeOrder = usePlaceOrder();
  const updateProfile = useUpdateProfile();
  const [confirming, setConfirming] = useState(false);
  const [buyerUuid, setBuyerUuid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (user && open) {
      const checkVerification = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("buyer_verified")
          .eq("id", user.id)
          .single();
        setIsVerified(!!data?.buyer_verified);
      };
      checkVerification();
    }
  }, [user, open]);

  if (!listing) return null;

  const isOwnListing = user?.id === listing.seller_id;

  const handleBuy = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }

    if (!buyerUuid || !paymentMethod) {
      return;
    }

    placeOrder.mutate({ 
      listing, 
      buyerUuid, 
      paymentMethod 
    }, {
      onSuccess: () => {
        if (!isVerified) {
          updateProfile.mutate({ userId: user.id, updates: { buyer_verified: true } });
        }
        setConfirming(false);
        onOpenChange(false);
        setBuyerUuid("");
        setPaymentMethod("");
      },
      onError: (err: any) => {
        console.error("Order error detail:", err);
        alert("Order failed: " + (err.message || "Unknown error"));
      },
      onSettled: () => {
        setConfirming(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setConfirming(false); }}>
      <DialogContent className={cn(
        "glass border-border sm:max-w-lg outline-none flex flex-col p-0 overflow-hidden max-h-[90vh]"
      )}>
        <style dangerouslySetInnerHTML={{ __html: `
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.1);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(var(--primary-rgb), 0.3);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(var(--primary-rgb), 0.5);
          }
        `}} />
        
        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-2xl text-foreground leading-tight">{listing.title}</DialogTitle>
            <DialogDescription className="text-primary font-bold text-sm tracking-wide uppercase">{listing.game}</DialogDescription>
          </DialogHeader>

          {listing.image_url && (
            <div className="relative aspect-video rounded-xl overflow-hidden shadow-2xl border border-white/5">
              <img
                src={listing.image_url}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              {/* UNIFIED STYLE: All badges now use variant="secondary" matching the custom label */}
              {Array.isArray(listing.category) ? (
                listing.category.map((cat) => (
                  <Badge 
                    key={cat} 
                    variant="secondary"
                    className="transition-none cursor-default hover:bg-secondary py-1 px-3"
                  >
                    {cat}
                  </Badge>
                ))
              ) : (
                <Badge 
                  variant="secondary"
                  className="transition-none cursor-default hover:bg-secondary py-1 px-3"
                >
                  {listing.category}
                </Badge>
              )}
              
              {listing.quantity && (
                <Badge 
                  variant="secondary" 
                  className="transition-none cursor-default hover:bg-secondary py-1 px-3"
                >
                  {listing.quantity}
                </Badge>
              )}
            </div>

            {listing.description && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">
                    {listing.profiles?.username || "Seller"}
                  </p>
                  <FavoriteUserButton userId={listing.seller_id} username={listing.profiles?.username || "Seller"} />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Verified Seller</p>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                  <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Escrow Protected</p>
                </div>
              </div>
              {isVerified && (
                <Badge variant="outline" className="text-[9px] gap-1 border-primary/30 text-primary bg-primary/5 font-black uppercase">
                  <CheckCircle2 className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>

            {confirming && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5 p-5 rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_30px_rgba(var(--primary-rgb),0.1)]"
              >
                <div className="space-y-2">
                  <Label htmlFor="uuid" className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5" />
                    In-Game identifier
                  </Label>
                  <Input
                    id="uuid"
                    placeholder="UUID or Character Name..."
                    value={buyerUuid}
                    onChange={(e) => setBuyerUuid(e.target.value)}
                    className="bg-background/80 border-primary/20 focus:border-primary h-11 text-sm"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment" className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <CreditCard className="w-3.5 h-3.5" />
                    Payment Method
                  </Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                    <SelectTrigger id="payment" className="bg-background/80 border-primary/20 focus:border-primary h-11">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="glass border-primary/20">
                      <SelectItem value="credit_card">Credit / Debit Card</SelectItem>
                      <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      <SelectItem value="balance">Store Balance</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground font-medium italic opacity-60">* Payments are held in escrow until delivery is confirmed.</p>
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest pt-2">
              <Clock className="w-3.5 h-3.5" />
              <span>Created {new Date(listing.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Fixed Footer for Price and Purchase Button */}
        <div className="p-6 bg-background/80 backdrop-blur-xl border-t border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Price</p>
            <p className="font-display text-3xl font-black text-foreground tracking-tight">
              {formatPrice(listing.price)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isOwnListing ? (
              <Badge variant="secondary" className="px-4 py-2 font-black uppercase tracking-widest text-xs">Your Listing</Badge>
            ) : confirming ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirming(false)}
                  className="text-muted-foreground font-bold hover:text-foreground"
                >
                  Back
                </Button>
                <Button
                  onClick={handleBuy}
                  disabled={placeOrder.isPending || !buyerUuid || !paymentMethod}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)] px-6 h-12"
                >
                  {placeOrder.isPending ? (
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleBuy}
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] px-8 h-12"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Purchase
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ListingDetailDialog;
