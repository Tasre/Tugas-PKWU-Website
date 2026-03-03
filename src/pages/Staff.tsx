import { motion } from "framer-motion";
import { ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import GameManagement from "@/components/staff/GameManagement";
import TakedownManagement from "@/components/staff/TakedownManagement";
import PostTakedownManagement from "@/components/staff/PostTakedownManagement";
import BanManagement from "@/components/staff/BanManagement";
import SupportManagement from "@/components/staff/SupportManagement";
import { StaffManagement } from "@/components/staff/StaffManagement";
import ChangelogManagement from "@/components/staff/ChangelogManagement";
import { useRole } from "@/hooks/use-staff";
import { useState } from "react";

import { useUnreadCount, useUnreadStaffDisputeCount } from "@/hooks/use-notifications";

const Staff = () => {
  const navigate = useNavigate();
  const { isAdmin, isOwner, isStaff } = useRole();
  const unreadCount = useUnreadCount();
  const disputeCount = useUnreadStaffDisputeCount();
  const [activeTab, setActiveTab] = useState("games");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Staff <span className="text-gradient">Panel</span>
          </h1>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="relative">
            <style dangerouslySetInnerHTML={{ __html: `
              .hide-scrollbar::-webkit-scrollbar {
                display: none;
              }
              .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
            `}} />
            <TabsList className="glass border-border overflow-x-auto flex-nowrap justify-start max-w-full hide-scrollbar scroll-smooth">
              <TabsTrigger value="games" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary shrink-0">
                Games & Tags
              </TabsTrigger>
              <TabsTrigger value="takedowns" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary shrink-0">
                Listing Takedowns
              </TabsTrigger>
              <TabsTrigger value="post-takedowns" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary shrink-0">
                Post Takedowns
              </TabsTrigger>
              <TabsTrigger value="bans" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary shrink-0">
                User Bans
              </TabsTrigger>
              <TabsTrigger value="support" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary relative shrink-0">
                Support
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] flex items-center justify-center text-primary-foreground font-bold shadow-[0_0_8px_hsl(var(--primary)/0.5)]">
                    {unreadCount}
                  </span>
                )}
              </TabsTrigger>
              {isStaff && (
                <TabsTrigger value="changelog" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary shrink-0">
                  Audit Logs
                </TabsTrigger>
              )}
              {(isAdmin || isOwner) && (
                <TabsTrigger value="management" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary shrink-0">
                  Staff Management
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          <div className="lg:max-w-[80%]">
            <TabsContent value="games">
              {activeTab === "games" && <GameManagement />}
            </TabsContent>
            <TabsContent value="takedowns">
              {activeTab === "takedowns" && <TakedownManagement />}
            </TabsContent>
            <TabsContent value="post-takedowns">
              {activeTab === "post-takedowns" && <PostTakedownManagement />}
            </TabsContent>
            <TabsContent value="bans">
              {activeTab === "bans" && <BanManagement />}
            </TabsContent>
            <TabsContent value="support">
              {activeTab === "support" && <SupportManagement />}
            </TabsContent>
            {isStaff && (
              <TabsContent value="changelog">
                {activeTab === "changelog" && <ChangelogManagement />}
              </TabsContent>
            )}
            {(isAdmin || isOwner) && (
              <TabsContent value="management">
                {activeTab === "management" && <StaffManagement />}
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Staff;
