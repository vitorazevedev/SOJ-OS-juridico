import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import StaffRoute from "@/features/auth/components/StaffRoute";
import RequireRole from "@/features/auth/components/RequireRole";
import ManagerLayout from "@/components/layout/ManagerLayout";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import Equipe from "@/pages/Equipe";
import Dev from "@/pages/Dev";
import Financeiro from "@/pages/Financeiro";
import Cupons from "@/pages/Cupons";
import MfaEnroll from "@/pages/MfaEnroll";
import MfaChallenge from "@/pages/MfaChallenge";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          theme="dark"
          className="toaster group"
          toastOptions={{
            classNames: {
              toast:
                "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
              description: "group-[.toast]:text-muted-foreground",
              actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
              cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/mfa/enroll"
            element={
              <ProtectedRoute>
                <MfaEnroll />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mfa/challenge"
            element={
              <ProtectedRoute>
                <MfaChallenge />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <ManagerLayout>
                    <Home />
                  </ManagerLayout>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/equipe"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <RequireRole role="equipe">
                    <ManagerLayout>
                      <Equipe />
                    </ManagerLayout>
                  </RequireRole>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dev"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <RequireRole role="dev">
                    <ManagerLayout>
                      <Dev />
                    </ManagerLayout>
                  </RequireRole>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/financeiro"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <RequireRole role={["financeiro", "owner"]}>
                    <ManagerLayout>
                      <Financeiro />
                    </ManagerLayout>
                  </RequireRole>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/cupons"
            element={
              <ProtectedRoute>
                <StaffRoute>
                  <RequireRole role={["financeiro", "owner", "equipe"]}>
                    <ManagerLayout>
                      <Cupons />
                    </ManagerLayout>
                  </RequireRole>
                </StaffRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
