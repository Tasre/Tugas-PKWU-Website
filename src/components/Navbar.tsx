import { Gamepad2, Heart, Menu, LogOut, User as UserIcon, LayoutDashboard, Store, Newspaper, HeadphonesIcon, Joystick, Shield, History, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import GlobalSearch from "./GlobalSearch";
import ProfileDialog from "./ProfileDialog";
import NotificationBell from "./NotificationBell";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/use-staff";
import { useNavigate, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useUnreadCount, useUnreadDashboardCount, useUnreadBuyerOrderCount } from "@/hooks/use-notifications";

const Navbar = () => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const { isStaff, isAdmin } = useRole();
  
  // High-performance notification hooks
  const unreadCount = useUnreadCount();
  const unreadDashboardCount = useUnreadDashboardCount();
  const unreadBuyerCount = useUnreadBuyerOrderCount();
  
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  const isFavorites = location.pathname === "/favorites";

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleNavigation = (path: string) => {
    if (location.pathname === path) {
      window.location.reload();
    } else {
      navigate(path);
    }
  };

  const handleFavoritesClick = () => {
    if (isFavorites) {
      navigate(-1);
    } else {
      navigate("/favorites");
    }
  };

  // Total unread across all hubs
  const totalUnread = (Number(unreadCount) || 0) + (Number(unreadDashboardCount) || 0) + (Number(unreadBuyerCount) || 0);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between md:grid md:grid-cols-3">
        {/* Left: Logo + Brand Text */}
        <div className="flex justify-start items-center gap-2 cursor-pointer shrink-0" onClick={() => handleNavigation("/")}>
          <Gamepad2 className="w-7 h-7 md:w-8 md:h-8 text-primary" />
          <span className="font-display text-lg md:text-xl font-bold text-gradient">CYSTON</span>
        </div>

        {/* Center: Navigation Links (Desktop Only) */}
        <div className="hidden md:flex justify-center">
          <div className="flex items-center gap-6 lg:gap-8">
            <button 
              onClick={() => handleNavigation("/")} 
              className={cn("transition-colors whitespace-nowrap text-sm font-bold uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer", isHome ? "text-primary" : "text-muted-foreground hover:text-primary")}
            >
              {t("nav.marketplace")}
            </button>
            <button 
              onClick={() => handleNavigation("/games")} 
              className={cn("transition-colors whitespace-nowrap text-sm font-bold uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer", location.pathname === "/games" ? "text-primary" : "text-muted-foreground hover:text-primary")}
            >
              {t("nav.games")}
            </button>
            <button 
              onClick={() => handleNavigation("/news")} 
              className={cn("transition-colors whitespace-nowrap text-sm font-bold uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer", location.pathname === "/news" ? "text-primary" : "text-muted-foreground hover:text-primary")}
            >
              {t("nav.news")}
            </button>
            <button 
              onClick={() => handleNavigation("/dashboard")} 
              className={cn("transition-colors whitespace-nowrap text-sm font-bold uppercase tracking-wider relative bg-transparent border-0 p-0 cursor-pointer", isDashboard ? "text-primary" : "text-muted-foreground hover:text-primary")}
            >
              {t("nav.sell")}
              {unreadDashboardCount > 0 && (
                <span className="absolute -top-1 -right-2 w-2 h-2 bg-primary rounded-full animate-chat-pulse" />
              )}
            </button>
            <button 
              onClick={() => handleNavigation("/support")} 
              className={cn("transition-colors whitespace-nowrap text-sm font-bold uppercase tracking-wider bg-transparent border-0 p-0 cursor-pointer", location.pathname === "/support" ? "text-primary" : "text-muted-foreground hover:text-primary")}
            >
              {t("nav.support")}
            </button>
          </div>
        </div>

        {/* Right: Action Icons */}
        <div className="flex justify-end items-center gap-1 md:gap-2">
          <GlobalSearch />
          
          {user && (
            <div className="flex items-center gap-1 md:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-9 w-9 relative group transition-all duration-200",
                  isFavorites
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                )}
                onClick={handleFavoritesClick}
              >
                <Heart className={cn(
                  "w-4 h-4 md:w-5 md:h-5 transition-all",
                  isFavorites && "fill-primary",
                )} />
              </Button>
              
              <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 relative">
                    <UserIcon className="w-4 h-4 md:w-5 md:h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="glass border-border w-56">
                  <DropdownMenuItem className="text-muted-foreground text-[10px] uppercase font-black tracking-widest cursor-default focus:bg-transparent px-4 py-2">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  
                  <ProfileDialog />
                  
                  <DropdownMenuItem onClick={() => handleNavigation("/dashboard")} className="cursor-pointer group flex items-center justify-between">
                    <div className="flex items-center">
                      <LayoutDashboard className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                      Dashboard
                    </div>
                    {unreadDashboardCount > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-1.5 min-w-[1rem] flex items-center justify-center font-bold">
                        {unreadDashboardCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleNavigation("/orders")} className="cursor-pointer group flex items-center justify-between">
                    <div className="flex items-center">
                      <History className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                      Order History
                    </div>
                    {unreadBuyerCount > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-[9px] h-4 px-1.5 min-w-[1rem] flex items-center justify-center font-bold">
                        {unreadBuyerCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>

                  {isStaff && (
                    <>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem onClick={() => handleNavigation("/staff")} className="cursor-pointer text-primary relative group">
                        <Shield className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                        Staff Panel
                        {unreadCount > 0 && (
                          <Badge className="ml-auto bg-primary text-primary-foreground text-[9px] h-4 px-1.5 min-w-[1rem] flex items-center justify-center font-bold">
                            {unreadCount}
                          </Badge>
                        )}
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => handleNavigation("/database")} className="cursor-pointer text-primary group">
                          <Database className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                          Database Manager
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer group">
                    <LogOut className="w-4 h-4 mr-2 opacity-60 group-hover:opacity-100 transition-opacity" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {!user && (
            <Button
              onClick={() => handleNavigation("/auth")}
              className="hidden md:flex bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan h-10 px-6 rounded-xl font-bold"
            >
              {t("nav.signIn")}
            </Button>
          )}

          {/* Mobile hamburger menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground h-9 w-9">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass border-border w-48 md:hidden">
              <DropdownMenuItem onClick={() => handleNavigation("/")} className={cn("cursor-pointer", isHome && "text-primary font-semibold")}>
                <Store className="w-4 h-4 mr-2" />
                {t("nav.marketplace")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation("/games")} className={cn("cursor-pointer", location.pathname === "/games" && "text-primary font-semibold")}>
                <Joystick className="w-4 h-4 mr-2" />
                {t("nav.games")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation("/news")} className={cn("cursor-pointer", location.pathname === "/news" && "text-primary font-semibold")}>
                <Newspaper className="w-4 h-4 mr-2" />
                {t("nav.news")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation("/dashboard")} className={cn("cursor-pointer flex items-center justify-between", isDashboard && "text-primary font-semibold")}>
                <div className="flex items-center">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  {t("nav.sell")}
                </div>
                {unreadDashboardCount > 0 && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] h-4 px-1 min-w-[1rem] flex items-center justify-center animate-pulse">
                    {unreadDashboardCount}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleNavigation("/support")} className={cn("cursor-pointer", location.pathname === "/support" && "text-primary font-semibold")}>
                <HeadphonesIcon className="w-4 h-4 mr-2" />
                {t("nav.support")}
              </DropdownMenuItem>
              {isStaff && (
                <DropdownMenuItem onClick={() => handleNavigation("/staff")} className={cn("cursor-pointer relative", location.pathname === "/staff" && "text-primary font-semibold")}>
                  <Shield className="w-4 h-4 mr-2 text-primary" />
                  Staff Panel
                  {unreadCount > 0 && (
                    <Badge className="ml-auto bg-primary text-primary-foreground text-[10px] h-4 px-1 min-w-[1rem] flex items-center justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
              )}
              {!user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleNavigation("/auth")} className="cursor-pointer text-primary font-semibold">
                    <UserIcon className="w-4 h-4 mr-2" />
                    {t("nav.signIn")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
