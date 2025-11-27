import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import MobileDashboard from "./pages/mobile/MobileDashboard";
import CalendarPage from "./pages/mobile/CalendarPage";
import NotesPage from "./pages/mobile/NotesPage";
import NoteDetailPage from "./pages/mobile/NoteDetailPage";
import TodosPage from "./pages/mobile/TodosPage";
import RssPage from "./pages/mobile/RssPage";
import SettingsPage from "./pages/mobile/SettingsPage";
import AuthService from "./services/AuthService";
import "./globals.css";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = AuthService.isAuthenticated();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

// Auto-redirect component based on device
const AutoRedirect = () => {
  const isMobile = useIsMobile();

  if (isMobile === undefined) {
    // Still detecting, show loading
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <Navigate to={isMobile ? "/mobile/notes" : "/desktop"} replace />;
};

const App = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (AuthService.getToken()) {
          await AuthService.checkTokenValidity();
        }
      } catch (error) {
        console.error("Error checking token validity:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="notes-theme">
        <TooltipProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Auto-redirect root to mobile or desktop */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AutoRedirect />
                  </ProtectedRoute>
                }
              />

              {/* Desktop route */}
              <Route
                path="/desktop"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />

              {/* Mobile routes */}
              <Route
                path="/mobile"
                element={
                  <ProtectedRoute>
                    <MobileDashboard />
                  </ProtectedRoute>
                }
              >
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="notes" element={<NotesPage />} />
                <Route path="notes/:id" element={<NoteDetailPage />} />
                <Route path="todos" element={<TodosPage />} />
                <Route path="rss" element={<RssPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;