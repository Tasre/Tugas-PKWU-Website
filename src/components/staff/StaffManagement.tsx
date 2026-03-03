import React, { useState } from "react";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAllUsersWithRoles, useUpdateUserRole, useRole } from "@/hooks/use-staff";
import { Search, Loader2, ShieldCheck, ShieldAlert, Shield, User, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const StaffManagement = () => {
  const [search, setSearch] = useState("");
  const { data: users, isLoading } = useAllUsersWithRoles();
  const { mutate: updateRole } = useUpdateUserRole();
  const { isOwner, isAdmin } = useRole();
  
  // Confirmation state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<any>(null);
  const [targetRole, setTargetRole] = useState<string>("");
  const [confirmInput, setConfirmInput] = useState("");

  const filteredUsers = users?.filter(user => 
    user.username?.toLowerCase().includes(search.toLowerCase())
  );

  const handleRoleChangeRequest = (user: any, newRole: string) => {
    if (user.role === newRole) return;
    setTargetUser(user);
    setTargetRole(newRole);
    setConfirmInput("");
    setConfirmOpen(true);
  };

  const handleConfirmRoleChange = () => {
    if (!targetUser) return;
    const last5 = targetUser.id.slice(-5);
    if (confirmInput === last5) {
      updateRole({ userId: targetUser.id, role: targetRole as any });
      setConfirmOpen(false);
      setTargetUser(null);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner": return <Badge className="bg-purple-600"><ShieldCheck className="w-3 h-3 mr-1" /> Owner</Badge>;
      case "admin": return <Badge className="bg-red-600"><ShieldAlert className="w-3 h-3 mr-1" /> Admin</Badge>;
      case "staff": return <Badge className="bg-blue-600"><Shield className="w-3 h-3 mr-1" /> Staff</Badge>;
      default: return <Badge variant="secondary"><User className="w-3 h-3 mr-1" /> User</Badge>;
    }
  };

  if (!isAdmin && !isOwner) {
    return <div className="p-8 text-center text-muted-foreground">Unauthorized access</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Search users..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Change Role</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredUsers?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="flex items-center gap-2">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback>{user.username?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.username}</span>
                </TableCell>
                <TableCell>
                  {getRoleBadge(user.role)}
                </TableCell>
                <TableCell>
                  <Select 
                    value={user.role} 
                    onValueChange={(val) => handleRoleChangeRequest(user, val)}
                    disabled={user.role === "owner" && !isOwner}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isOwner && <SelectItem value="owner">Owner</SelectItem>}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="glass border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-primary" />
              Confirm Role Change
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Are you sure you want to change <strong>{targetUser?.username}</strong>'s role to <strong>{targetRole}</strong>?
              This is a sensitive administrative action.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                To confirm, please type the last 5 digits of the user's ID:
              </p>
              <p 
                className="text-xl font-mono font-bold tracking-widest bg-primary/10 p-3 rounded border border-primary/20 text-center text-primary glow-cyan select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                {targetUser?.id.slice(-5)}
              </p>
              <Input
                placeholder="Type the digits above..."
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                className="bg-background/50 border-border"
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmRoleChange}
              disabled={confirmInput !== targetUser?.id.slice(-5)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan"
            >
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
