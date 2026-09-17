"use client";

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { api } from "./api";
import Cookies from "js-cookie";

type AuthState = {
  token: string | null;
  role: string | null;
  adminToken: string | null;
  loading: boolean;
  isDemo: boolean;
  expiredNotice: string | null;
  clearExpiredNotice: () => void;
  signInWithCode: (code: string) => Promise<void>;
  signInFree: () => Promise<void>;
  signInDemo: () => Promise<void>;
  setFullSession: (accessToken: string, role: string) => Promise<void>;
  signInAdmin: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const K_TOKEN = "turf_token";
const K_ROLE = "turf_role";
const K_ADMIN = "turf_admin_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expiredNotice, setExpiredNotice] = useState<string | null>(null);
  const clearExpiredNotice = useCallback(() => setExpiredNotice(null), []);

  useEffect(() => {
    const t = Cookies.get(K_TOKEN) || null;
    const r = Cookies.get(K_ROLE) || null;
    const at = Cookies.get(K_ADMIN) || null;
    setToken(t);
    setRole(r);
    setAdminToken(at);
    setLoading(false);
  }, []);

  const signInWithCode = useCallback(async (code: string) => {
    const res = await api.redeem(code);
    Cookies.set(K_TOKEN, res.access_token, { expires: 30 });
    Cookies.set(K_ROLE, res.role, { expires: 30 });
    setToken(res.access_token);
    setRole(res.role);
  }, []);

  const signInFree = useCallback(async () => {
    const res = await api.freeAccessLogin();
    Cookies.set(K_TOKEN, res.access_token, { expires: 1 });
    Cookies.set(K_ROLE, res.role, { expires: 1 });
    setToken(res.access_token);
    setRole(res.role);
  }, []);

  const signInDemo = useCallback(async () => {
    const res = await api.demoLogin();
    Cookies.set(K_TOKEN, res.access_token, { expires: 1 });
    Cookies.set(K_ROLE, res.role, { expires: 1 });
    setToken(res.access_token);
    setRole(res.role);
  }, []);

  const setFullSession = useCallback(async (accessToken: string, r: string) => {
    Cookies.set(K_TOKEN, accessToken, { expires: 30 });
    Cookies.set(K_ROLE, r, { expires: 30 });
    setToken(accessToken);
    setRole(r);
  }, []);

  const signInAdmin = useCallback(async (password: string) => {
    const res = await api.adminLogin(password);
    Cookies.set(K_ADMIN, res.access_token, { expires: 1 });
    setAdminToken(res.access_token);
    Cookies.set(K_TOKEN, res.access_token, { expires: 1 });
    Cookies.set(K_ROLE, res.role, { expires: 1 });
    setToken(res.access_token);
    setRole(res.role);
  }, []);

  const signOut = useCallback(async () => {
    Cookies.remove(K_TOKEN);
    Cookies.remove(K_ROLE);
    Cookies.remove(K_ADMIN);
    setToken(null);
    setRole(null);
    setAdminToken(null);
  }, []);

  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  // On Web we don't register push tokens or devices exactly like mobile,
  // but we keep the logic structure if needed.
  useEffect(() => {
    if (token && role !== "demo") {
      const registerDevice = async () => {
        try {
          const deviceId = localStorage.getItem("deviceId") || crypto.randomUUID();
          localStorage.setItem("deviceId", deviceId);
          await api.registerDevice({
            device_id: deviceId,
            platform: "web",
            os_version: navigator.userAgent,
            device_model: "Browser",
          }, token);
        } catch (e) {
          console.error("Device registration failed", e);
        }
      };
      registerDevice();
    }
  }, [token, role]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const check = async () => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        const deviceId = localStorage.getItem("deviceId") || "web";
        await api.validate(t, deviceId);
      } catch (e: any) {
        if (cancelled) return;
        if (e && e.status === 401) {
          setExpiredNotice(e.message || "Votre session a été fermée");
          await signOut();
        }
      }
    };
    check();
    const interval = setInterval(check, 10000);
    
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    
    const onAuthError = async (e: Event) => {
      const msg = (e as CustomEvent).detail;
      setExpiredNotice(msg || "Votre session a été fermée");
      await signOut();
    };
    window.addEventListener("auth-error", onAuthError);
    
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("auth-error", onAuthError);
    };
  }, [token, signOut]);

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        adminToken,
        loading,
        isDemo: role === "demo",
        expiredNotice,
        clearExpiredNotice,
        signInWithCode,
        signInFree,
        signInDemo,
        setFullSession,
        signInAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
