import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Package, AlertTriangle, Clock, CheckCircle2, XCircle, ShoppingCart, Star, Send, MessageSquare, ShieldCheck, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useMarkOrderMessagesRead } from "@/hooks/use-notifications";
import OrderChatDialog from "@/components/orders/OrderChatDialog";
import { cn } from "@/lib/utils";

type OrderStatus = "pending" | "processing" | "delivered" | "cancelled" | "disputed";

const statusConfig: Record<OrderStatus, { color: string; icon: typeof Clock }> = {
  pending: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  processing: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Package },
  delivered: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle2 },
  cancelled: { color: "bg-muted text-muted-foreground border-border", icon: XCircle },
  disputed: { color: "bg-destructive/20 text-destructive border-destructive/30", icon: AlertTriangle },
};

const useBuyerOrders = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["buyer-orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, listings(title, game, category, image_url, is_invisible), profiles!orders_seller_id_profiles_fkey(username)")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

const useExistingReviews = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-reviews", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("reviewer_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

const useDisputeOrder = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ 
          status: "disputed" as OrderStatus,
          dispute_reason: reason,
          dispute_at: new Date().toISOString()
        })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
      toast({ title: "Dispute Filed", description: "Your dispute has been submitted. Our team will review it shortly." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

const useResolveDispute = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.rpc("resolve_dispute", { p_order_id: orderId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buyer-orders"] });
      toast({ title: "Dispute Resolved", description: "The dispute has been marked as resolved." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

const useSubmitReview = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (review: { order_id: string; listing_id: string; seller_id: string; reviewer_id: string; rating: number; comment: string }) => {
      const { error } = await supabase.from("reviews").insert(review);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      toast({ title: "Review Submitted", description: "Thank you for your feedback!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
};

const DisputeDialog = ({ order }: { order: any }) => {
  const [open, setOpen] = useState(false);
  const isUnread = order.buyer_read === false;
  const isListingInvisible = order.listings?.is_invisible === true;
  const disputeOrder = useDisputeOrder();
  const resolveDispute = useResolveDispute();
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const handleDispute = () => {
    if (!reason.trim()) {
      toast({ title: "Required", description: "Please provide a reason for your dispute.", variant: "destructive" });
      return;
    }
    disputeOrder.mutate({ orderId: order.id, reason: reason.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={cn(
            "h-8 text-xs transition-all",
            order.status === "disputed" ? "border-primary/30 text-primary hover:bg-primary/10" : "border-destructive/30 text-destructive hover:bg-destructive/10",
            order.status === "disputed" && isUnread && "animate-chat-pulse bg-primary/5 border-primary/30"
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
          {order.status === "disputed" ? "Dispute Details" : "File Dispute"}
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground flex items-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${order.status === "disputed" ? "text-primary" : "text-destructive"}`} />
            {order.status === "disputed" ? "Dispute Investigation" : "File a Dispute"}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          {order.status !== "disputed" ? (
            <>
              <div className="glass rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium text-foreground">{order.listings?.title || "Removed Listing"}</p>
                <p className="text-xs text-muted-foreground">
                  List ID: {isListingInvisible ? "Removed" : `#${order.id.slice(0, 8)}`}
                </p>
              </div>
              <Textarea
                placeholder="Describe the issue with this order..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="glass border-border min-h-[100px]"
              />
              <div className="flex gap-2 justify-end">
                <DialogClose asChild>
                  <Button variant="ghost" size="sm">Cancel</Button>
                </DialogClose>
                <Button
                  size="sm"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={disputeOrder.isPending || !reason.trim()}
                  onClick={handleDispute}
                >
                  Submit Dispute
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="glass rounded-lg p-4 bg-destructive/5 border-destructive/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]">
                <p className="text-[10px] font-bold text-destructive uppercase mb-2 tracking-widest opacity-60">Your Complaint</p>
                <p className="text-sm text-foreground italic leading-relaxed">"{order.dispute_reason}"</p>
              </div>
              
              <div className="pt-4 border-t border-border/10">
                <p className="text-[10px] text-muted-foreground uppercase font-black mb-4 opacity-40">Communication Hub</p>
                <OrderChatDialog 
                  orderId={order.id} 
                  orderTitle={order.listings?.title || "Item"}
                  isUnread={isUnread}
                  otherPartyName={order.profiles?.username || "Seller"}
                  triggerClassName="w-full h-12 text-sm font-bold border-destructive/30 text-destructive hover:bg-destructive/5"
                />
              </div>

              <div className="pt-2 border-t border-border/30">
                <DialogClose asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-xs border-green-500/30 text-green-500 hover:bg-green-500/10"
                    onClick={() => resolveDispute.mutate(order.id)}
                    disabled={resolveDispute.isPending}
                  >
                    <ShieldCheck className="w-3 h-3 mr-2" />
                    I've resolved this issue (Close Dispute)
                  </Button>
                </DialogClose>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ReviewDialog = ({ order }: { order: any }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const submitReview = useSubmitReview();

  const handleSubmit = () => {
    if (rating === 0) return;
    submitReview.mutate({
      order_id: order.id,
      listing_id: order.listing_id,
      seller_id: order.seller_id,
      reviewer_id: user!.id,
      rating,
      comment: comment.trim(),
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-primary/30 text-primary hover:bg-primary/10">
          <Star className="w-3 h-3 mr-1" /> Review
        </Button>
      </DialogTrigger>
      <DialogContent className="glass border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground flex items-center gap-2">
            <Star className="w-5 h-5 text-primary" />
            Leave a Review
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="glass rounded-lg p-3 space-y-1">
            <p className="text-sm font-medium text-foreground">{order.listings?.title || "Removed Listing"}</p>
            <p className="text-xs text-muted-foreground">
              Seller: {order.profiles?.username || "Unknown"}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= (hoveredRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="Share your experience (optional)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="glass border-border min-h-[80px]"
          />
          <div className="flex gap-2 justify-end">
            <DialogClose asChild>
              <Button variant="ghost" size="sm">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={submitReview.isPending || rating === 0}
                onClick={handleSubmit}
              >
                <Send className="w-3 h-3 mr-1" /> Submit Review
              </Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const OrderHistory = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useLanguage();
  const { data: orders, isLoading } = useBuyerOrders();
  const { data: existingReviews } = useExistingReviews();

  const reviewedOrderIds = new Set(existingReviews?.map((r: any) => r.order_id) || []);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-28 pb-16 text-center">
          <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground mb-4">Sign in to view your order history.</p>
          <Button onClick={() => navigate("/auth")} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Sign In
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const disputedOrders = orders?.filter((o: any) => o.status === "disputed") || [];
  const otherOrders = orders?.filter((o: any) => o.status !== "disputed") || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-28 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Order <span className="text-gradient">History</span>
            </h1>
          </div>
          <p className="text-muted-foreground ml-11">View your purchases and manage disputes</p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !orders?.length ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground text-lg mb-2">No orders yet</p>
            <p className="text-muted-foreground text-sm mb-6">Your purchase history will appear here.</p>
            <Button onClick={() => navigate("/")} className="bg-primary text-primary-foreground hover:bg-primary/90">
              Browse Marketplace
            </Button>
          </div>
        ) : (
          <div className="space-y-8 max-w-3xl">
            {/* Disputed Section */}
            {disputedOrders.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <h2 className="text-sm font-bold uppercase tracking-widest text-destructive">Active Disputes</h2>
                </div>
                {disputedOrders.map((order: any, i: number) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    formatPrice={formatPrice} 
                    reviewedOrderIds={reviewedOrderIds}
                    index={i}
                  />
                ))}
              </div>
            )}

            {/* Other Orders */}
            <div className="space-y-3">
              {disputedOrders.length > 0 && (
                <div className="flex items-center gap-2 px-1 pt-4 border-t border-border/30">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Order History</h2>
                </div>
              )}
              {otherOrders.map((order: any, i: number) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  formatPrice={formatPrice} 
                  reviewedOrderIds={reviewedOrderIds}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

const OrderCard = ({ order, formatPrice, reviewedOrderIds, index }: any) => {
  const cfg = statusConfig[order.status as OrderStatus];
  const StatusIcon = cfg?.icon || Clock;
  const canReview = order.status === "delivered" && !reviewedOrderIds.has(order.id);
  const hasReviewed = reviewedOrderIds.has(order.id);
  
  // Unread logic for Pending, Processing, and Disputed
  const isUnread = ["pending", "processing", "disputed"].includes(order.status) && order.buyer_read === false;
  const isListingInvisible = order.listings?.is_invisible === true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        "glass rounded-xl p-4 space-y-3 border-border/50 transition-all",
        order.status === 'disputed' && "bg-destructive/[0.03] border-destructive/20",
        isUnread && "animate-chat-pulse bg-primary/5 border-primary/30"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <StatusIcon className={`w-5 h-5 shrink-0 hidden sm:block ${order.status === 'disputed' ? 'text-destructive' : 'text-muted-foreground'}`} />
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-foreground truncate">
            {order.listings?.title || "Removed Listing"}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
            <span className="text-xs text-muted-foreground">
              List ID: {isListingInvisible ? "Removed" : `#${order.id.slice(0, 8)}`}
            </span>
            <span>•</span>
            <span>{format(new Date(order.created_at), "MMM d, yyyy")}</span>
            <span>•</span>
            <span>{order.listings?.game || "Category N/A"}</span>
            {order.profiles?.username && (
              <>
                <span>•</span>
                <span>Seller: {order.profiles.username}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-display font-bold text-foreground">{formatPrice(order.amount)}</span>
          <span className={cn(
            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
            cfg?.color || "bg-muted"
          )}>
            {order.status}
          </span>
        </div>
      </div>

      <div className="flex justify-end items-center gap-2 pt-1 border-t border-border/30">
        {order.was_disputed && (
          <Badge variant="outline" className="mr-auto border-muted-foreground/30 text-muted-foreground text-[10px] flex items-center gap-1 uppercase pointer-events-none">
            <History className="w-3 h-3" /> Resolved Dispute
          </Badge>
        )}
        
        {hasReviewed && (
          <Badge variant="outline" className="border-primary/30 text-primary text-xs">
            <Star className="w-3 h-3 mr-1 fill-primary" /> Reviewed
          </Badge>
        )}

        {["pending", "processing"].includes(order.status) && (
          <OrderChatDialog 
            orderId={order.id} 
            orderTitle={order.listings?.title || "Item"}
            isUnread={order.buyer_read === false}
            otherPartyName={order.profiles?.username || "Seller"}
          />
        )}

        {canReview && <ReviewDialog order={order} />}
        
        {(order.status === "disputed" || (order.status === "delivered" && !order.was_disputed)) && (
          (() => {
            if (order.status === "disputed") return <DisputeDialog order={order} />;
            
            const deliveredDate = new Date(order.updated_at);
            const now = new Date();
            const diffHours = (now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60);
            if (diffHours <= 24) {
              return <DisputeDialog order={order} />;
            }
            return null;
          })()
        )}
      </div>
    </motion.div>
  );
};

export default OrderHistory;
