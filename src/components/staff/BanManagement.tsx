import { useState } from "react";
import { Search, Ban, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllBans, useBanUser, useUnbanUser, useSearchUsersForBan } from "@/hooks/use-staff";

const BanManagement = () => {
  const { data: bans, isLoading } = useAllBans();
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();
  const [search, setSearch] = useState("");
  const { data: users } = useSearchUsersForBan(search);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string | null } | null>(null);
  const [banType, setBanType] = useState<"sell_ban" | "full_ban">("sell_ban");
  const [reason, setReason] = useState("");

  const handleBan = () => {
    if (!selectedUser) return;
    banUser.mutate(
      { userId: selectedUser.id, banType, reason: reason.trim() || undefined },
      {
        onSuccess: () => {
          setSelectedUser(null);
          setSearch("");
          setReason("");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Ban a user */}
      <div className="glass rounded-xl p-4 space-y-3">
        <h4 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Ban className="w-4 h-4 text-destructive" /> Ban a User
        </h4>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search username..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedUser(null); }}
            className="pl-9 bg-card/50 border-border"
          />
        </div>

        {users && users.length > 0 && !selectedUser && (
          <div className="border border-border rounded-lg overflow-hidden">
            {users.map((u: any) => (
              <button
                key={u.id}
                onClick={() => { setSelectedUser(u); setSearch(u.username || u.id); }}
                className="w-full text-left px-3 py-2 hover:bg-muted/50 text-sm text-foreground border-b border-border last:border-0"
              >
                {u.username || u.id}
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <>
            <Select value={banType} onValueChange={(v: any) => setBanType(v)}>
              <SelectTrigger className="bg-card/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass border-border">
                <SelectItem value="sell_ban">Sell Ban (can browse, can't list)</SelectItem>
                <SelectItem value="full_ban">Full Ban (blocked entirely)</SelectItem>
              </SelectContent>
            </Select>

            <Textarea
              placeholder="Reason for ban (optional)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-card/50 border-border min-h-[60px]"
            />

            <Button
              variant="destructive"
              onClick={handleBan}
              disabled={banUser.isPending}
              className="w-full"
            >
              <Ban className="w-4 h-4 mr-2" />
              Ban {selectedUser.username || "User"}
            </Button>
          </>
        )}
      </div>

      {/* Active bans */}
      <div className="space-y-3">
        <h4 className="font-display text-sm font-semibold text-foreground">Active Bans</h4>
        {isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {bans?.filter((b: any) => b.active).map((ban: any) => (
          <div key={ban.id} className="glass rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{ban.user_id.slice(0, 8)}...</p>
              <p className="text-xs text-muted-foreground">{ban.reason || "No reason provided"}</p>
              <Badge variant="secondary" className="text-xs mt-1">
                {ban.ban_type === "full_ban" ? "Full Ban" : "Sell Ban"}
              </Badge>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => unbanUser.mutate(ban.id)}
              disabled={unbanUser.isPending}
            >
              <ShieldCheck className="w-3 h-3 mr-1" /> Unban
            </Button>
          </div>
        ))}
        {bans && !bans.filter((b: any) => b.active).length && (
          <p className="text-sm text-muted-foreground text-center py-6">No active bans</p>
        )}
      </div>
    </div>
  );
};

export default BanManagement;
