import { motion } from "framer-motion";
import { DollarSign, Package, ShoppingCart, TrendingUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSellerListings, useSellerOrders } from "@/hooks/use-seller-data";

const DashboardStats = () => {
  const { data: listings } = useSellerListings();
  const { data: orders } = useSellerOrders();
  const { formatPrice } = useLanguage();

  const activeListings = listings?.filter((l) => l.status === "active").length ?? 0;
  const totalListings = listings?.length ?? 0;
  const totalOrders = orders?.length ?? 0;
  const totalRevenue = orders
    ?.filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.amount, 0) ?? 0;
  const deliveredOrdersCount = orders?.filter((o) => o.status === "delivered").length ?? 0;
  const pendingOrders = orders?.filter((o) => o.status === "pending" || o.status === "processing").length ?? 0;

  const stats = [
    {
      label: "Active Listings",
      value: activeListings.toString(),
      subtitle: `${totalListings} total`,
      icon: Package,
      color: "text-primary",
    },
    {
      label: "Total Orders",
      value: totalOrders.toString(),
      subtitle: `${pendingOrders} pending`,
      icon: ShoppingCart,
      color: "text-secondary",
    },
    {
      label: "Revenue",
      value: formatPrice(totalRevenue),
      subtitle: "Delivered orders",
      icon: DollarSign,
      color: "text-green-400",
    },
    {
      label: "Conversion",
      value: totalListings > 0 ? `${Math.round((deliveredOrdersCount / totalListings) * 100)}%` : "0%",
      subtitle: "Delivered / Listings",
      icon: TrendingUp,
      color: "text-yellow-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {stat.label}
            </span>
            <stat.icon className={`w-5 h-5 ${stat.color}`} />
          </div>
          <div className="font-display text-2xl font-bold text-foreground">{stat.value}</div>
          <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
        </motion.div>
      ))}
    </div>
  );
};

export default DashboardStats;
