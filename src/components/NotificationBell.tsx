import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNotifications, useUnreadCount, useMarkAsRead, useMarkAllAsRead, useUnreadDashboardCount, useUnreadBuyerOrderCount } from "@/hooks/use-notifications";
import { useNavigate, useLocation } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const NotificationBell = () => {
  const { data: notifications } = useNotifications();
  const unreadNotifCount = useUnreadCount();
  const unreadDashboardCount = useUnreadDashboardCount();
  const unreadBuyerCount = useUnreadBuyerOrderCount();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const navigate = useNavigate();
  const location = useLocation();

  const isNotifications = location.pathname === "/notifications";
  const totalUnread = unreadNotifCount + unreadDashboardCount + unreadBuyerCount;

  const BellButton = (
    <Button 
      variant="ghost" 
      size="icon" 
      className={cn(
        "relative transition-all duration-200",
        isNotifications 
          ? "text-primary bg-primary/10 shadow-[0_0_12px_hsl(var(--primary)/0.3)]" 
          : "text-muted-foreground hover:text-primary hover:bg-primary/10"
      )}
      onClick={(e) => {
        if (isNotifications) {
          e.preventDefault();
          e.stopPropagation();
          navigate(-1);
        }
      }}
    >
      <Bell className={cn(
        "w-5 h-5 transition-all",
        isNotifications && "fill-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"
      )} />
      {totalUnread > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center text-destructive-foreground font-bold animate-pulse">
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </Button>
  );

  if (isNotifications) {
    return BellButton;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {BellButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="glass border-border w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/10">
          <span className="font-display font-semibold text-sm text-foreground">Notifications</span>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate("/notifications")}
              className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wider"
            >
              See More...
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-3 py-1 bg-muted/5">
          {unreadNotifCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] text-muted-foreground h-6 px-2 hover:text-primary"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="w-3 h-3 mr-1" /> Mark all read
            </Button>
          ) : <span className="text-[10px] text-muted-foreground px-2 italic">All caught up</span>}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {!notifications?.length ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No notifications</div>
        ) : (
          notifications.map((n: any) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}
              onClick={() => {
                if (!n.read) markAsRead.mutate(n.id);
                if (n.link) navigate(n.link);
              }}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="font-medium text-sm text-foreground flex-1">{n.title}</span>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              </div>
              <span className="text-xs text-muted-foreground">{n.message}</span>
              <span className="text-[10px] text-muted-foreground/60">
                {(() => {
                  try {
                    return formatDistanceToNow(new Date(n.created_at), { addSuffix: true });
                  } catch (e) {
                    return "Recently";
                  }
                })()}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
