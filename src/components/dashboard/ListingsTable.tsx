import { motion } from "framer-motion";
import { Trash2, Pause, Play, MoreVertical, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useSellerListings,
  useUpdateListingStatus,
  useDeleteListing,
  type Listing,
  type ListingStatus,
} from "@/hooks/use-seller-data";
import { useSellerTakedowns } from "@/hooks/use-staff";

const statusColors: Record<ListingStatus, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  sold: "bg-primary/20 text-primary border-primary/30",
  paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  draft: "bg-muted text-muted-foreground border-border",
  hidden: "bg-destructive/20 text-destructive border-destructive/30",
};

const ListingsTable = () => {
  const { data: listings, isLoading } = useSellerListings();
  const { data: takedowns } = useSellerTakedowns();
  const updateStatus = useUpdateListingStatus();
  const deleteListing = useDeleteListing();
  const { formatPrice } = useLanguage();

  // Map listing IDs to their active (pending/seller_responded) takedown
  const activeTakedownMap = new Map<string, any>();
  takedowns?.forEach((td: any) => {
    if (td.status === "pending" || td.status === "seller_responded") {
      activeTakedownMap.set(td.listing_id, td);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!listings?.length) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground text-lg mb-2">No listings yet</p>
        <p className="text-muted-foreground text-sm">Create your first listing to start selling!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {listings.map((listing, i) => (
        <motion.div
          key={listing.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-xl overflow-hidden"
        >
          {/* Takedown warning banner */}
          {listing.status === "hidden" && activeTakedownMap.has(listing.id) && (
            <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border-b border-destructive/20">
              <ShieldAlert className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">
                <span className="font-semibold">Takedown Notice:</span>{" "}
                {activeTakedownMap.get(listing.id)?.reason || "No reason provided"} — Respond in the Takedowns tab
              </p>
            </div>
          )}
          <div className="p-4 flex items-center gap-4">
          {/* Image */}
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
            {listing.image_url ? (
              <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                No img
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-semibold text-foreground truncate">{listing.title}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-primary">{listing.game}</span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{listing.category}</span>
            </div>
          </div>

          {/* Price */}
          <div className="text-right shrink-0">
            <span className="font-display font-bold text-foreground">{formatPrice(listing.price)}</span>
            {listing.quantity && (
              <p className="text-xs text-muted-foreground">{listing.quantity}</p>
            )}
          </div>

          {/* Status */}
          <Badge className={`${statusColors[listing.status]} shrink-0`}>
            {listing.status}
          </Badge>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-border">
              {listing.status === "active" ? (
                <DropdownMenuItem
                  onClick={() => updateStatus.mutate({ id: listing.id, status: "paused" })}
                  className="cursor-pointer"
                >
                  <Pause className="w-4 h-4 mr-2" /> Pause Listing
                </DropdownMenuItem>
              ) : listing.status === "paused" || listing.status === "draft" ? (
                <DropdownMenuItem
                  onClick={() => updateStatus.mutate({ id: listing.id, status: "active" })}
                  className="cursor-pointer"
                >
                  <Play className="w-4 h-4 mr-2" /> Activate Listing
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onClick={() => deleteListing.mutate(listing.id)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ListingsTable;
