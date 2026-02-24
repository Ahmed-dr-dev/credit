"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export type Role = "admin" | "agent" | "client" | null;

type AuthState = {
  id: string | null;
  email: string | null;
  role: Role;
  isAuthenticated: boolean;
  loading: boolean;
};

type AuthContextType = AuthState & {
  signIn: (email: string, password: string, role: Role) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    id: null,
    email: null,
    role: null,
    isAuthenticated: false,
    loading: true,
  });

  const refreshSession = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/session", { credentials: "include" });
      const data = await r.json();
      if (data.user) {
        setState({
          id: data.user.id,
          email: data.user.email,
          role: data.user.role,
          isAuthenticated: true,
          loading: false,
        });
      } else {
        setState({ id: null, email: null, role: null, isAuthenticated: false, loading: false });
      }
    } catch {
      setState({ id: null, email: null, role: null, isAuthenticated: false, loading: false });
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signIn = useCallback(async (email: string, password: string, _role: Role) => {
    const r = await fetch("/api/auth/signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Erreur de connexion");
    setState({
      id: data.id,
      email: data.email,
      role: data.role,
      isAuthenticated: true,
      loading: false,
    });
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/signout", { method: "POST", credentials: "include" });
    setState({ id: null, email: null, role: null, isAuthenticated: false, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signIn, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
