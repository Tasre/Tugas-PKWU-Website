import { useState, useRef } from "react";
import { User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSearchSellers } from "@/hooks/use-games";

interface SellerSearchPopoverProps {
  value: string;
  onChange: (value: string) => void;
}

const SellerSearchPopover = ({ value, onChange }: SellerSearchPopoverProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const { data: sellers } = useSearchSellers(inputValue);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSelect = (seller: { id: string; username: string | null }) => {
    const displayValue = seller.username || seller.id;
    setInputValue(displayValue);
    onChange(displayValue);
    setShowResults(false);
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    setShowResults(true);
    if (!val) onChange("");
  };

  const handleBlur = () => {
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Username or Account ID..."
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => inputValue.length >= 2 && setShowResults(true)}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onChange(inputValue);
              setShowResults(false);
            }
          }}
          className="pl-9 h-9 text-sm bg-card/50 border-border"
        />
      </div>

      {showResults && sellers && sellers.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 glass rounded-lg border border-border overflow-hidden shadow-lg">
          {sellers.map((seller: any) => (
            <button
              key={seller.id}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 transition-colors flex items-center gap-2"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(seller);
              }}
            >
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
                {seller.avatar_url ? (
                  <img src={seller.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <User className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-foreground font-medium truncate">{seller.username || "Unknown"}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{seller.id}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SellerSearchPopover;
