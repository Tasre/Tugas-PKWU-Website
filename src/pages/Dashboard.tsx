import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import DashboardStats from "@/components/dashboard/DashboardStats";
import ListingsTable from "@/components/dashboard/ListingsTable";
import OrdersTable from "@/components/dashboard/OrdersTable";
import TakedownsTab from "@/components/dashboard/TakedownsTab";
import CreateListingDialog from "@/components/dashboard/CreateListingDialog";
import { useUnreadDashboardCount } from "@/hooks/use-notifications";

const Dashboard = () => {
  const navigate = useNavigate();
  const unreadDashboardCount = useUnreadDashboardCount();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 pt-28 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                Seller <span className="text-gradient">Dashboard</span>
              </h1>
            </div>
            <p className="text-muted-foreground ml-11">Manage your listings, track orders, and view your sales</p>
          </div>
          <CreateListingDialog />
        </motion.div>

        {/* Stats */}
        <div className="mb-8">
          <DashboardStats />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="glass border-border">
            <TabsTrigger value="listings" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              My Listings
            </TabsTrigger>
            <TabsTrigger value="orders" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary relative">
              Orders
              {unreadDashboardCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[10px] flex items-center justify-center text-primary-foreground font-bold shadow-[0_0_8px_hsl(var(--primary)/0.5)] animate-pulse">
                  {unreadDashboardCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="takedowns" className="font-display data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              Takedowns
            </TabsTrigger>
          </TabsList>

          <div className="lg:max-w-[80%]">
            <TabsContent value="listings">
              <ListingsTable />
            </TabsContent>

            <TabsContent value="orders">
              <OrdersTable />
            </TabsContent>

            <TabsContent value="takedowns">
              <TakedownsTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
