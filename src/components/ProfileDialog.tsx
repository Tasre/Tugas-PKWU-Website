import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { User, Edit2, Save, X, Trash2, AlertTriangle, Loader2, Shield, Camera, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useRole } from "@/hooks/use-staff";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ProfileDialog = () => {
  const { user, session, signOut } = useAuth();
  const { isStaff } = useRole();
  const unreadCount = useUnreadCount();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        
        if (!data) {
          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: user.id,
              username: user.user_metadata?.username || user.email?.split("@")[0],
            })
            .select()
            .single();
          
          if (insertError) throw insertError;
          return newProfile;
        }
        
        return data;
      } catch (err) {
        console.error("Error in profile query:", err);
        throw err;
      }
    },
    enabled: !!user && open,
    retry: 1,
  });

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !user) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload an image file (PNG, JPG, etc).",
        });
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload an image smaller than 2MB.",
        });
        return;
      }

      setIsUploading(true);

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      // Upload image to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update local state for preview
      setAvatarUrl(publicUrl);
      
      toast({
        title: "Image uploaded",
        description: "Your new profile picture has been uploaded. Don't forget to save changes!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile information has been saved successfully.",
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_own_user");

      if (error) {
        const { error: profileError } = await supabase
          .from("profiles")
          .delete()
          .eq("id", user.id);
        
        if (profileError) throw profileError;
      }

      toast({
        title: "Profile deleted",
        description: "Your profile has been removed. Signing out...",
      });
      
      setOpen(false);
      await signOut();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: error.message,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full text-left">
            <User className="w-4 h-4 mr-2" />
            See Profile
          </button>
        </DialogTrigger>
        <DialogContent hideClose className="glass border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-foreground flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                My Profile
              </div>
              <div className="flex items-center gap-1">
                {!isEditing && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsEditing(true)}
                    className="text-muted-foreground hover:text-primary"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center p-8 space-y-2">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto" />
                <p className="text-destructive font-medium">Failed to load profile</p>
                <p className="text-xs text-muted-foreground">{(error as any).message || "Unknown error occurred"}</p>
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] })}>
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative group">
                    <Avatar className="w-24 h-24 border-2 border-primary/20 p-1 bg-background shadow-xl">
                      <AvatarImage src={avatarUrl || ""} className="object-cover rounded-full" />
                      <AvatarFallback className="bg-primary/5 text-primary">
                        <User className="w-10 h-10" />
                      </AvatarFallback>
                    </Avatar>
                    
                    {isEditing && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        ) : (
                          <Camera className="w-6 h-6 text-white" />
                        )}
                      </button>
                    )}
                  </div>
                  
                  {isEditing && (
                    <div className="text-center">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[10px] uppercase font-black tracking-widest text-primary h-auto p-0"
                        disabled={isUploading}
                      >
                        {isUploading ? "Uploading..." : "Change Picture"}
                      </Button>
                      <p className="text-[9px] text-muted-foreground mt-1">Recommended: Square image, max 2MB</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Username</Label>
                    {isEditing ? (
                      <Input 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter username"
                        className="bg-background/50 border-border"
                      />
                    ) : (
                      <p className="text-foreground font-medium">{profile?.username || "Not set"}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                    <p className="text-foreground font-medium opacity-70">{user?.email || "N/A"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Bio</Label>
                    {isEditing ? (
                      <Textarea 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Tell us about yourself"
                        className="bg-background/50 border-border resize-none h-24"
                      />
                    ) : (
                      <p className="text-foreground text-sm leading-relaxed">{profile?.bio || "No bio set"}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Account ID</Label>
                    <p className="text-muted-foreground text-[10px] font-mono break-all">{user?.id}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Button 
                        className="flex-1" 
                        onClick={handleUpdateProfile}
                        disabled={isSaving || isUploading}
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          setUsername(profile?.username || "");
                          setBio(profile?.bio || "");
                          setAvatarUrl(profile?.avatar_url || null);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button 
                      variant="destructive" 
                      className="w-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white border-destructive/20"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="glass border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your profile and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProfile}
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProfileDialog;
