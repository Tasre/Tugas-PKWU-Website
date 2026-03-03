import { useState } from "react";
import { UserPlus, UserCheck, Newspaper, ShoppingBag, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserSubscriptions, useToggleSubscription, SubscriptionType } from "@/hooks/use-subscriptions";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface FavoriteUserButtonProps {
  userId: string;
  username: string;
  variant?: "icon" | "full";
  className?: string;
}

const FavoriteUserButton = ({ userId, username, variant = "icon", className }: FavoriteUserButtonProps) => {
  const { user } = useAuth();
  const { data: subs } = useUserSubscriptions(userId);
  const toggleSub = useToggleSubscription();

  const isSubscribedToPosts = subs?.includes('posts') ?? false;
  const isSubscribedToListings = subs?.includes('listings') ?? false;
  const isAnySubscribed = isSubscribedToPosts || isSubscribedToListings;

  const handleToggle = (type: SubscriptionType, currentStatus: boolean) => {
    if (!user) return;
    toggleSub.mutate({ followingId: userId, subType: type, isSubscribed: currentStatus });
  };

  if (!user || user.id === userId) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full transition-all duration-300",
              isAnySubscribed ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary",
              className
            )}
          >
            {isAnySubscribed ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          </Button>
        ) : (
          <Button
            variant="outline"
            className={cn(
              "h-9 px-4 rounded-xl border-primary/20 font-display text-xs font-bold uppercase tracking-wider transition-all",
              isAnySubscribed ? "bg-primary text-primary-foreground border-primary glow-cyan" : "text-muted-foreground hover:text-primary hover:bg-primary/5",
              className
            )}
          >
            {isAnySubscribed ? (
              <><UserCheck className="w-3.5 h-3.5 mr-2" /> Following</>
            ) : (
              <><UserPlus className="w-3.5 h-3.5 mr-2" /> Follow</>
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass border-border/20 w-56 p-1">
        <div className="px-3 py-2 border-b border-border/10 mb-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Follow {username}</p>
        </div>
        
        <DropdownMenuItem 
          onClick={() => handleToggle('posts', isSubscribedToPosts)}
          className="flex items-center justify-between cursor-pointer py-2.5 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-colors", isSubscribedToPosts ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted-foreground")}>
              <Newspaper className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold">New Posts</span>
              <span className="text-[9px] opacity-50">Notifications for updates</span>
            </div>
          </div>
          {isSubscribedToPosts ? <Bell className="w-3.5 h-3.5 text-primary fill-primary" /> : <BellOff className="w-3.5 h-3.5 opacity-20" />}
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => handleToggle('listings', isSubscribedToListings)}
          className="flex items-center justify-between cursor-pointer py-2.5 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <div className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-colors", isSubscribedToListings ? "bg-primary/20 text-primary" : "bg-muted/20 text-muted-foreground")}>
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold">New Listings</span>
              <span className="text-[9px] opacity-50">Notifications for deals</span>
            </div>
          </div>
          {isSubscribedToListings ? <Bell className="w-3.5 h-3.5 text-primary fill-primary" /> : <BellOff className="w-3.5 h-3.5 opacity-20" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FavoriteUserButton;
