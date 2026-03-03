import { useState } from "react";
import { Star, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePostComments, useCreateComment } from "@/hooks/use-news";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface PostCommentsProps {
  postId: string;
}

const PostComments = ({ postId }: PostCommentsProps) => {
  const { user } = useAuth();
  const { data: comments, isLoading } = usePostComments(postId);
  const createComment = useCreateComment();
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Please write a comment");
      return;
    }
    createComment.mutate(
      { postId, content, rating: rating > 0 ? rating : undefined },
      {
        onSuccess: () => {
          setContent("");
          setRating(0);
        },
        onError: () => toast.error("Failed to post comment"),
      }
    );
  };

  const avgRating = comments?.length
    ? (comments.filter((c: any) => c.rating).reduce((sum: number, c: any) => sum + (c.rating || 0), 0) /
        comments.filter((c: any) => c.rating).length) || 0
    : 0;

  const ratingsCount = comments?.filter((c: any) => c.rating).length || 0;

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      {/* Rating summary */}
      {ratingsCount > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`w-3 h-3 ${s <= Math.round(avgRating) ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {avgRating.toFixed(1)} ({ratingsCount} {ratingsCount === 1 ? "rating" : "ratings"})
          </span>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="text-xs text-muted-foreground py-2">Loading comments...</div>
      ) : comments && comments.length > 0 ? (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {comments.map((c: any) => (
            <div key={c.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-display font-bold shrink-0">
                {(c.profiles?.username || "A")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">{c.profiles?.username || "Anonymous"}</span>
                  {c.rating && (
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-2.5 h-2.5 ${s <= c.rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground/60 mb-3">No comments yet</p>
      )}

      {/* Comment input */}
      {user && (
        <div className="space-y-2">
          {/* Star rating selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground mr-1">Rate:</span>
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s === rating ? 0 : s)}
                className="p-0"
              >
                <Star
                  className={`w-3.5 h-3.5 cursor-pointer transition-colors ${
                    s <= (hoverRating || rating) ? "fill-primary text-primary" : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <button
                onClick={() => setRating(0)}
                className="text-[10px] text-muted-foreground ml-1 hover:text-foreground"
              >
                clear
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Write a comment..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="h-8 text-xs glass border-border"
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createComment.isPending || !content.trim()}
              className="h-8 px-3"
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostComments;
