import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface NewsSearchBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  gameFilter: string;
  onGameFilterChange: (g: string) => void;
}

const NewsSearchBar = ({ searchQuery, onSearchChange, gameFilter, onGameFilterChange }: NewsSearchBarProps) => {
  const { data: games } = useQuery({
    queryKey: ["supported_games"],
    queryFn: async () => {
      const { data } = await supabase.from("supported_games").select("name").order("name");
      return data || [];
    },
  });

  const hasFilters = searchQuery || gameFilter;

  return (
    <div className="glass rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-8">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search posts by title or content..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 glass border-border h-9 text-sm"
        />
      </div>
      <Select value={gameFilter || "all"} onValueChange={(v) => onGameFilterChange(v === "all" ? "" : v)}>
        <SelectTrigger className="glass border-border w-full sm:w-48 h-9 text-sm">
          <SelectValue placeholder="All Games" />
        </SelectTrigger>
        <SelectContent className="glass border-border">
          <SelectItem value="all">All Games</SelectItem>
          {games?.map((g: any) => (
            <SelectItem key={g.name} value={g.name}>{g.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { onSearchChange(""); onGameFilterChange(""); }}
          className="h-9 px-3 text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4 mr-1" /> Clear
        </Button>
      )}
    </div>
  );
};

export default NewsSearchBar;
