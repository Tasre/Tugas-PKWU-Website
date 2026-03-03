import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Star, User, Newspaper, ShoppingBag, Crown } from "lucide-react";
import FavoriteUserButton from "./FavoriteUserButton";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const Spotlight = () => {
  const { data: spotlightUsers, isLoading } = useQuery({
    queryKey: ["spotlight-users"],
    queryFn: async () => {
      // 1. Fetch active authors (those with most public posts)
      const { data: topAuthors } = await supabase
        .from("posts")
        .select("author_id")
        .eq("status", "public")
        .limit(20);
      
      const authorIds = [...new Set(topAuthors?.map(a => a.author_id) || [])];

      // 2. Fetch active sellers (those with active listings)
      const { data: topSellers } = await supabase
        .from("listings")
        .select("seller_id")
        .eq("status", "active")
        .limit(20);
      
      const sellerIds = [...new Set(topSellers?.map(s => s.seller_id) || [])];

      // Combine and get profile data
      const allIds = [...new Set([...authorIds, ...sellerIds])].slice(0, 6);
      
      if (allIds.length === 0) return [];

      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, bio")
        .in("id", allIds);

      if (error) throw error;

      // Add "type" labels for the UI
      return profiles.map(p => ({
        ...p,
        isAuthor: authorIds.includes(p.id),
        isSeller: sellerIds.includes(p.id)
      }));
    }
  });

  return (
    <section className="py-24 bg-muted/5 border-y border-border/5">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500/20" />
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Spotlight
            </h2>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Meet the top creators and trusted sellers shaping the future of our community.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-6 border border-border/10 animate-pulse space-y-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full rounded-xl" />
              </div>
            ))
          ) : spotlightUsers?.length === 0 ? (
            <div className="col-span-full text-center py-12 opacity-40 italic text-sm">
              Community spotlight is being curated...
            </div>
          ) : (
            spotlightUsers?.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="group relative glass rounded-2xl p-6 border border-border/10 hover:neon-border transition-all duration-500 overflow-hidden"
              >
                {/* Visual Flair */}
                <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-2 border-primary/20 p-1 bg-background shadow-lg overflow-hidden group-hover:border-primary/50 transition-colors">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <div className="w-full h-full rounded-full bg-primary/5 flex items-center justify-center">
                            <User className="w-8 h-8 text-primary/40" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-background border border-border/10 flex items-center justify-center shadow-lg">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground text-lg group-hover:text-primary transition-colors">
                        {user.username || "Featured Member"}
                      </h3>
                      <div className="flex gap-1.5 mt-1">
                        {user.isAuthor && (
                          <Badge variant="outline" className="text-[7px] h-4 px-1.5 font-black uppercase border-accent/20 bg-accent/5 text-accent">
                            <Newspaper className="w-2 h-2 mr-1" /> Writer
                          </Badge>
                        )}
                        {user.isSeller && (
                          <Badge variant="outline" className="text-[7px] h-4 px-1.5 font-black uppercase border-secondary/20 bg-secondary/5 text-secondary">
                            <ShoppingBag className="w-2 h-2 mr-1" /> Seller
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <FavoriteUserButton userId={user.id} username={user.username || ""} variant="full" />
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 italic opacity-70 leading-relaxed mb-4">
                  {user.bio || "This featured community member hasn't set a bio yet, but their work speaks for itself."}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-border/5">
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-5 h-5 rounded-full border border-background bg-muted/20" />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-bold ml-1">Joined the loop</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40">Verified</span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default Spotlight;
