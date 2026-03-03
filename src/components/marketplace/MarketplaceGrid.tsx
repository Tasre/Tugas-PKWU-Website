import { motion } from "framer-motion";
import { ShoppingCart, Shield, Star, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import FavoriteButton from "@/components/FavoriteButton";
import type { Listing } from "@/hooks/use-seller-data";
import { useNavigate } from "react-router-dom";

interface MarketplaceListing extends Listing {
  profiles: { username: string | null; avatar_url: string | null } | null;
}

interface MarketplaceGridProps {
  listings: MarketplaceListing[] | undefined;
  isLoading: boolean;
  onListingClick: (listing: MarketplaceListing) => void;
}

const MarketplaceGrid = ({ listings, isLoading, onListingClick }: MarketplaceGridProps) => {
  const { formatPrice, t } = useLanguage();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden glass">
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-24" />
              <div className="flex justify-between">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!listings?.length) {
    return (
      <div className="text-center py-20">
        <Package className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
        <h3 className="font-display text-xl text-foreground mb-2">No Listings Found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or check back later</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:max-w-[80%]">
      {listings.map((listing, index) => (
        <motion.div
          key={listing.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ y: -8 }}
          onClick={() => navigate(`/games?game=${encodeURIComponent(listing.game)}&listingId=${listing.id}`)}
          className="group relative rounded-xl overflow-hidden glass cursor-pointer"
        >
          {/* Image */}
          <div className="relative aspect-[4/3] overflow-hidden">
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={listing.title}
                className="w-full h-full object-cover transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <Package className="w-12 h-12 text-muted-foreground/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

            <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[70%]">
              {listing.category?.map((cat) => (
                <Badge key={cat} className="bg-primary/90 text-primary-foreground text-[10px] h-5 px-1.5 whitespace-nowrap">
                  {cat}
                </Badge>
              ))}
            </div>
            <FavoriteButton listingId={listing.id} className="absolute top-3 right-3 z-10" />

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/60 backdrop-blur-sm">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan">
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t("item.buyNow")}
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="p-4">
            <div className="text-xs text-primary mb-1 font-medium">{listing.game}</div>
            <h3 className="font-display font-semibold text-foreground mb-1 truncate">{listing.title}</h3>
            {listing.quantity && (
              <p className="text-xs text-muted-foreground mb-2">{listing.quantity}</p>
            )}

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">
                  {listing.profiles?.username || "Seller"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-primary text-primary" />
                <span className="text-xs text-muted-foreground">5.0</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-lg text-foreground">
                {formatPrice(listing.price)}
              </span>
              <span className="text-xs text-muted-foreground">{t("item.instantDelivery")}</span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default MarketplaceGrid;
