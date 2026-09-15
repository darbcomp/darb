/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  loginAdmin,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
} from "../api/authApi";

const AuthContext = createContext(null);

const isIdentityScopedQuery = (query) => {
  const root = query.queryKey?.[0];

  return (
    root === "checkout-preview" ||
    (typeof root === "string" &&
      (root.startsWith("my-") || root.startsWith("admin-")))
  );
};

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const identityRef = useRef(undefined);

  const commitUser = useCallback((nextUser) => {
    const normalizedUser = nextUser || null;
    const nextIdentity = normalizedUser
      ? `${normalizedUser.role || "user"}:${String(normalizedUser._id || "")}`
      : null;

    if (
      identityRef.current !== undefined &&
      identityRef.current !== nextIdentity
    ) {
      const filters = { predicate: isIdentityScopedQuery };

      // Cancellation prevents an old identity's in-flight request from
      // repopulating the cache after the boundary changes.
      queryClient.cancelQueries(filters);
      queryClient.removeQueries(filters);
    }

    identityRef.current = nextIdentity;
    setUser(normalizedUser);
  }, [queryClient]);

  const checkAuth = useCallback(async () => {
    try {
      const response = await getCurrentUser();
      commitUser(response?.data?.user || null);
    } catch {
      commitUser(null);
    } finally {
      setIsAuthLoading(false);
    }
  }, [commitUser]);

  useEffect(() => {
    // Authentication bootstrapping intentionally synchronizes remote session state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAuth();
  }, [checkAuth]);

  const customerLogin = useCallback(async (payload) => {
    const response = await loginCustomer(payload);
    commitUser(response?.data?.user || null);
    return response;
  }, [commitUser]);

  const customerRegister = useCallback(async (payload) => {
    const response = await registerCustomer(payload);
    commitUser(response?.data?.user || null);
    return response;
  }, [commitUser]);

  const adminLogin = useCallback(async (payload) => {
    const response = await loginAdmin(payload);
    commitUser(response?.data?.user || null);
    return response;
  }, [commitUser]);

  const logout = useCallback(async () => {
    await logoutCustomer();
    commitUser(null);
  }, [commitUser]);

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
    [
      user,
      isAuthLoading,
      customerLogin,
      customerRegister,
      adminLogin,
      logout,
      checkAuth,
    ]
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
