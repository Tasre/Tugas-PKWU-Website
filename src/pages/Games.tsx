import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gamepad2, ArrowLeft, Package, User as UserIcon } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GamesFiltersBar from "@/components/games/GamesFiltersBar";
import GamesListingGrid from "@/components/games/GamesListingGrid";
import ListingDetailDialog from "@/components/marketplace/ListingDetailDialog";
import { useGamesListings, usePopularGames, useAlphabeticalGames, useUserListings, type GamesFilters } from "@/hooks/use-games";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const Games = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<"community" | "my-listings">("community");
  const [filters, setFilters] = useState<GamesFilters>(() => {
    const category = searchParams.get("category") || undefined;
    const game = searchParams.get("game") || undefined;
    return { game, category };
  });
  
  const { data: listings, isLoading } = useGamesListings(filters.game || filters.category ? filters : {});
  const { data: myListings, isLoading: myLoading } = useUserListings();
  const { data: popularGames, isLoading: popularLoading } = usePopularGames();
  const { data: alphabeticalGames, isLoading: alphaLoading } = useAlphabeticalGames();
  const [selectedListing, setSelectedListing] = useState<any>(null);

  // Sync filters with search params on initial load or browser navigation
  useEffect(() => {
    const game = searchParams.get("game") || undefined;
    const category = searchParams.get("category") || undefined;
    if (game !== filters.game || category !== filters.category) {
      setFilters({ game, category });
    }
  }, [searchParams]);

  // Handle specific listing selection and scrolling
  useEffect(() => {
    const listingId = searchParams.get("listingId");
    if (listingId && listings && listings.length > 0) {
      const listing = listings.find(l => l.id === listingId);
      if (listing) {
        setSelectedListing(listing);
        setTimeout(() => {
          const element = document.getElementById(`listing-${listingId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 500);
      }
    }
  }, [listings, searchParams]);

  const gameSelected = !!filters.game;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <section className="pt-28 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (viewMode === "my-listings") setViewMode("community");
                    else navigate("/");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground leading-tight">
                  {viewMode === "community" ? "Browse" : "My"} <span className="text-gradient">{viewMode === "community" ? "Games" : "Listings"}</span>
                </h1>
              </div>
              <p className="text-muted-foreground ml-11 text-sm">
                {viewMode === "community" 
                  ? "Select a community to start browsing verified listings"
                  : "Manage your active, hidden, and flagged community listings"
                }
              </p>
            </motion.div>

            {user && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Button 
                  variant="outline"
                  className={cn(
                    "font-display h-12 px-8 rounded-xl border-primary/20 transition-all",
                    viewMode === "my-listings" ? "bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                  onClick={() => setViewMode(viewMode === "community" ? "my-listings" : "community")}
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  {viewMode === "community" ? "My Listings" : "Community Marketplace"}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Game Selection or Filters + Content */}
      <section className="pb-24">
        <div className="container mx-auto px-4">
          {viewMode === "my-listings" ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {myLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-64 rounded-xl" />
                  ))}
                </div>
              ) : myListings && myListings.length > 0 ? (
                <GamesListingGrid
                  listings={myListings}
                  isLoading={false}
                  onListingClick={(listing) => setSelectedListing(listing)}
                  isOwnerView={true}
                />
              ) : (
                <div className="glass rounded-xl p-20 text-center border border-border/10">
                  <Package className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                  <h3 className="font-display text-xl font-bold text-foreground/40">No listings yet</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
                    Start selling your in-game items and services today!
                  </p>
                  <Button 
                    className="mt-8 glow-cyan font-display h-12 px-8 rounded-xl"
                    onClick={() => navigate("/dashboard?tab=listings")}
                  >
                    Create Your First Listing
                  </Button>
                </div>
              )}
            </motion.div>
          ) : !gameSelected ? (
            <div className="space-y-16">
              {/* 1. Trending Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="mb-8 text-center">
                  <h2 className="font-display text-2xl font-bold text-foreground">Trending</h2>
                </div>
                
                {popularLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
                    {popularGames?.map((game: any, index: number) => (
                      <GameCard 
                        key={game.name} 
                        game={game} 
                        index={index} 
                        onClick={() => setFilters({ ...filters, game: game.name })}
                      />
                    ))}
                  </div>
                )}
              </motion.div>

              {/* 2. All Games (Alphabetical) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="mb-8 text-center pt-8 border-t border-border/30">
                  <h2 className="font-display text-2xl font-bold text-foreground">All Games</h2>
                </div>

                {alphaLoading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl mx-auto">
                    {alphabeticalGames?.map((game: any, index: number) => (
                      <GameCard 
                        key={game.name} 
                        game={game} 
                        index={index} 
                        onClick={() => setFilters({ ...filters, game: game.name })}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          ) : (
            /* Filters + Listings */
            <div className="flex flex-col lg:flex-row gap-6">
              <aside className="w-full lg:w-72 shrink-0">
                <GamesFiltersBar filters={filters} onFiltersChange={setFilters} />
              </aside>

              <main className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? "Loading..." : `${listings?.length || 0} listings found`}
                  </p>
                </div>

                <GamesListingGrid
                  listings={listings || []}
                  isLoading={isLoading}
                  onListingClick={(listing) => setSelectedListing(listing)}
                />
              </main>
            </div>
          )}
        </div>
      </section>

      <Footer />

      <ListingDetailDialog
        listing={selectedListing}
        open={!!selectedListing}
        onOpenChange={(open) => !open && setSelectedListing(null)}
      />
    </div>
  );
};

const GameCard = ({ game, index, onClick }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: Math.min(index * 0.03, 0.4) }}
    whileHover={{ y: -5 }}
    onClick={onClick}
    className="group rounded-xl glass text-center hover:neon-border transition-all duration-300 cursor-pointer flex flex-col items-center relative overflow-hidden"
  >
    {/* Image Container - Fit Horizontally */}
    <div className="w-full aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
      {game.image_url ? (
        <img 
          src={game.image_url} 
          alt={game.name} 
          className="w-full h-full object-cover transition-transform duration-500" 
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Gamepad2 className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      )}
    </div>
    
    <div className="p-4 w-full">
      <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
        {game.name}
      </h3>
      {game.sales > 0 && (
        <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold opacity-60">
          {game.sales.toLocaleString()} Sales
        </p>
      )}
    </div>
  </motion.div>
);

export default Games;
