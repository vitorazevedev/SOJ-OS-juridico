import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/features/auth/components/AuthProvider";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import StaffRoute from "@/features/auth/components/StaffRoute";
import Login from "@/pages/Login";
import Home from "@/pages/Home";
import MfaEnroll from "@/pages/MfaEnroll";
import MfaChallenge from "@/pages/MfaChallenge";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
                  <Home />
                </StaffRoute>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
