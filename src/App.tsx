import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ShopProvider } from "@/hooks/useShop";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";
import CalendarPage from "@/pages/CalendarPage";
import ClientsPage from "@/pages/ClientsPage";
import InventoryPage from "@/pages/InventoryPage";
import ReportsPage from "@/pages/ReportsPage";
import SettingsPage from "@/pages/SettingsPage";
import ServicesPage from "@/pages/ServicesPage";
import StaffPage from "@/pages/StaffPage";
import ExpensesPage from "@/pages/ExpensesPage";
import MyStatsPage from "@/pages/MyStatsPage";
import BookingWidget from "@/pages/BookingWidget";
import AuthPage from "@/pages/AuthPage";
import OnboardingPage from "@/pages/OnboardingPage";
// JoinPage removed - direct account creation replaces invitations
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ShopProvider>
            <Routes>
              {/* Public */}
              <Route path="/book/:slug" element={<BookingWidget />} />
              <Route path="/book" element={<BookingWidget />} />
              <Route path="/auth" element={<AuthPage />} />
              {/* /join/:code removed - direct account creation replaces invitations */}
              <Route path="/onboarding" element={<OnboardingPage />} />

              {/* Protected Dashboard */}
              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/" element={<CalendarPage />} />
                  <Route path="/clients" element={<ClientsPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/staff" element={<StaffPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/my-stats" element={<MyStatsPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ShopProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
