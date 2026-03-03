import { motion } from "framer-motion";
import { ArrowLeft, Database as DbIcon, Users, ShoppingBag, Receipt, Gamepad2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import UserManagement from "@/components/database/UserManagement";
import ListingManagement from "@/components/database/ListingManagement";
import OrderManagement from "@/components/database/OrderManagement";
import GameManagement from "@/components/staff/GameManagement";

const Database = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          <DbIcon className="w-6 h-6 text-primary" />
          <h1 className="font-display text-3xl md:text-4xl font-bold">
            Database <span className="text-gradient">Manager</span>
          </h1>
        </motion.div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="glass border-border p-1">
            <TabsTrigger value="users" className="font-display gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Users className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="listings" className="font-display gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <ShoppingBag className="w-4 h-4" /> Listings
            </TabsTrigger>
            <TabsTrigger value="orders" className="font-display gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Receipt className="w-4 h-4" /> Orders
            </TabsTrigger>
            <TabsTrigger value="games" className="font-display gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              <Gamepad2 className="w-4 h-4" /> Games
            </TabsTrigger>
          </TabsList>

          <div className="lg:max-w-[90%]">
            <TabsContent value="users" className="mt-0">
              <UserManagement />
            </TabsContent>
            <TabsContent value="listings" className="mt-0">
              <ListingManagement />
            </TabsContent>
            <TabsContent value="orders" className="mt-0">
              <OrderManagement />
            </TabsContent>
            <TabsContent value="games" className="mt-0">
              <GameManagement />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Database;
