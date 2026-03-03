import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, TrendingUp, Gamepad2, ArrowLeft, Plus, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PostCard from "@/components/news/PostCard";
import NewsSearchBar from "@/components/news/NewsSearchBar";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import {
  useTopTargetedPosts,
  useTopGamesPosts,
  useAllPostsFeed,
  useUserPosts,
} from "@/hooks/use-news";

const News = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [viewMode, setViewMode] = useState<"community" | "my-posts">("community");

  // PERFORMANCE: Proper time-based debounce (500ms) to prevent query flooding
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data: topPosts, isLoading: topLoading } = useTopTargetedPosts(debouncedSearch, gameFilter);
  const { data: gamesPosts, isLoading: gamesLoading } = useTopGamesPosts(debouncedSearch, gameFilter);
  const { data: myPosts, isLoading: myLoading } = useUserPosts();
  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: feedLoading,
  } = useAllPostsFeed(debouncedSearch, gameFilter);

  // PERFORMANCE: Memoize the flattened feed to prevent array-map overhead
  const allFeedPosts = useMemo(() => feedData?.pages.flat() || [], [feedData]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 pt-28 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (viewMode === "my-posts") setViewMode("community");
                  else navigate("/");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                {viewMode === "community" ? "Gaming" : "My"} <span className="text-gradient">{viewMode === "community" ? "News" : "Posts"}</span>
              </h1>
            </div>
            <p className="text-muted-foreground ml-11 text-sm">
              {viewMode === "community" 
                ? "Stay updated with the latest game content from the community"
                : "Manage your published, hidden, and flagged community content"
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <>
                <Button 
                  variant="outline"
                  className={cn(
                    "font-display h-11 px-6 rounded-xl border-primary/20 transition-all",
                    viewMode === "my-posts" ? "bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                  )}
                  onClick={() => setViewMode(viewMode === "community" ? "my-posts" : "community")}
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  {viewMode === "community" ? "My Posts" : "Community Feed"}
                </Button>
                <Button 
                  className="glow-cyan font-display group h-11 px-6 rounded-xl"
                  onClick={() => window.open("/write", "_blank")}
                >
                  <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                  Write Post
                </Button>
              </>
            )}
          </div>
        </div>

        {viewMode === "community" ? (
          <>
            {/* Search & Filter Bar */}
            <NewsSearchBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              gameFilter={gameFilter}
              onGameFilterChange={setGameFilter}
            />

            {/* Section 1: Top Picks */}
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Top Picks <span className="text-gradient">For You</span>
                </h2>
              </div>
              {topLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="glass rounded-xl h-48 animate-pulse" />
                  ))}
                </div>
              ) : topPosts && topPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {topPosts.map((post: any) => (
                    <PostCard key={post.id} post={post} compact />
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl p-8 text-center border border-border/5">
                  <p className="text-muted-foreground text-xs opacity-60 italic">
                    {debouncedSearch || gameFilter ? "No matches found." : "Personalized content will appear here..."}
                  </p>
                </div>
              )}
            </section>

            {/* Section 2: Top Games Feed */}
            <section className="mb-12">
              <div className="flex items-center gap-2 mb-5">
                <Gamepad2 className="w-4 h-4 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Top Games <span className="text-gradient">Feed</span>
                </h2>
              </div>
              {gamesLoading ? (
                <div className="space-y-8">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="glass rounded-xl h-32 animate-pulse" />
                  ))}
                </div>
              ) : gamesPosts && gamesPosts.length > 0 ? (
                <div className="space-y-8">
                  {gamesPosts.map((gp: any) => (
                    <div key={gp.game}>
                      <h3 className="font-display text-xs font-black uppercase tracking-widest text-foreground/40 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        {gp.game}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {gp.posts.map((post: any) => (
                          <PostCard key={post.id} post={post} compact />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl p-8 text-center border border-border/5">
                  <p className="text-muted-foreground text-xs opacity-60 italic">No game-specific posts yet...</p>
                </div>
              )}
            </section>

            {/* Section 3: Latest Posts */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <Newspaper className="w-4 h-4 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Latest <span className="text-gradient">Posts</span>
                </h2>
              </div>
              {feedLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="glass rounded-xl h-40 animate-pulse" />
                  ))}
                </div>
              ) : allFeedPosts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {allFeedPosts.map((post: any) => (
                    <PostCard key={post.id} post={post} interactive={false} />
                  ))}
                </div>
              ) : (
                <div className="glass rounded-xl p-12 text-center border border-border/5">
                  <p className="text-muted-foreground text-sm italic">
                    {debouncedSearch || gameFilter ? "No results for your current filters." : "Be the first to share something!"}
                  </p>
                </div>
              )}
              
              {hasNextPage && (
                <div className="flex justify-center pt-8">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="font-display border-primary/20 text-primary hover:bg-primary/5 h-12 px-10 rounded-xl font-black uppercase tracking-widest text-[10px]"
                  >
                    {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : "Load More Activity"}
                  </Button>
                </div>
              )}
            </section>
          </>
        ) : (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {myLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="glass rounded-xl h-40 animate-pulse" />
                ))}
              </div>
            ) : myPosts && myPosts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {myPosts.map((post: any) => (
                  <PostCard key={post.id} post={post} isOwnerView={true} />
                ))}
              </div>
            ) : (
              <div className="glass rounded-xl p-20 text-center border border-border/10">
                <Newspaper className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
                <h3 className="font-display text-xl font-bold text-foreground/40">No posts yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-2">
                  Share your first game guide, news, or update with the community!
                </p>
                <Button 
                  className="mt-8 glow-cyan font-display"
                  onClick={() => navigate("/write")}
                >
                  Create Your First Post
                </Button>
              </div>
            )}
          </motion.section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default News;

const Loader2 = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
  </svg>
);
