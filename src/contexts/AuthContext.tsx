import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: string | null;
  loading: boolean;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const authChannel = typeof window !== "undefined" && "BroadcastChannel" in window 
  ? new BroadcastChannel("auth_channel") 
  : null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const initializing = React.useRef(false);

  const fetchUserRole = React.useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("id", userId) 
        .maybeSingle();
      
      let newRole = "user";
      if (error) {
        console.error("Error fetching user role:", error);
      } else if (data) {
        newRole = data.role;
      }

      setRole((prev) => prev !== newRole ? newRole : prev);
    } catch (err) {
      console.error("Exception in fetchUserRole:", err);
      setRole((prev) => prev !== "user" ? "user" : prev);
    }
  }, []);

  const initializeAuth = React.useCallback(async () => {
    if (initializing.current) return;
    initializing.current = true;
    
    try {
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchUserRole(currentSession.user.id);
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
      }
    } catch (err) {
      console.error("Error syncing auth:", err);
    } finally {
      setLoading(false);
      initializing.current = false;
    }
  }, [fetchUserRole]);

  const refreshRole = React.useCallback(async () => {
    if (user) {
      await fetchUserRole(user.id);
    }
  }, [user, fetchUserRole]);

  const signOut = async (broadcast = true) => {
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setRole(null);
      
      if (broadcast) {
        authChannel?.postMessage("logout");
        localStorage.setItem("auth-event", `logout-${Date.now()}`);
      }
    } catch (err) {
      console.error("Error during signOut:", err);
    }
  };

  useEffect(() => {
    const handleAuthEvent = (type: string) => {
      if (type === "logout") {
        setSession(null);
        setUser(null);
        setRole(null);
        supabase.auth.signOut({ scope: 'local' });
      } else if (type === "login") {
        initializeAuth();
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.data === "string") {
        handleAuthEvent(event.data);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      // Cross-tab logout detection via standard Supabase storage key
      if (event.key?.includes('auth-token') && !event.newValue) {
        console.log("Session cleared in another tab, signing out...");
        setSession(null);
        setUser(null);
        setRole(null);
        queryClient.clear();
      }
      
      // Fallback for our custom broadcast channel
      if (event.key === "auth-event" && event.newValue) {
        if (event.newValue.startsWith("logout")) handleAuthEvent("logout");
        if (event.newValue.startsWith("login")) handleAuthEvent("login");
      }
    };

    authChannel?.addEventListener("message", handleMessage);
    window.addEventListener("storage", handleStorage);
    
    return () => {
      authChannel?.removeEventListener("message", handleMessage);
      window.removeEventListener("storage", handleStorage);
    };
  }, [queryClient, initializeAuth]);

  useEffect(() => {
    let mounted = true;

    initializeAuth();

    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        
        console.log("Auth event:", event);
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setRole(null);
          queryClient.clear();
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(currentSession);
          setUser(currentSession?.user ?? null);
          if (currentSession?.user) {
            await fetchUserRole(currentSession.user.id);
          }
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient, initializeAuth, fetchUserRole]);

  useEffect(() => {
    if (!user) return;

    const authChanges = supabase
      .channel('public:auth_and_support')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles', filter: `id=eq.${user.id}` },
        (payload) => {
          if (payload.new && (payload.new as any).role) {
            const newRole = (payload.new as any).role;
            if (newRole !== role) {
              setRole(newRole);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
          toast({
            title: "Ticket Updated",
            description: `Your ticket "${(payload.new as any).subject}" is now ${(payload.new as any).status.replace("_", " ")}.`,
          });
        }
      )
      .subscribe();

    return () => {
      authChanges.unsubscribe();
    };
  }, [user, user?.id, role, queryClient, toast]);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          // Robust recovery: Re-sync session from storage without full invalidation flood
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
            // Proactively check for Realtime connection health
            supabase.getChannels().forEach(channel => {
              if (channel.state === 'closed' || channel.state === 'errored') {
                channel.subscribe();
              }
            });
          }
        } catch (err) {
          console.error("Focus recovery error:", err);
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const signUp = async (email: string, password: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username: username || email.split("@")[0],
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data.session) {
      authChannel?.postMessage("login");
      localStorage.setItem("auth-event", `login-${Date.now()}`);
    }
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signUp, signIn, signOut: () => signOut(true), refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
