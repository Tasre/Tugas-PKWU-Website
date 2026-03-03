import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Heart, Package, ShoppingCart, Shield, Star, Newspaper, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import FavoriteButton from "@/components/FavoriteButton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Navigate, useNavigate } from "react-router-dom";
import ListingDetailDialog from "@/components/marketplace/ListingDetailDialog";
import PostCard from "@/components/news/PostCard";
import { useUserLikedPostsData } from "@/hooks/use-news";
import { useState } from "react";
import { cn } from "@/lib/utils";

const useFavoriteListings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["favorite-listings", user?.id],
    queryFn: async () => {
      const { data: favs, error: favError } = await supabase
        .from("listing_favorites")
        .select("listing_id")
        .eq("user_id", user!.id);
      if (favError) throw favError;
      if (!favs.length) return [];

      const ids = favs.map((f) => f.listing_id);
      const { data, error } = await supabase
        .from("listings")
        .select("*, profiles!listings_seller_id_profiles_fkey(username, avatar_url)")
        .in("id", ids)
        .eq("is_invisible", false) // Filter out invisible/deleted listings
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

const Favorites = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: listings, isLoading: listingsLoading } = useFavoriteListings();
  const { data: posts, isLoading: postsLoading } = useUserLikedPostsData();
  const { formatPrice, t } = useLanguage();
  const [selectedListing, setSelectedListing] = useState<any>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const isEmpty = !listings?.length && !posts?.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 pt-28 pb-16 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-primary fill-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
            <h1 className="font-display text-4xl font-bold text-foreground">Collection</h1>
          </div>
          <p className="text-muted-foreground ml-11 text-sm">
            Your personal treasury of saved listings and interesting news
          </p>
        </motion.div>

        {isEmpty && !listingsLoading && !postsLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-2xl p-24 text-center border border-border/10 flex flex-col items-center justify-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-primary opacity-20" />
            </div>
            <h3 className="font-display text-2xl text-foreground font-bold mb-3">Your collection is empty</h3>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              Start exploring the marketplace and community news to build your personalized collection.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Button
                onClick={() => navigate("/")}
                className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan h-12 px-8 rounded-xl font-bold"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Browse Items
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/news")}
                className="border-primary/20 text-primary hover:bg-primary/5 h-12 px-8 rounded-xl font-bold"
              >
                <Newspaper className="w-4 h-4 mr-2" />
                Read News
              </Button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-16">
            {/* Section 1: Favorited Listings */}
            <section>
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                    <Package className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">Saved Listings</h2>
                    <p className="text-xs text-muted-foreground opacity-60 uppercase tracking-widest font-black">Marketplace Essentials</p>
                  </div>
                </div>
                {!listingsLoading && listings && (
                  <Badge variant="outline" className="h-6 border-border/50 text-[10px] uppercase font-black tracking-tighter bg-background/40">
                    {listings.length} Items
                  </Badge>
                )}
              </div>

              {listingsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden glass border border-border/10">
                      <Skeleton className="aspect-[4/3] w-full" />
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : listings && listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {listings.map((listing: any, index: number) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.05, 0.3) }}
                      whileHover={{ y: -8 }}
                      onClick={() => setSelectedListing(listing)}
                      className="group relative rounded-2xl overflow-hidden glass border border-border/10 cursor-pointer transition-all duration-300 hover:neon-border"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {listing.image_url ? (
                          <img
                            src={listing.image_url}
                            alt={listing.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted/20 flex items-center justify-center">
                            <Package className="w-12 h-12 text-muted-foreground/10" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-60" />
                        <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest">
                          {listing.category}
                        </Badge>
                        <FavoriteButton listingId={listing.id} className="absolute top-3 right-3 z-10 scale-110" />
                      </div>

                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <Gamepad2 className="w-3 h-3 text-primary opacity-60" />
                          <span className="text-[10px] text-primary uppercase font-black tracking-widest">{listing.game}</span>
                        </div>
                        <h3 className="font-display font-bold text-foreground text-base mb-1 truncate group-hover:text-primary transition-colors">{listing.title}</h3>
                        
                        <div className="flex items-center justify-between mb-4 mt-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                              {listing.profiles?.avatar_url ? (
                                <img src={listing.profiles.avatar_url} className="w-full h-full rounded-full object-cover" />
                              ) : <User className="w-3 h-3 text-primary" />}
                            </div>
                            <span className="text-xs text-muted-foreground font-medium truncate max-w-[100px]">
                              {listing.profiles?.username || "Seller"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-primary text-primary" />
                            <span className="text-xs font-bold text-foreground/60">5.0</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-border/10">
                          <span className="font-display font-black text-xl text-foreground">
                            {formatPrice(listing.price)}
                          </span>
                          <span className="text-[10px] text-muted-foreground uppercase font-black opacity-40">{t("item.instantDelivery")}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : null}
            </section>

            {/* Section 2: Liked Posts */}
            <section>
              <div className="flex items-center justify-between mb-6 px-1">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center border border-accent/20">
                    <Newspaper className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-bold text-foreground">Liked Stories</h2>
                    <p className="text-xs text-muted-foreground opacity-60 uppercase tracking-widest font-black">Community Insights</p>
                  </div>
                </div>
                {!postsLoading && posts && (
                  <Badge variant="outline" className="h-6 border-border/50 text-[10px] uppercase font-black tracking-tighter bg-background/40">
                    {posts.length} Posts
                  </Badge>
                )}
              </div>

              {postsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-2xl h-40 glass border border-border/10 animate-pulse" />
                  ))}
                </div>
              ) : posts && posts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {posts.map((post: any) => (
                    <PostCard key={post.id} post={post} interactive={true} />
                  ))}
                </div>
              ) : (
                <div className="glass rounded-2xl p-12 text-center border border-border/10 border-dashed">
                  <Newspaper className="w-8 h-8 mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-xs text-muted-foreground italic">No liked posts yet. Explore the news tab!</p>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <Footer />

      <ListingDetailDialog
        listing={selectedListing}
        open={!!selectedListing}
        onOpenChange={(open) => !open && setSelectedListing(null)}
      />
    </div>
  );
};

const User = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

export default Favorites;
