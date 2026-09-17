import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { AppState } from "react-native";
import { storage } from "@/src/utils/storage";
import { api } from "@/src/api";
import { registerDevice, registerPush, getDeviceId } from "@/src/device";

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
    (async () => {
      const t = await storage.secureGet<string | null>(K_TOKEN, null);
      const r = await storage.secureGet<string | null>(K_ROLE, null);
      const at = await storage.secureGet<string | null>(K_ADMIN, null);
      setToken(t);
      setRole(r);
      setAdminToken(at);
      setLoading(false);
    })();
  }, []);

  const signInWithCode = useCallback(async (code: string) => {
    const res = await api.redeem(code);
    await storage.secureSet(K_TOKEN, res.access_token);
    await storage.secureSet(K_ROLE, res.role);
    setToken(res.access_token);
    setRole(res.role);
  }, []);

  const signInFree = useCallback(async () => {
    const res = await api.freeAccessLogin();
    await storage.secureSet(K_TOKEN, res.access_token);
    await storage.secureSet(K_ROLE, res.role);
    setToken(res.access_token);
    setRole(res.role);
  }, []);

  const signInDemo = useCallback(async () => {
    const res = await api.demoLogin();
    await storage.secureSet(K_TOKEN, res.access_token);
    await storage.secureSet(K_ROLE, res.role);
    setToken(res.access_token);
    setRole(res.role);
  }, []);

  const setFullSession = useCallback(async (accessToken: string, r: string) => {
    await storage.secureSet(K_TOKEN, accessToken);
    await storage.secureSet(K_ROLE, r);
    setToken(accessToken);
    setRole(r);
  }, []);

  const signInAdmin = useCallback(async (password: string) => {
    const res = await api.adminLogin(password);
    await storage.secureSet(K_ADMIN, res.access_token);
    setAdminToken(res.access_token);
  }, []);

  const signOut = useCallback(async () => {
    await storage.secureRemove(K_TOKEN);
    await storage.secureRemove(K_ROLE);
    await storage.secureRemove(K_ADMIN);
    setToken(null);
    setRole(null);
    setAdminToken(null);
  }, []);

  // Auto-logout when the access code expires or is revoked.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  // Enregistre l'appareil dès qu'une session utilisateur est active (sauf mode démo).
  useEffect(() => {
    if (token && role !== "demo") {
      registerDevice(token);
      registerPush();
    }
  }, [token, role]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const check = async () => {
      const t = tokenRef.current;
      if (!t) return;
      try {
        const id = await getDeviceId();
        await api.validate(t, id);
      } catch (e: any) {
        if (cancelled) return;
        // Déconnexion à distance : code expiré/révoqué ou appareil bloqué (401).
        if (e && e.status === 401) {
          setExpiredNotice(e.message || "Votre session a été fermée");
          await signOut();
        }
      }
    };
    check();
    const interval = setInterval(check, 60000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") check();
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      sub.remove();
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


################################################################################
