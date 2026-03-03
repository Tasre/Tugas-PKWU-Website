import { useState, useMemo, memo } from "react";
import { ThumbsUp, ThumbsDown, UserPlus, UserCheck, MessageSquare, Gamepad2, ShieldAlert, ChevronDown, ChevronUp, GripVertical, Image as ImageIcon, Eye, EyeOff, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToggleLike, useToggleDislike, useFollowing, useUserLikedPosts, useUserDislikedPosts, useUpdatePostStatus, useAuthorPostTakedowns, usePostTakedownMessages, useSendPostTakedownMessage } from "@/hooks/use-news";
import { useIsStaff } from "@/hooks/use-staff";
import { formatDistanceToNow, format } from "date-fns";
import PostComments from "./PostComments";
import StaffPostActions from "./StaffPostActions";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import TakedownChat from "./TakedownChat";
import FavoriteUserButton from "@/components/FavoriteUserButton";

interface PostCardProps {
  post: any;
  compact?: boolean;
  interactive?: boolean;
  isOwnerView?: boolean;
}

// PERFORMANCE: Wrap in memo to prevent unnecessary re-renders in large feeds
const PostCard = memo(({ post, compact = false, interactive = true, isOwnerView = false }: PostCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const toggleLike = useToggleLike();
  const toggleDislike = useToggleDislike();
  const updateStatus = useUpdatePostStatus();
  const { data: following } = useFollowing();
  const { data: likedPosts } = useUserLikedPosts();
  const { data: dislikedPosts = new Set() } = useUserDislikedPosts();
  const { data: allTakedowns } = useAuthorPostTakedowns();
  const { data: isStaff } = useIsStaff();
  
  const [showComments, setShowComments] = useState(false);
  const [showAppeal, setShowAppeal] = useState(false);

  const isFollowing = following?.includes(post.author_id) || false;
  const isLiked = likedPosts?.has(post.id) || false;
  const isDisliked = dislikedPosts?.has(post.id) || false;
  const isOwnPost = user?.id === post.author_id;
  const authorName = post.profiles?.username || "Anonymous";
  
  const isFlagged = post.status === "flagged";
  const isHidden = post.status === "hidden";

  // Find corresponding takedown if flagged
  const takedown = allTakedowns?.find((t: any) => t.post_id === post.id);

  const previewText = useMemo(() => {
    if (!post?.content) return "";
    return post.content
      .replace(/<[^>]*>?/gm, ' ') 
      .replace(/&nbsp;/g, ' ')    
      .replace(/\s+/g, ' ')       
      .trim();
  }, [post?.content]);

  // Format: D MMMM YYYY
  const displayDate = useMemo(() => 
    post.created_at ? format(new Date(post.created_at), "d MMMM yyyy") : 'Recently',
    [post.created_at]
  );

  // FEATURED TILE (Top Picks & Top Games) - VERTICAL CINEMATIC
  if (compact) {
    return (
      <div 
        className="glass rounded-xl overflow-hidden flex flex-col transition-all hover:border-primary/40 group cursor-pointer h-full border border-border/10 shadow-xl relative"
        onClick={() => navigate(`/news/${post.id}`)}
      >
        {/* Status Badges for Featured */}
        {isFlagged && <Badge variant="destructive" className="absolute top-2 right-2 text-[6px] h-3 px-1 rounded uppercase font-black z-10">Flagged</Badge>}
        {isHidden && <Badge variant="secondary" className="absolute top-2 right-2 text-[6px] h-3 px-1 rounded uppercase font-black z-10">Hidden</Badge>}

        <div className="aspect-[16/10] w-full overflow-hidden border-b border-border/10 bg-black/40 relative">
          {post.image_url ? (
            <img 
              src={post.image_url} 
              alt={post.title} 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-20">
              <ImageIcon className="w-8 h-8" />
              <span className="text-[8px] font-black uppercase tracking-widest">{post.game}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>

        <div className="pt-5 px-5 pb-3 h-[100px] flex flex-col bg-background/20 backdrop-blur-md">
          <h3 className="font-display font-black text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {post.title}
          </h3>
          <div className="mt-auto flex items-center justify-between">
            <span className="text-foreground/60 text-[9px] font-bold tracking-widest">
              {displayDate}
            </span>
            <div 
              className="flex items-center gap-2" 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <FavoriteUserButton userId={post.author_id} username={authorName} />
              {isStaff && !isFlagged && (
                <StaffPostActions postId={post.id} authorId={post.author_id} authorName={authorName} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LATEST POSTS - HORIZONTAL PRECISE 40:60 RATIO
  return (
    <>
      <div 
        className={cn(
          "glass rounded-xl overflow-hidden transition-all hover:border-primary/30 group cursor-pointer border border-border/5 flex h-[180px] relative",
          (isFlagged || isHidden) ? "opacity-60 border-destructive/30" : ""
        )}
        onClick={() => navigate(`/news/${post.id}`)}
      >
        {/* Status Badges for Latest */}
        {isFlagged && <Badge variant="destructive" className="absolute top-2 right-2 text-[6px] h-3 px-1 rounded uppercase font-black z-10">Flagged</Badge>}
        {isHidden && <Badge variant="secondary" className="absolute top-2 right-2 text-[6px] h-3 px-1 rounded uppercase font-black z-10">Hidden</Badge>}

        {/* LEFT: 40% VISUAL ANCHOR */}
        <div className="w-[40%] flex-shrink-0 overflow-hidden border-r border-border/10 bg-black/40 relative">
          {post.image_url ? (
            <img src={post.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 opacity-10">
              <ImageIcon className="w-6 h-6" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        </div>

        {/* RIGHT: 60% EDITORIAL CONTENT */}
        <div className="w-[60%] pt-4 px-4 pb-2 flex flex-col min-w-0 bg-background/10 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-display text-[9px] font-black overflow-hidden shadow-inner">
                {post.profiles?.avatar_url ? (
                  <img src={post.profiles.avatar_url} className="w-full h-full object-cover" />
                ) : authorName[0]?.toUpperCase()}
              </div>
              <span className="text-[11px] font-bold text-foreground/70 truncate max-w-[110px]">{authorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[7px] border-primary/20 bg-primary/5 text-primary font-black uppercase px-2 py-0 h-4">
                {post.game}
              </Badge>
            </div>
          </div>

          <h3 className="font-display font-black text-[13px] text-foreground mb-1 leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>

          <p className="text-[11px] text-muted-foreground leading-snug font-serif line-clamp-2 opacity-60 mb-1">
            {previewText}
          </p>

          <div className="mt-auto flex items-center justify-between translate-y-2 pb-1">
            <div className="text-[8px] text-foreground/60 font-bold tracking-widest">
              {displayDate}
            </div>
            <div 
              className="flex items-center gap-2" 
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <FavoriteUserButton userId={post.author_id} username={authorName} />
              {isOwnerView && (
                <>
                  {!isFlagged && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-primary"
                      onClick={() => {
                        updateStatus.mutate({ postId: post.id, status: isHidden ? 'public' : 'hidden' });
                      }}
                      title={isHidden ? "Make Public" : "Hide Post"}
                    >
                      {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </Button>
                  )}
                  {isFlagged && takedown && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[8px] font-black uppercase tracking-widest text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setShowAppeal(true);
                      }}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" /> Appeal
                    </Button>
                  )}
                </>
              )}
              {isStaff && !isFlagged && (
                <StaffPostActions postId={post.id} authorId={post.author_id} authorName={authorName} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* APPEAL CHAT POP-UP (Dialog) */}
      <Dialog open={showAppeal} onOpenChange={setShowAppeal}>
        <DialogContent className="glass border-border sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Appeal Post Flag
            </DialogTitle>
            <DialogDescription className="text-xs">
              Disputing flag for: <span className="text-foreground font-bold">{post.title}</span>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
              <p className="text-[10px] text-destructive uppercase tracking-widest font-black mb-1 opacity-60 flex items-center gap-2">
                <AlertTriangle className="w-3 h-3" /> Flag Reason
              </p>
              <p className="text-xs text-foreground leading-relaxed italic">
                "{takedown?.reason || "Under review by staff team"}"
              </p>
            </div>

            <div className="border-t border-border/10 pt-4">
              <TakedownChat 
                takedownId={takedown?.id || ""} 
                useMessagesHook={usePostTakedownMessages}
                useSendMessageHook={useSendPostTakedownMessage}
                isClosed={takedown?.status === 'confirmed'}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

PostCard.displayName = "PostCard";

export default PostCard;
