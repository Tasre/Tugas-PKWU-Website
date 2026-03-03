import { useParams, useNavigate } from "react-router-dom";
import { usePost, useRelatedPosts } from "@/hooks/use-news";
import { useGameInfo } from "@/hooks/use-games";
import { format } from "date-fns";
import { 
  Share2, ArrowLeft, Gamepad2, ListTree, ChevronRight, 
  ChevronDown, ExternalLink, Clock, User, Loader2,
  ThumbsUp, ThumbsDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useToggleLike, useToggleDislike, useUserLikedPosts, useUserDislikedPosts } from "@/hooks/use-news";
import FavoriteUserButton from "@/components/FavoriteUserButton";

const PostDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: post, isLoading: postLoading } = usePost(id || "");
  const { data: gameInfo } = useGameInfo(post?.game || "");
  const { data: relatedPosts } = useRelatedPosts(post?.game || "", id);
  const toggleLike = useToggleLike();
  const toggleDislike = useToggleDislike();
  const { data: likedPosts } = useUserLikedPosts();
  const { data: dislikedPosts } = useUserDislikedPosts();
  const [toc, setToc] = useState<any[]>([]);

  const isLiked = likedPosts?.has(id || "") || false;
  const isDisliked = dislikedPosts?.has(id || "") || false;

  useEffect(() => {
    if (post?.toc) {
      setToc(post.toc);
    }
  }, [post?.toc]);

  const isVisible = (idx: number) => {
    for (let i = 0; i < idx; i++) {
      if (toc[i].collapsed) {
        let j = i + 1;
        while (j < toc.length && toc[j].level > toc[i].level) {
          if (j === idx) return false;
          j++;
        }
      }
    }
    return true;
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('glow-cyan');
      setTimeout(() => el.classList.remove('glow-cyan'), 2000);
    }
  };

  const handleShare = () => {
    const url = window.location.origin + window.location.pathname;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  if (postLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center font-display uppercase tracking-widest text-[10px] font-black gap-3 opacity-40">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading Story...
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 text-center px-4">
        <div className="w-20 h-20 rounded-2xl bg-muted/10 flex items-center justify-center mb-2">
          <Gamepad2 className="w-8 h-8 text-muted-foreground opacity-20" />
        </div>
        <h1 className="text-2xl font-black uppercase tracking-tight">Story Not Found</h1>
        <Button onClick={() => navigate("/news")} className="bg-primary glow-cyan h-12 px-8 rounded-xl font-black uppercase tracking-widest text-xs">Back to News</Button>
      </div>
    );
  }

  const getFormattedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return "Date unknown";
      const tzOffset = format(date, 'xxx');
      return format(date, "d MMMM yyyy, HH:mm") + ` GMT${tzOffset.startsWith('+') || tzOffset.startsWith('-') ? tzOffset : '+' + tzOffset}`;
    } catch {
      return "Date unknown";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans selection:bg-primary/30">
      <Navbar />
      
      <style>{`
        .post-content a { color: hsl(var(--primary)); text-decoration: underline; font-weight: bold; cursor: pointer !important; }
        .post-content [data-media-id], .post-content .group.relative { 
          background: transparent !important; border: none !important; padding: 0 !important; margin: 3rem 0 !important; box-shadow: none !important;
        }
        .post-content img, .post-content video { 
          border-radius: 1.5rem; width: 100%; display: block; margin: 0 !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); border: 1px solid rgba(255,255,255,0.1); 
        }
        .post-content h1 { font-size: 3rem; font-weight: 800; margin-bottom: 2rem; line-height: 1.1; }
        .post-content h2 { font-size: 2.25rem; font-weight: 700; margin-top: 4rem; margin-bottom: 1.5rem; line-height: 1.2; }
        .post-content h3 { font-size: 1.875rem; font-weight: 700; margin-top: 3rem; margin-bottom: 1rem; }
        .post-content p { font-size: 1.25rem; line-height: 1.85; margin-bottom: 1.5rem; color: rgba(255,255,255,0.9); }
        .post-content button, .post-content .absolute.inset-0, .post-content [contenteditable="false"] svg { display: none !important; visibility: hidden !important; pointer-events: none !important; }
        .post-content .glow-cyan { border-radius: 1rem; transition: all 0.5s; box-shadow: 0 0 30px rgba(var(--primary-rgb), 0.3); background: rgba(var(--primary-rgb), 0.05); }
      `}</style>

      <div className="flex flex-1 pt-24 pb-16 px-4 md:px-8 gap-8 max-w-[1600px] mx-auto w-full">
        {/* LEFT SIDEBAR: Outline */}
        <aside className="w-72 hidden xl:block sticky top-24 self-start max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
          <div className="glass border-border/20 rounded-2xl p-8 space-y-6 shadow-2xl">
            <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
              <ListTree className="w-3 h-3 text-primary" /> Outline
            </h3>
            <div className="space-y-2">
              {toc.length === 0 ? (
                <p className="text-[10px] italic opacity-30">No sections defined...</p>
              ) : (
                toc.map((item, idx) => {
                  if (!isVisible(idx)) return null;
                  const hasChildren = idx + 1 < toc.length && toc[idx+1].level > item.level;
                  return (
                    <div key={idx} className="group flex flex-col">
                      <div className="flex items-center gap-2">
                        {hasChildren ? (
                          <button onClick={() => { const newToc = [...toc]; newToc[idx].collapsed = !newToc[idx].collapsed; setToc(newToc); }} className="p-1 hover:bg-primary/10 rounded-md transition-colors">
                            {item.collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        ) : ( <div className="w-5" /> )}
                        <button onClick={() => scrollToSection(item.id)} className={cn("flex-1 text-left font-bold transition-all hover:text-primary truncate relative py-1", item.level === 1 ? "text-xs" : item.level === 2 ? "text-[11px] opacity-80" : "text-[10px] pl-4 opacity-60")}>
                          {item.text}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* CENTRAL CONTENT: The Paper */}
        <main className="flex-1 max-w-[850px] mx-auto w-full">
          <div className="bg-card/60 border border-border/50 shadow-2xl rounded-2xl p-8 md:p-16 relative overflow-hidden transition-all backdrop-blur-sm">
            <h1 className="text-4xl md:text-6xl font-black text-foreground mb-8 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center justify-between mb-12 py-6 border-y border-border/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shadow-inner">
                  {post.profiles?.avatar_url ? (
                    <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-lg block leading-none">
                      {post.profiles?.username || "Anonymous Writer"}
                    </span>
                    <FavoriteUserButton userId={post.author_id} username={post.profiles?.username || "Staff"} />
                  </div>
                  <div className="text-muted-foreground text-[10px] tracking-widest font-black opacity-60 mt-1">
                    {getFormattedDate(post.created_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div 
              className="post-content min-h-[300px] text-xl font-serif text-foreground/90 selection:bg-primary/20"
              dangerouslySetInnerHTML={{ __html: post.content || "" }}
            />

            {/* BOTTOM SOCIAL HUB: Interactions & Sharing */}
            <div className="mt-16 pt-8 border-t border-border/10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-background/40 rounded-2xl p-1 border border-border/10 shadow-lg">
                  <Button
                    variant="ghost"
                    className={cn(
                      "h-14 px-6 rounded-xl text-lg gap-3 font-black transition-all",
                      isLiked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
                    )}
                    onClick={() => {
                      if (user) toggleLike.mutate({ postId: post.id, liked: isLiked });
                      else toast.error("Please login to like posts");
                    }}
                    disabled={toggleLike.isPending}
                  >
                    <ThumbsUp className={cn("w-6 h-6", isLiked && "fill-current")} />
                    {post.likes_count || 0}
                  </Button>
                  
                  <div className="w-[1px] h-8 bg-border/10 mx-2" />

                  <Button
                    variant="ghost"
                    className={cn(
                      "h-14 px-6 rounded-xl text-lg gap-3 font-black transition-all",
                      isDisliked ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                    )}
                    onClick={() => {
                      if (user) toggleDislike.mutate({ postId: post.id, disliked: isDisliked });
                      else toast.error("Please login to dislike posts");
                    }}
                    disabled={toggleDislike.isPending}
                  >
                    <ThumbsDown className={cn("w-6 h-6", isDisliked && "fill-current")} />
                    {post.dislikes_count || 0}
                  </Button>
                </div>
              </div>

              <Button 
                variant="ghost" 
                className="h-14 px-8 rounded-2xl border border-border/20 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all group gap-3 font-black uppercase tracking-widest text-[10px]"
                onClick={handleShare}
              >
                <Share2 className="w-5 h-5 transition-transform group-hover:scale-110" />
                Share
              </Button>
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="w-80 hidden lg:block sticky top-24 self-start space-y-8 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
          <div className="glass border-border/20 rounded-2xl p-6 shadow-2xl overflow-hidden">
            <div className="aspect-video rounded-xl overflow-hidden border border-border/30 mb-4 bg-black/40">
              {gameInfo?.image_url ? (
                <img src={gameInfo.image_url} className="w-full h-full object-cover pointer-events-none" alt={post.game} />
              ) : (
                <div className="w-full h-full flex items-center justify-center opacity-20"><Gamepad2 className="w-8 h-8" /></div>
              )}
            </div>
            <h4 className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Related Game</h4>
            <h2 className="text-xl font-black mb-4 pointer-events-none">{post.game}</h2>
            <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] glow-cyan transition-all pointer-events-auto" onClick={() => navigate(`/games?game=${encodeURIComponent(post.game)}`)}>
              View Listings <ExternalLink className="ml-2 w-3 h-3" />
            </Button>
          </div>

          <div className="glass border-border/20 rounded-2xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-40 flex items-center gap-2">
                <Clock className="w-3 h-3 text-primary" /> Latest In {post.game}
              </h3>
              <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-primary hover:bg-primary/10" onClick={() => navigate(`/news?game=${encodeURIComponent(post.game)}`)}>
                See More
              </Button>
            </div>
            
            <div className="space-y-4">
              {relatedPosts?.length === 0 ? (
                <p className="text-xs text-muted-foreground italic opacity-40 text-center py-4">No other stories yet...</p>
              ) : (
                relatedPosts?.map((p: any) => (
                  <button key={p.id} onClick={() => { navigate(`/news/${p.id}`); window.scrollTo(0, 0); }} className="flex items-center gap-3 text-left group w-full p-2 hover:bg-primary/5 rounded-xl transition-all">
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border/30 bg-black/20 shadow-inner">
                      {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><ImageIcon className="w-4 h-4" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">{p.title}</h4>
                      <p className="text-[8px] text-muted-foreground mt-1 uppercase tracking-widest font-black opacity-40">{new Date(p.created_at).toLocaleDateString()}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>
      </div>
      
      <Footer />
    </div>
  );
};

export default PostDetail;
