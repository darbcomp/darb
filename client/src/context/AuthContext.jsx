/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  getCurrentUser,
  loginAdmin,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
} from "../api/authApi";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await getCurrentUser();
      setUser(response?.data?.user || null);
    } catch {
      setUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    // Authentication bootstrapping intentionally synchronizes remote session state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
  }, []);

  const customerLogin = async (payload) => {
    const response = await loginCustomer(payload);
    setUser(response?.data?.user || null);
    return response;
  };

  const customerRegister = async (payload) => {
    const response = await registerCustomer(payload);
    setUser(response?.data?.user || null);
    return response;
  };

  const adminLogin = async (payload) => {
    const response = await loginAdmin(payload);
    setUser(response?.data?.user || null);
    return response;
  };

  const logout = async () => {
    try {
      await logoutCustomer();
    } catch {
      // Even if backend logout fails, clear frontend auth state.
    } finally {
      setUser(null);
    }
  };

  const value = useMemo(
    () => ({
      user,
      isAuthLoading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      customerLogin,
      customerRegister,
      adminLogin,
      logout,
      refreshUser: checkAuth,
    }),
    [user, isAuthLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
