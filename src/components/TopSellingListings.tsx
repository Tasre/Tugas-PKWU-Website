import { motion } from "framer-motion";
import { Flame, ArrowRight, ShoppingCart, Star, Shield, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTopSellingListings } from "@/hooks/use-marketplace";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

const TopSellingListings = () => {
  const { t, formatPrice } = useLanguage();
  const { data: listings, isLoading } = useTopSellingListings();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-[400px] rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Section ONLY shows if there are listings with at least 1 purchase
  if (!listings || listings.length === 0) return null;

  return (
    <section className="py-24 relative overflow-hidden bg-background">
      <div className="absolute top-1/4 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-24 w-96 h-96 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
        >
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Top <span className="text-gradient">Listings</span>
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Hand-picked by the community. These are our most successful and highly-rated items based on total confirmed sales.
            </p>
          </div>
          <Button 
            variant="ghost" 
            className="group text-primary hover:text-primary hover:bg-primary/10 font-bold"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: "instant" });
              navigate("/games");
            }}
          >
            Explore All
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing, index) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -10 }}
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "instant" });
                navigate(`/games?game=${encodeURIComponent(listing.game)}&listingId=${listing.id}`);
              }}
              className="group relative rounded-2xl overflow-hidden glass border-white/5 hover:border-primary/30 transition-all duration-500 cursor-pointer"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {listing.image_url || listing.game_image_url ? (
                  <img
                    src={listing.image_url || listing.game_image_url}
                    alt={listing.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                    <Package className="w-12 h-12 text-muted-foreground/20" />
                  </div>
                )}
                
                <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 max-w-[80%]">
                  {listing.category?.map((cat: string) => (
                    <Badge key={cat} className="bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px] h-6 px-2.5 font-bold uppercase tracking-widest">
                      {cat}
                    </Badge>
                  ))}
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan font-bold scale-90 group-hover:scale-100 transition-transform duration-300">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Purchase
                  </Button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
                    {listing.game}
                  </span>
                  <div className="flex items-center gap-1.5 text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                    <Flame className="w-3 h-3 fill-orange-500" />
                    <span className="text-[10px] font-black uppercase">Trending</span>
                  </div>
                </div>
                
                <h3 className="font-display font-bold text-xl text-white mb-2 line-clamp-1 group-hover:text-primary transition-colors">
                  {listing.title}
                </h3>

                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">{listing.profiles?.username}</span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-foreground">5.0</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <span className="font-display font-black text-2xl text-white">
                    {formatPrice(listing.price)}
                  </span>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Total Sales</p>
                    <p className="text-sm font-black text-primary font-mono">{listing.purchase_count}+</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TopSellingListings;
