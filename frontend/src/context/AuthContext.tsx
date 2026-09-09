"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearSession, getSession, saveSession } from "@/lib/api";
import { requestPushToken } from "@/lib/firebase";

export type Role = "farmer" | "buyer" | "logistics" | "admin";

type AuthState = {
  token: string | null;
  role: Role | null;
  userId: string | null;
  loading: boolean;
};

type LoginPayload = { email: string; password: string };

type RegisterPayload = {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role: Role;
  village?: string;
  district?: string;
  state?: string;
  lat: number;
  lng: number;
  business_name?: string;
  buyer_type?: string;
  company_name?: string;
};

type AuthContextValue = AuthState & {
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type TokenResponse = { access_token: string; role: Role; user_id: string };

const DASHBOARD_PATH: Record<Role, string> = {
  farmer: "/farmer",
  buyer: "/buyer",
  logistics: "/logistics",
  admin: "/admin",
};

export function dashboardPathForRole(role: Role) {
  return DASHBOARD_PATH[role];
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    role: null,
    userId: null,
    loading: true,
  });
  const router = useRouter();
  const pushRegisteredForToken = useRef<string | null>(null);

  useEffect(() => {
    const session = getSession();
    if (session) {
      setState({
        token: session.token,
        role: session.role as Role,
        userId: session.userId,
        loading: false,
      });
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  // Best-effort: ask for notification permission and register the device
  // token once per session. Silently does nothing if the browser doesn't
  // support it, permission is denied, or Firebase isn't configured.
  useEffect(() => {
    if (!state.token || pushRegisteredForToken.current === state.token) return;
    pushRegisteredForToken.current = state.token;

    requestPushToken().then((deviceToken) => {
      if (deviceToken) {
        api.post("/notifications/register-token", { token: deviceToken }).catch(() => {});
      }
    });
  }, [state.token]);

  async function login(payload: LoginPayload) {
    const res = await api.post<TokenResponse>("/auth/login", payload);
    saveSession(res.access_token, res.role, res.user_id);
    setState({ token: res.access_token, role: res.role, userId: res.user_id, loading: false });
    router.push(dashboardPathForRole(res.role));
  }

  async function register(payload: RegisterPayload) {
    const res = await api.post<TokenResponse>("/auth/register", payload);
    saveSession(res.access_token, res.role, res.user_id);
    setState({ token: res.access_token, role: res.role, userId: res.user_id, loading: false });
    router.push(dashboardPathForRole(res.role));
  }

  function logout() {
    clearSession();
    setState({ token: null, role: null, userId: null, loading: false });
    router.push("/signin");
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
