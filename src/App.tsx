import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Marketplace from "./pages/Marketplace";
import Games from "./pages/Games";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Staff from "./pages/Staff";
import Database from "./pages/Database";
import Support from "./pages/Support";
import Legal from "./pages/Legal";
import OrderHistory from "./pages/OrderHistory";
import Favorites from "./pages/Favorites";
import News from "./pages/News";
import PostDetail from "./pages/PostDetail";
import WritePost from "./pages/WritePost";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // Data stays fresh for 1 minute
      gcTime: 5 * 60 * 1000, // Cache persists for 5 minutes
      refetchOnWindowFocus: true, // Wake up connection on return
      refetchOnReconnect: true,   // Auto-heal on network blips
      retry: 1, 
    },
  },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

const ManagementRoute = ({ children, requiredRole = "staff" }: { children: React.ReactNode, requiredRole?: "staff" | "admin" | "owner" }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const isStaff = role === "owner" || role === "admin" || role === "staff";
  const isAdmin = role === "owner" || role === "admin";
  const isOwner = role === "owner";

  const hasAccess = 
    (requiredRole === "staff" && isStaff) ||
    (requiredRole === "admin" && isAdmin) ||
    (requiredRole === "owner" && isOwner);

  if (!hasAccess) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Marketplace />} />
      <Route path="/games" element={<Games />} />
      <Route path="/news" element={<News />} />
      <Route path="/news/:id" element={<PostDetail />} />
      <Route path="/write" element={<ProtectedRoute><WritePost /></ProtectedRoute>} />
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/database" element={<ManagementRoute requiredRole="admin"><Database /></ManagementRoute>} />
      <Route path="/staff" element={<ManagementRoute requiredRole="staff"><Staff /></ManagementRoute>} />
      <Route path="/orders" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/favorites" element={<Favorites />} />
      <Route path="/support" element={<Support />} />
      <Route path="/legal" element={<Legal />} />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
