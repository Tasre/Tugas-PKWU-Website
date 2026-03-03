import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarketplaceGames, type MarketplaceFilters as Filters } from "@/hooks/use-marketplace";

const CATEGORIES = ["Currency", "Accounts", "Skins", "Items", "Boosting", "Materials"];

interface MarketplaceFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

const MarketplaceFilters = ({ filters, onFiltersChange }: MarketplaceFiltersProps) => {
  const { data: games } = useMarketplaceGames();
  const hasFilters = filters.game || filters.category || filters.search;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            className="pl-10 glass border-border"
          />
        </div>

        <Select
          value={filters.game || "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, game: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-full sm:w-48 glass border-border">
            <SelectValue placeholder="All Games" />
          </SelectTrigger>
          <SelectContent className="glass border-border">
            <SelectItem value="all">All Games</SelectItem>
            {games?.map((game) => (
              <SelectItem key={game} value={game}>{game}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category || "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, category: v === "all" ? undefined : v })}
        >
          <SelectTrigger className="w-full sm:w-48 glass border-border">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="glass border-border">
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onFiltersChange({})}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Quick category pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Badge
            key={cat}
            variant={filters.category === cat ? "default" : "secondary"}
            className={`cursor-pointer transition-colors ${
              filters.category === cat
                ? "bg-primary text-primary-foreground"
                : "hover:bg-primary/20 hover:text-primary"
            }`}
            onClick={() =>
              onFiltersChange({
                ...filters,
                category: filters.category === cat ? undefined : cat,
              })
            }
          >
            {cat}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceFilters;
