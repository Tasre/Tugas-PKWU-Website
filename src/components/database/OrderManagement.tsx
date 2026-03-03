import { useState } from "react";
import { Package, Search, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAllOrders } from "@/hooks/use-database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const OrderManagement = () => {
  const { data: orders, isLoading } = useAllOrders();
  const [search, setSearch] = useState("");

  const filteredOrders = orders?.filter((o) =>
    o.id.toLowerCase().includes(search.toLowerCase()) ||
    o.listings?.title?.toLowerCase().includes(search.toLowerCase()) ||
    o.buyer?.username?.toLowerCase().includes(search.toLowerCase()) ||
    o.seller?.username?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading orders...</div>;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "delivered": return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case "pending": return <Clock className="w-3 h-3 mr-1" />;
      case "disputed": return <AlertCircle className="w-3 h-3 mr-1" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
      case "pending": return "text-amber-500 border-amber-500/30 bg-amber-500/10";
      case "disputed": return "text-destructive border-destructive/30 bg-destructive/10";
      case "processing": return "text-blue-500 border-blue-500/30 bg-blue-500/10";
      case "cancelled": return "text-muted-foreground border-border bg-muted/10";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search orders by ID, listing, buyer, or seller..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card/50 border-border"
        />
      </div>

      <div className="glass rounded-xl overflow-hidden border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground">Order ID</TableHead>
              <TableHead className="text-muted-foreground">Listing</TableHead>
              <TableHead className="text-muted-foreground">Buyer / Seller</TableHead>
              <TableHead className="text-muted-foreground">Amount</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders?.map((order) => (
              <TableRow key={order.id} className="border-border hover:bg-white/5">
                <TableCell className="font-mono text-[10px] text-muted-foreground uppercase">
                  {order.id.substring(0, 8)}...
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <span className="text-foreground font-medium line-clamp-1">
                    {order.listings?.title || "Deleted Listing"}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col text-xs">
                    <span className="text-foreground">B: {order.buyer?.username || "Unknown"}</span>
                    <span className="text-muted-foreground">S: {order.seller?.username || "Unknown"}</span>
                  </div>
                </TableCell>
                <TableCell className="font-display font-semibold text-foreground">
                  ${order.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`flex items-center w-fit py-0 px-2 ${getStatusColor(order.status)}`}
                  >
                    {getStatusIcon(order.status)}
                    {order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                  {new Date(order.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrderManagement;
