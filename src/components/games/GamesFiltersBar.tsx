import { useState } from "react";
import { Search, X, SlidersHorizontal, Calendar, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useActiveGames, useGameTags, type GamesFilters } from "@/hooks/use-games";
import SellerSearchPopover from "./SellerSearchPopover";

const FALLBACK_CATEGORIES = ["Currency", "Accounts", "Skins", "Items", "Boosting", "Materials"];

const SORT_OPTIONS = [
  { value: "default", label: "Smart (Recommended)" },
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "date_before", label: "Before Date" },
  { value: "date_after", label: "After Date" },
];

interface GamesFiltersBarProps {
  filters: GamesFilters;
  onFiltersChange: (filters: GamesFilters) => void;
}

const GamesFiltersBar = ({ filters, onFiltersChange }: GamesFiltersBarProps) => {
  const { data: games } = useActiveGames();
  const { data: gameTags } = useGameTags(filters.game);
  const hasFilters = filters.game || (filters.category && filters.category.length > 0) || filters.search || filters.sellerSearch || (filters.sortBy && filters.sortBy !== "default");

  const categories = gameTags?.length ? gameTags : FALLBACK_CATEGORIES;

  const handleCategoryToggle = (cat: string) => {
    const currentCategories = filters.category || [];
    const newCategories = currentCategories.includes(cat)
      ? currentCategories.filter((c) => c !== cat)
      : [...currentCategories, cat];
    
    onFiltersChange({
      ...filters,
      category: newCategories.length > 0 ? newCategories : undefined,
    });
  };

  return (
    <div className="glass rounded-xl p-5 space-y-5 sticky top-24">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          Filters
        </h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => onFiltersChange({})} className="text-xs text-muted-foreground h-7 px-2">
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Search Items */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Search Items</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            className="pl-9 h-9 text-sm bg-card/50 border-border"
          />
        </div>
      </div>

      {/* Seller Search */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Search Seller</Label>
        <SellerSearchPopover
          value={filters.sellerSearch || ""}
          onChange={(val) => onFiltersChange({ ...filters, sellerSearch: val || undefined })}
        />
      </div>

      {/* Game Filter */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Game</Label>
        <Select
          value={filters.game || "all"}
          onValueChange={(v) => onFiltersChange({ ...filters, game: v === "all" ? undefined : v, category: undefined })}
        >
          <SelectTrigger className="h-9 text-sm bg-card/50 border-border">
            <SelectValue placeholder="All Games" />
          </SelectTrigger>
          <SelectContent className="glass border-border">
            <SelectItem value="all">All Games</SelectItem>
            {games?.map((game) => (
              <SelectItem key={game.name} value={game.name}>{game.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category - MULTI SELECT ENABLED */}
      {filters.game && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Category
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const isSelected = filters.category?.includes(cat);
              return (
                <Badge
                  key={cat}
                  variant={isSelected ? "default" : "secondary"}
                  className={`cursor-pointer text-xs transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "hover:bg-primary/20 hover:text-primary"
                  }`}
                  onClick={() => handleCategoryToggle(cat)}
                >
                  {cat}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Sort Order */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Sort By</Label>
        <Select
          value={filters.sortBy || "default"}
          onValueChange={(v) => onFiltersChange({ ...filters, sortBy: v as GamesFilters["sortBy"] })}
        >
          <SelectTrigger className="h-9 text-sm bg-card/50 border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass border-border">
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date picker for before/after */}
      {(filters.sortBy === "date_before" || filters.sortBy === "date_after") && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {filters.sortBy === "date_before" ? "Before Date" : "After Date"}
          </Label>
          <Input
            type="date"
            value={filters.dateFilter || ""}
            onChange={(e) => onFiltersChange({ ...filters, dateFilter: e.target.value || undefined })}
            className="h-9 text-sm bg-card/50 border-border"
          />
        </div>
      )}
    </div>
  );
};

export default GamesFiltersBar;
