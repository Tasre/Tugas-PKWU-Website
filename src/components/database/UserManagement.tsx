import { useState } from "react";
import { Users, Trash2, Shield, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAllProfiles, useDeleteUser, useUpdateUserRole } from "@/hooks/use-database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const UserManagement = () => {
  const { data: profiles, isLoading } = useAllProfiles();
  const deleteUser = useDeleteUser();
  const updateRole = useUpdateUserRole();
  const [search, setSearch] = useState("");

  const filteredProfiles = profiles?.filter((p) =>
    p.username?.toLowerCase().includes(search.toLowerCase()) ||
    p.id?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) return <div className="text-muted-foreground text-sm">Loading users...</div>;

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users by username or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card/50 border-border"
        />
      </div>

      <div className="glass rounded-xl overflow-hidden border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground">User</TableHead>
              <TableHead className="text-muted-foreground">ID</TableHead>
              <TableHead className="text-muted-foreground">Role</TableHead>
              <TableHead className="text-muted-foreground">Joined</TableHead>
              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProfiles?.map((profile) => (
              <TableRow key={profile.id} className="border-border hover:bg-white/5">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <span className="text-foreground">{profile.username || "Anonymous"}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {profile.id.substring(0, 8)}...
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {profile.user_roles?.map((ur: any) => (
                      <Badge 
                        key={ur.role}
                        variant={ur.role === "staff" ? "default" : "secondary"}
                        className={ur.role === "staff" ? "bg-primary/20 text-primary hover:bg-primary/30 border-none" : ""}
                      >
                        {ur.role}
                      </Badge>
                    ))}
                    {!profile.user_roles?.length && <Badge variant="outline">user</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {new Date(profile.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const isStaff = profile.user_roles?.some((ur: any) => ur.role === "staff");
                        updateRole.mutate({ userId: profile.id, role: isStaff ? "user" : "staff" });
                      }}
                      className="text-primary hover:text-primary hover:bg-primary/10"
                      title={profile.user_roles?.some((ur: any) => ur.role === "staff") ? "Demote to User" : "Promote to Staff"}
                    >
                      <Shield className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
                          deleteUser.mutate(profile.id);
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

export default UserManagement;
