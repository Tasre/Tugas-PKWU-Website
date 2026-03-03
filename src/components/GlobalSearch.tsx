import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Gamepad2, ShoppingBag, Newspaper } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  type: "game" | "listing" | "post";
  route: string;
}

const GlobalSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const pattern = `%${q}%`;
      const [gamesRes, listingsByTitle, listingsByDesc, postsByTitle, postsByContent] = await Promise.all([
        supabase.from("supported_games").select("id, name").ilike("name", pattern).limit(5),
        supabase.from("listings").select("id, title, game, category").eq("status", "active").ilike("title", pattern).limit(6),
        supabase.from("listings").select("id, title, game, category").eq("status", "active").ilike("description", pattern).limit(4),
        supabase.from("posts").select("id, title, game").eq("status", "public").ilike("title", pattern).limit(4),
        supabase.from("posts").select("id, title, game").eq("status", "public").ilike("content", pattern).limit(3),
      ]);

      // Deduplicate listings and posts by id
      const seenListings = new Set<string>();
      const allListings = [...(listingsByTitle.data || []), ...(listingsByDesc.data || [])].filter((l) => {
        if (seenListings.has(l.id)) return false;
        seenListings.add(l.id);
        return true;
      }).slice(0, 8);

      const seenPosts = new Set<string>();
      const allPosts = [...(postsByTitle.data || []), ...(postsByContent.data || [])].filter((p) => {
        if (seenPosts.has(p.id)) return false;
        seenPosts.add(p.id);
        return true;
      }).slice(0, 5);

      const items: SearchResult[] = [
        ...(gamesRes.data || []).map((g) => ({
          id: g.id,
          title: g.name,
          type: "game" as const,
          route: `/games?game=${encodeURIComponent(g.name)}`,
        })),
        ...allListings.map((l) => ({
          id: l.id,
          title: l.title,
          subtitle: `${l.game} · ${l.category}`,
          type: "listing" as const,
          route: `/games?game=${encodeURIComponent(l.game)}`,
        })),
        ...allPosts.map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: p.game,
          type: "post" as const,
          route: `/news/${p.id}`,
        })),
      ];
      setResults(items);
      setSelectedIndex(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 250);
    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    navigate(result.route);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const iconMap = {
    game: <Gamepad2 className="w-4 h-4 text-primary shrink-0" />,
    listing: <ShoppingBag className="w-4 h-4 text-secondary shrink-0" />,
    post: <Newspaper className="w-4 h-4 text-accent shrink-0" />,
  };

  const labelMap = { game: "Game", listing: "Listing", post: "Post" };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass border border-border text-muted-foreground text-sm hover:text-foreground transition-colors cursor-pointer"
      >
        <Search className="w-4 h-4" />
        <span className="hidden lg:inline">Search...</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(""); }}>
        <DialogContent className="glass border-border p-0 max-w-lg gap-0 [&>button]:hidden">
          <div className="flex items-center border-b border-border px-4">
            <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-3" />
            <Input
              autoFocus
              placeholder="Search games, listings, posts..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-12 text-sm placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto p-2">
            {query.length < 2 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                Type at least 2 characters to search
              </p>
            )}

            {query.length >= 2 && !loading && results.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">
                No results found
              </p>
            )}

            {results.map((r, i) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                  i === selectedIndex ? "bg-accent/50 text-accent-foreground" : "text-foreground hover:bg-accent/30"
                }`}
              >
                {iconMap[r.type]}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.title}</p>
                  {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                  {labelMap[r.type]}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GlobalSearch;
