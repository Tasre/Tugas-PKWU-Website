import { motion } from "framer-motion";
import { Star, ShoppingCart, User, Eye, EyeOff, AlertTriangle, MessageSquare, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsStaff } from "@/hooks/use-staff";
import StaffListingActions from "@/components/staff/StaffListingActions";
import FavoriteButton from "@/components/FavoriteButton";
import type { ListingWithSeller } from "@/hooks/use-games";
import { useUpdateListingStatus } from "@/hooks/use-games";
import { useSellerTakedowns, useListingTakedownMessages, useSendListingTakedownMessage } from "@/hooks/use-staff";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import TakedownChat from "../news/TakedownChat";

interface GamesListingGridProps {
  listings: ListingWithSeller[];
  isLoading: boolean;
  onListingClick: (listing: ListingWithSeller) => void;
  isOwnerView?: boolean;
}

const GamesListingGrid = ({ listings, isLoading, onListingClick, isOwnerView = false }: GamesListingGridProps) => {
  const { data: isStaff } = useIsStaff();
  const updateStatus = useUpdateListingStatus();
  const { data: allTakedowns } = useSellerTakedowns();
  const [appealListingId, setAppealListingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!listings.length) {
    return (
      <div className="text-center py-20">
        <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
        <h3 className="font-display text-lg text-foreground mb-1">No listings found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  const selectedTakedown = allTakedowns?.find(t => t.listing_id === appealListingId);
  const selectedListing = listings.find(l => l.id === appealListingId);

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4", !isOwnerView && "lg:max-w-[80%]")}>
      {listings.map((listing, index) => {
        const isFlagged = listing.status === "flagged";
        const isHidden = listing.status === "hidden";
        const takedown = allTakedowns?.find((t: any) => t.listing_id === listing.id);

        return (
          <div key={listing.id} className="flex flex-col gap-2">
            <motion.div
              id={`listing-${listing.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
              onClick={() => onListingClick(listing)}
              className={cn(
                "glass rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 flex flex-col h-full relative",
                (isFlagged || isHidden) ? "opacity-60 border-destructive/20" : "hover:neon-border"
              )}
            >
              {/* Status Badges */}
              {(isFlagged || isHidden) && (
                <div className="absolute top-2 left-2 flex gap-1 z-10">
                  {isFlagged && <Badge variant="destructive" className="text-[8px] h-4 px-1.5 rounded uppercase font-black">Flagged</Badge>}
                  {isHidden && <Badge variant="secondary" className="text-[8px] h-4 px-1.5 rounded uppercase font-black">Hidden</Badge>}
                </div>
              )}

              {/* Image Container */}
              <div className="relative h-36 bg-gradient-to-br from-primary/10 to-secondary/10 overflow-hidden">
                {listing.image_url || listing.supported_games?.image_url ? (
                  <img
                    src={listing.image_url || listing.supported_games?.image_url}
                    alt={listing.title}
                    className="w-full h-full object-cover transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                )}
                
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  {!isOwnerView && <FavoriteButton listingId={listing.id} />}
                  <span className="px-2 py-0.5 bg-primary/90 rounded text-xs font-bold text-primary-foreground">
                    ${listing.price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Content Area */}
              <div className="p-3 flex-1 flex flex-col gap-2 min-w-0">
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  {listing.category?.map((cat) => (
                    <Badge 
                      key={cat} 
                      variant="secondary"
                      className="cursor-default text-[10px] h-5 px-2 transition-none hover:bg-secondary whitespace-nowrap shrink-0"
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>

                <h3 className="font-display text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {listing.title}
                </h3>

                {listing.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
                )}

                {/* Seller / Management info */}
                <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                      {listing.profiles?.avatar_url ? (
                        <img src={listing.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">
                      {listing.profiles?.username || "Anonymous"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {isOwnerView ? (
                      <div className="flex items-center gap-1">
                        {!isFlagged && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatus.mutate({ listingId: listing.id, status: isHidden ? 'active' : 'hidden' });
                            }}
                            title={isHidden ? "Make Active" : "Hide Listing"}
                          >
                            {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </Button>
                        )}
                        {isFlagged && takedown && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[8px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAppealListingId(listing.id);
                            }}
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" /> Appeal
                          </Button>
                        )}
                      </div>
                    ) : (
                      <>
                        {(listing.seller_avg_rating ?? 0) > 0 && (
                          <>
                            <Star className="w-3 h-3 text-primary fill-primary" />
                            <span className="text-xs text-muted-foreground">{listing.seller_avg_rating?.toFixed(1)}</span>
                          </>
                        )}
                        {isStaff && !isFlagged && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <StaffListingActions
                              listingId={listing.id}
                              sellerId={listing.seller_id}
                              sellerName={listing.profiles?.username || undefined}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        );
      })}

      {/* LISTING APPEAL DIALOG */}
      <Dialog open={!!appealListingId} onOpenChange={(open) => !open && setAppealListingId(null)}>
        <DialogContent className="glass border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Appeal Listing Flag
            </DialogTitle>
            <DialogDescription className="text-xs">
              Disputing flag for: <span className="text-foreground font-bold">{selectedListing?.title}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
              <p className="text-[10px] text-destructive uppercase tracking-widest font-black mb-1 opacity-60 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> Flag Reason
              </p>
              <p className="text-xs text-foreground leading-relaxed italic">
                "{selectedTakedown?.reason || "Violated community marketplace standards"}"
              </p>
            </div>

            <div className="border-t border-border/10 pt-4">
              <TakedownChat 
                takedownId={selectedTakedown?.id || ""} 
                useMessagesHook={useListingTakedownMessages}
                useSendMessageHook={useSendListingTakedownMessage}
                isClosed={selectedTakedown?.status === 'confirmed'}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GamesListingGrid;
