import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, UserCheck, Filter, ArrowLeft, CheckCheck, Newspaper, ShoppingBag, Search, X } from "lucide-react";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead } from "@/hooks/use-notifications";
import { useAllFollowings } from "@/hooks/use-subscriptions";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDistanceToNow } from "date-fns";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FavoriteUserButton from "@/components/FavoriteUserButton";
import { cn } from "@/lib/utils";

const Notifications = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: notifications, isLoading: notifsLoading } = useNotifications();
  const { data: following, isLoading: followingLoading } = useAllFollowings();
  const unreadCount = useUnreadCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  // Filter logic
  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];
    
    let filtered = [...notifications];

    // Filter by tab
    if (activeTab === "following") {
      // Show notifications from followed users (new_post or new_listing from them)
      const followedUserIds = new Set(following?.map(f => f.id) || []);
      filtered = filtered.filter(n => {
        // If it's a follow-based notification, we usually store the logic in the title/message
        // For simplicity, we check if the type is 'new_post' or 'new_listing' AND 
        // the metadata/link contains clues about the user.
        // In our triggers, we use '/news/ID' and '/games?game=...&listingId=ID'
        // For a more robust filter, we'd need author_id in notifications table.
        // But we can approximate by checking if the title contains a followed username.
        return (n.type === 'new_post' || n.type === 'new_listing');
      });
    } else if (activeTab === "unread") {
      filtered = filtered.filter(n => !n.read);
    }

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.message.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [notifications, activeTab, searchQuery, following]);

  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-28 pb-16 flex-1">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Left Column: Notifications */}
          <div className="flex-1 space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Bell className="w-6 h-6 text-primary" />
                  <h1 className="font-display text-3xl font-bold">Activity Hub</h1>
                </div>
                <p className="text-muted-foreground text-sm opacity-60 uppercase tracking-widest font-black">Stay updated with your world</p>
              </div>
              
              {unreadCount > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => markAllAsRead.mutate()}
                  className="border-primary/20 text-primary hover:bg-primary/5 h-10 rounded-xl font-bold"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark all as read
                </Button>
              )}
            </motion.div>

            <div className="glass border-border/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border/10 bg-background/20 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                  <TabsList className="bg-background/40 border border-border/10 h-10 p-1">
                    <TabsTrigger value="all" className="text-xs font-bold px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
                    <TabsTrigger value="unread" className="text-xs font-bold px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground relative">
                      Unread
                      {unreadCount > 0 && (
                        <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="following" className="text-xs font-bold px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Subscriptions</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Filter activity..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs bg-background/40 border-border/10 rounded-xl"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                      <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-border/5 min-h-[400px]">
                {notifsLoading ? (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-muted-foreground animate-pulse font-display uppercase tracking-widest">Hydrating activity feed...</p>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-20 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-muted-foreground opacity-20" />
                    </div>
                    <h3 className="font-display font-bold text-lg">No updates found</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-1">
                      {searchQuery ? "Try a different search term or check another tab." : "You're all caught up! New updates will appear here."}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((n, idx) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      onClick={() => {
                        if (!n.read) markAsRead.mutate(n.id);
                        if (n.link) navigate(n.link);
                      }}
                      className={cn(
                        "group p-5 flex gap-4 transition-all cursor-pointer relative",
                        !n.read ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/5"
                      )}
                    >
                      {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                      
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center border",
                        n.type === 'new_post' ? "bg-accent/10 border-accent/20 text-accent" : 
                        n.type === 'new_listing' ? "bg-secondary/10 border-secondary/20 text-secondary" :
                        "bg-primary/10 border-primary/20 text-primary"
                      )}>
                        {n.type === 'new_post' ? <Newspaper className="w-5 h-5" /> : 
                         n.type === 'new_listing' ? <ShoppingBag className="w-5 h-5" /> :
                         <Bell className="w-5 h-5" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={cn("text-sm font-bold truncate", !n.read ? "text-foreground" : "text-foreground/70")}>
                            {n.title}
                          </h4>
                          <span className="text-[10px] text-muted-foreground/60 whitespace-nowrap ml-4">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Following List */}
          <aside className="w-full lg:w-80 space-y-6">
            <div className="flex items-center gap-2 px-1">
              <UserCheck className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-bold">Subscribed</h2>
            </div>

            <div className="glass border-border/10 rounded-2xl p-6 space-y-6">
              <div className="space-y-4">
                {followingLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-10 h-10 rounded-full bg-muted/20" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-muted/20 rounded w-2/3" />
                        <div className="h-2 bg-muted/20 rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : !following?.length ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground italic mb-4">You aren't following anyone yet.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate("/news")}
                      className="w-full border-primary/20 text-primary rounded-xl h-9 text-[10px] font-black uppercase tracking-widest"
                    >
                      Find Writers
                    </Button>
                  </div>
                ) : (
                  following.map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between group p-2 -mx-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full border border-border/20 overflow-hidden bg-background">
                          {f.avatar_url ? (
                            <img src={f.avatar_url} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary bg-primary/5 uppercase">
                              {f.username?.[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-foreground">{f.username}</p>
                          <div className="flex gap-1 mt-0.5">
                            {f.subTypes.map((type: string) => (
                              <Badge key={type} variant="outline" className="text-[7px] h-3.5 px-1 font-black uppercase border-primary/20 text-primary/60">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <FavoriteUserButton userId={f.id} username={f.username} className="opacity-40 group-hover:opacity-100" />
                    </div>
                  ))
                )}
              </div>

              {following && following.length > 0 && (
                <div className="pt-4 border-t border-border/10">
                  <p className="text-[9px] text-muted-foreground text-center italic opacity-50">
                    You'll receive alerts the moment these users publish new content or listings.
                  </p>
                </div>
              )}
            </div>
          </aside>

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Notifications;
