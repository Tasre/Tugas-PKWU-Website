import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { usePopularGames } from "@/hooks/use-games";

const ITEMS_PER_PAGE = 4;

const PopularGames = () => {
  const { t } = useLanguage();
  const { data: games, isLoading } = usePopularGames();
  const [page, setPage] = useState(0);
  const navigate = useNavigate();

  const totalPages = games ? Math.ceil(games.length / ITEMS_PER_PAGE) : 0;
  const currentGames = games?.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE) || [];

  const handleNext = () => {
    if (page >= totalPages - 1) {
      window.scrollTo({ top: 0, behavior: "instant" });
      navigate("/games");
    } else {
      setPage((p) => p + 1);
    }
  };

  const handlePrev = () => {
    setPage((p) => Math.max(0, p - 1));
  };

  if (!isLoading && (!games || games.length === 0)) return null;

  return (
    <section className="py-24 relative" id="games">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-12"
        >
          <div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Trending <span className="text-gradient">Games</span>
            </h2>
            <p className="text-muted-foreground">Most played and most traded titles in our community right now.</p>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                disabled={page === 0}
                className="text-muted-foreground hover:text-primary"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                className="text-muted-foreground hover:text-primary"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          )}
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl glass aspect-[3/4] animate-pulse bg-muted/30" />
            ))}
          </div>
        ) : currentGames.length === 0 ? (
          null
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {currentGames.map((game, index) => (
              <motion.div
                key={game.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -8 }}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "instant" });
                  navigate(`/games?game=${encodeURIComponent(game.name)}`);
                }}
                className="group relative rounded-xl overflow-hidden glass block cursor-pointer"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                  {game.image_url ? (
                    <img 
                      src={game.image_url} 
                      alt={game.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="font-display text-4xl font-bold text-foreground/20">{game.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  
                  <div className="absolute top-3 right-3 px-2 py-1 bg-primary/90 rounded text-xs font-bold text-primary-foreground">
                    {game.sales?.toLocaleString()} Trades
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-display font-bold text-lg text-foreground mb-3">{game.name}</h3>
                  <div className="flex flex-wrap gap-1">
                    {game.tags?.slice(0, 4).map((tag: string) => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.scrollTo({ top: 0, behavior: "instant" });
                          navigate(`/games?game=${encodeURIComponent(game.name)}&category=${encodeURIComponent(tag)}`);
                        }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default PopularGames;
