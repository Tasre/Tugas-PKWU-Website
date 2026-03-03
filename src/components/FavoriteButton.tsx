import { Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FavoriteButtonProps {
  listingId: string;
  className?: string;
}

const FavoriteButton = ({ listingId, className }: FavoriteButtonProps) => {
  const { user } = useAuth();
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const navigate = useNavigate();
  const [justFavorited, setJustFavorited] = useState(false);

  const isFavorited = favorites?.has(listingId) ?? false;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isFavorited) {
      setJustFavorited(true);
      setTimeout(() => setJustFavorited(false), 600);
    }
    toggleFavorite.mutate({ listingId, isFavorited });
  };

  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={handleClick}
      className={cn(
        "p-1.5 rounded-full backdrop-blur-sm transition-all duration-200 relative",
        isFavorited
          ? "bg-primary/20 text-primary"
          : "bg-background/60 text-muted-foreground hover:text-primary hover:bg-primary/10",
        className
      )}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={cn(
          "w-4 h-4 transition-all",
          isFavorited && "fill-primary drop-shadow-[0_0_6px_hsl(var(--primary))]"
        )}
      />
      {/* Pulse ring animation on favorite */}
      <AnimatePresence>
        {justFavorited && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border-2 border-primary pointer-events-none"
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
};

export default FavoriteButton;
