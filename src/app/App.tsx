
import { lazy, Suspense } from "react";
import * as Sentry from "@sentry/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import AppLayout from "@/components/layout/AppLayout";
import { queryClient } from "@/lib/query-client";

const Login = lazy(() => import("@/pages/Login"));
const Termos = lazy(() => import("@/pages/Termos"));
const Privacidade = lazy(() => import("@/pages/Privacidade"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Contracts = lazy(() => import("@/pages/Contracts"));
const Analysis = lazy(() => import("@/pages/Analysis"));
const Obligations = lazy(() => import("@/pages/Obligations"));
const Generator = lazy(() => import("@/pages/Generator"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Admin = lazy(() => import("@/pages/Admin"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">Algo deu errado. Recarregue a página.</p>}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/termos" element={<Termos />} />
                <Route path="/privacidade" element={<Privacidade />} />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/contracts" element={<Contracts />} />
                  <Route path="/analysis" element={<Analysis />} />
                  <Route path="/analysis/:id" element={<Analysis />} />
                  <Route path="/obligations" element={<Obligations />} />
                  <Route path="/generator" element={<Generator />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin" element={<Admin />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </Sentry.ErrorBoundary>
  );
}
