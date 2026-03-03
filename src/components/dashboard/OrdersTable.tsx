import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSellerOrders, useUpdateOrderStatus, type OrderStatus } from "@/hooks/use-seller-data";
import { format } from "date-fns";
import { AlertTriangle, MessageSquare, Send, ShieldAlert, Gavel, Clock, CheckCircle2, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useMarkOrderMessagesRead, useMarkSellerOrdersRead } from "@/hooks/use-notifications";
import OrderChatDialog from "@/components/orders/OrderChatDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  processing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  delivered: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  disputed: "bg-destructive/20 text-destructive border-destructive/30",
};

const DisputeDialog = ({ order }: { order: any }) => {
  const [open, setOpen] = useState(false);
  const isUnread = order.seller_read === false;

  return (
    <div className="flex items-center gap-2">
      <div className="glass rounded-lg px-3 h-8 flex items-center bg-destructive/10 border-destructive/20">
        <span className="text-[10px] font-bold text-destructive uppercase tracking-tighter flex items-center gap-1">
          <Gavel className="w-3 h-3" /> Case Active
        </span>
      </div>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-8 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 transition-all",
              isUnread && "animate-chat-pulse bg-primary/5 border-primary/30"
            )}
          >
            Review Reason
          </Button>
        </DialogTrigger>
        <DialogContent className="glass border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground flex items-center gap-2 uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Dispute Details
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="glass rounded-lg p-4 bg-destructive/5 border-destructive/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]">
              <p className="text-[10px] font-bold text-destructive uppercase mb-2 tracking-widest opacity-60">Buyer's Complaint</p>
              <p className="text-sm text-foreground italic leading-relaxed">"{order.dispute_reason}"</p>
            </div>
            
            <div className="pt-4 border-t border-border/10">
              <p className="text-[10px] text-muted-foreground uppercase font-black mb-4 opacity-40">Communication Channel</p>
              <OrderChatDialog 
                orderId={order.id} 
                orderTitle={order.listings?.title || "Item"}
                isUnread={isUnread}
                otherPartyName="Buyer"
                triggerClassName="w-full h-12 text-sm font-bold border-destructive/30 text-destructive hover:bg-destructive/5"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const DisputedOrderCard = ({ order, formatPrice }: { order: any, formatPrice: (p: number) => string }) => {
  const isUnread = order.seller_read === false;
  const isListingInvisible = order.listings?.is_invisible === true;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "glass rounded-xl p-4 flex flex-col gap-4 bg-destructive/[0.03] border-destructive/40 transition-all",
        isUnread && "animate-chat-pulse bg-primary/5 border-primary/30"
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-foreground truncate text-lg">
            {order.listings?.title || "Listing Removed"}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="text-xs text-muted-foreground font-mono">
              List ID: {isListingInvisible ? "Removed" : `#${order.id.slice(0, 8)}`}
            </span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{format(new Date(order.created_at), "MMM d, yyyy")}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <Badge variant="outline" className="h-5 text-[10px] uppercase border-destructive/30 text-destructive bg-destructive/5 pointer-events-none font-bold">
              Disputed
            </Badge>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-display font-black text-xl text-foreground">{formatPrice(order.amount)}</span>
          <div className="flex items-center gap-2 text-destructive font-bold text-[10px] uppercase tracking-tighter px-2 py-1 rounded bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-3 h-3" />
            Transaction Locked
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-3 pt-3 border-t border-destructive/20">
        <p className="mr-auto text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5 opacity-60">
          <ShieldAlert className="w-3 h-3 text-destructive" />
          Under Investigation
        </p>
        <DisputeDialog order={order} />
      </div>
    </motion.div>
  );
};

const OrdersTable = () => {
  const { data: orders, isLoading } = useSellerOrders();
  const updateStatus = useUpdateOrderStatus();
  const { formatPrice } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!orders?.length) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg mb-2">No orders yet</p>
        <p className="text-muted-foreground text-sm">Orders will appear here when buyers purchase your items.</p>
      </div>
    );
  }

  const disputedOrders = orders.filter(o => o.status === "disputed");
  const activeOrders = orders.filter(o => o.status === "pending" || o.status === "processing");
  const completedOrders = orders.filter(o => o.status === "delivered" || o.status === "cancelled");

  const hasUnreadDispute = disputedOrders.some(o => o.seller_read === false);

  return (
    <div className="space-y-8">
      {/* 1. Disputed Orders Category */}
      {disputedOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Gavel className="w-4 h-4 text-destructive" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-destructive">Disputed Orders</h2>
            {hasUnreadDispute && (
              <Badge variant="outline" className="ml-2 border-destructive/50 text-destructive bg-destructive/10 pointer-events-none animate-pulse font-black text-[10px] tracking-widest">
                ACTION REQUIRED
              </Badge>
            )}
          </div>
          <div className="space-y-4">
            {disputedOrders.map((order) => (
              <DisputedOrderCard key={order.id} order={order} formatPrice={formatPrice} />
            ))}
          </div>
        </div>
      )}

      {/* 2. Active Orders Category */}
      {activeOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-primary">Active Orders</h2>
            <Badge variant="outline" className="ml-2 border-primary/50 text-primary bg-primary/10 pointer-events-none animate-pulse font-black text-[10px] tracking-widest uppercase">
              Require Service
            </Badge>
          </div>
          <div className="space-y-3">
            {activeOrders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all",
                  order.seller_read === false && ["pending", "processing", "disputed"].includes(order.status) && "animate-chat-pulse bg-primary/5 border-primary/30"
                )}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-foreground truncate">
                    {order.listings?.title || "Item Listing Unavailable"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-xs text-muted-foreground">
                      List ID: {order.listings?.is_invisible ? "Removed" : `#${order.id.slice(0, 8)}`}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(order.created_at), "MMM d, yyyy")}</span>
                    {order.buyer_uuid && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          ID: {order.buyer_uuid}
                        </span>
                      </>
                    )}
                    {order.seller_read === false && ["pending", "processing", "disputed"].includes(order.status) && (
                      <Badge className="bg-primary text-primary-foreground text-[8px] h-4 px-1 leading-none">NEW</Badge>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right sm:text-left">
                  <span className="font-display font-bold text-foreground block sm:inline">{formatPrice(order.amount)}</span>
                </div>
                <Badge className={`${statusColors[order.status as OrderStatus]} shrink-0 pointer-events-none uppercase text-[10px]`}>
                  {order.status}
                </Badge>

                {["pending", "processing"].includes(order.status) && (
                  <OrderChatDialog 
                    orderId={order.id} 
                    orderTitle={order.listings?.title || "Item"}
                    isUnread={order.seller_read === false}
                    otherPartyName="Buyer"
                    triggerClassName="h-9"
                  />
                )}

                <Select
                  value={order.status}
                  onValueChange={(v) => updateStatus.mutate({ id: order.id, status: v as OrderStatus })}
                >
                  <SelectTrigger className="w-full sm:w-[140px] bg-card border-border shrink-0 h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass border-border">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Completed Orders (Recent History) */}
      <div className="space-y-3">
        {(disputedOrders.length > 0 || activeOrders.length > 0 || completedOrders.length > 0) && (
          <div className="flex items-center gap-2 px-1 pt-6 border-t border-border/30">
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Recent History</h2>
          </div>
        )}
        {completedOrders.length > 0 ? (
          <div className="space-y-3">
            {completedOrders.map((order, i) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 opacity-70 hover:opacity-100 transition-opacity"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-foreground truncate">
                    {order.listings?.title || "Removed Listing"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="text-xs text-muted-foreground">
                      List ID: {order.listings?.is_invisible ? "Removed" : `#${order.id.slice(0, 8)}`}
                    </span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{format(new Date(order.created_at), "MMM d, yyyy")}</span>
                    {order.buyer_uuid && (
                      <>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          ID: {order.buyer_uuid}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="shrink-0">
                  <span className="font-display font-bold text-foreground">{formatPrice(order.amount)}</span>
                </div>
                <Badge className={`${statusColors[order.status as OrderStatus]} shrink-0 pointer-events-none uppercase text-[10px]`}>
                  {order.status}
                </Badge>
              </motion.div>
            ))}
          </div>
        ) : (
          !disputedOrders.length && !activeOrders.length && (
            <div className="text-center py-16 bg-card/20 rounded-xl border border-dashed border-border/50">
              <Clock className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm font-medium">No order activity found.</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default OrdersTable;
