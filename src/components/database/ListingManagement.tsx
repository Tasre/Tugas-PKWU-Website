import { useState } from "react";
import { ShoppingBag, Trash2, Search, ExternalLink, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAllListings } from "@/hooks/use-database";
import { useDeleteListing } from "@/hooks/use-seller-data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ListingManagement = () => {
  const { data: listings, isLoading } = useAllListings();
  const deleteListing = useDeleteListing();
  const [search, setSearch] = useState("");

  const filteredListings = listings?.filter((l) =>
    l.title?.toLowerCase().includes(search.toLowerCase()) ||
    l.game?.toLowerCase().includes(search.toLowerCase()) ||
    l.id?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading listings...</div>;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search listings by title, game, or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card/50 border-border"
        />
      </div>

      <div className="glass rounded-xl overflow-hidden border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground">Listing</TableHead>
              <TableHead className="text-muted-foreground">Game & Category</TableHead>
              <TableHead className="text-muted-foreground">Seller</TableHead>
              <TableHead className="text-muted-foreground">Price</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredListings?.map((listing) => (
              <TableRow key={listing.id} className="border-border hover:bg-white/5">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    {listing.image_url ? (
                      <img src={listing.image_url} alt="" className="w-10 h-10 rounded bg-muted object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="text-foreground line-clamp-1">{listing.title}</span>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase">{listing.id.substring(0, 8)}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-foreground">{listing.game}</span>
                    <Badge variant="outline" className="w-fit text-[10px] py-0">{listing.category}</Badge>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {listing.profiles?.username || "Unknown"}
                </TableCell>
                <TableCell className="font-display font-semibold text-primary">
                  ${listing.price.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={
                      listing.status === "active" ? "text-emerald-500 border-emerald-500/30 bg-emerald-500/10" :
                      listing.status === "sold" ? "text-blue-500 border-blue-500/30 bg-blue-500/10" :
                      "text-amber-500 border-amber-500/30 bg-amber-500/10"
                    }
                  >
                    {listing.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this listing?")) {
                          deleteListing.mutate(listing.id);
                        }
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ListingManagement;
