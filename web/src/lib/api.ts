const BASE = process.env.NODE_ENV === "production" ? "https://pro-racing-api-production.up.railway.app" : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000");

type Opts = {
  method?: string;
  body?: any;
  token?: string | null;
};

async function req(path: string, opts: Opts = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  
  if (!BASE) {
    console.error("NEXT_PUBLIC_BACKEND_URL is not defined");
  }

  const url = `${BASE || ''}/api${path}`;
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Erreur ${res.status}`;
    if (res.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("auth-error", { detail: msg }));
    }
    const err: any = new Error(typeof msg === "string" ? msg : "Erreur serveur");
    err.status = res.status;
    throw err;
  }
  
  return data;
}

export const api = {
  // Auth
  redeem: (code: string) => req("/auth/redeem", { method: "POST", body: { code } }),
  demoLogin: () => req("/auth/demo", { method: "POST" }),
  iapVerify: (productId: string, purchaseToken: string, token: string) =>
    req("/iap/google/verify", { method: "POST", body: { productId, purchaseToken }, token }),
  freeAccessStatus: () => req("/settings/free-access"),
  freeAccessLogin: () => req("/auth/free-access", { method: "POST" }),
  adminLogin: (password: string) =>
    req("/admin/login", { method: "POST", body: { password } }),
  validate: (token: string, deviceId?: string) =>
    req(`/auth/validate${deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : ""}`, { token }),
  me: (token: string) => req("/auth/me", { token }),
  setFreeAccess: (enabled: boolean, hours: number | null, token: string) =>
    req("/admin/free-access", { method: "POST", body: { enabled, hours }, token }),
  getLoginConfig: () => req("/auth/login-config"),
  setLoginConfig: (cfg: { payment_link: string; whatsapp_link?: string; show_demo_button: boolean }, token: string) =>
    req("/admin/login-config", { method: "POST", body: cfg, token }),

  // PMU
  programme: (date: string, token: string) => req(`/pmu/programme/${date}`, { token }),
  participants: (date: string, r: number, c: number, token: string) =>
    req(`/pmu/course/${date}/${r}/${c}/participants`, { token }),
  pronostic: (date: string, r: number, c: number, token: string) =>
    req(`/pmu/pronostic/${date}/${r}/${c}`, { token }),
  pronosticDemo: (date: string, r: number, c: number, token: string) =>
    req(`/pmu/pronostic-demo/${date}/${r}/${c}`, { token }),
  cotesAnalysis: (date: string, r: number, c: number, token: string) =>
    req(`/pmu/cotes-analysis/${date}/${r}/${c}`, { token }),
  cotesDemo: (date: string, r: number, c: number, token: string) =>
    req(`/pmu/cotes-demo/${date}/${r}/${c}`, { token }),
  rapports: (date: string, r: number, c: number, token: string) =>
    req(`/pmu/course/${date}/${r}/${c}/rapports`, { token }),
  performance: (token: string) => req(`/performance`, { token }),
  getPerfConfig: (token: string) => req("/admin/perf-config", { token }),
  setPerfConfig: (days: number, token: string) =>
    req("/admin/perf-config", { method: "POST", body: { days }, token }),

  // Admin codes
  listCodes: (token: string) => req("/admin/access-codes", { token }),
  listDevices: (token: string) => req("/admin/devices", { token }),
  blockDevice: (id: string, token: string) =>
    req(`/admin/devices/${id}/block`, { method: "POST", token }),
  unblockDevice: (id: string, token: string) =>
    req(`/admin/devices/${id}/unblock`, { method: "POST", token }),
  getShareConfig: (token: string) => req("/admin/share-config", { token }),
  setShareConfig: (threshold: number, token: string) =>
    req("/admin/share-config", { method: "POST", body: { threshold }, token }),
  getAnalysisConfig: (token: string) => req("/admin/analysis-config", { token }),
  setAnalysisConfig: (
    cfg: { favoriMax: number; outsiderMax: number; baisseSeuil: number; scoreMinJouer: number },
    token: string
  ) => req("/admin/analysis-config", { method: "POST", body: cfg, token }),
  sharingAlerts: (token: string) => req("/admin/sharing-alerts", { token }),
  blockCodeDevices: (code: string, token: string) =>
    req(`/admin/codes/${code}/block-devices`, { method: "POST", token }),
  registerDevice: (info: any, token: string) =>
    req("/devices/register", { method: "POST", body: info, token }),
  registerPush: (userId: string, platform: string, deviceToken: string) =>
    req("/register-push", { method: "POST", body: { user_id: userId, platform, device_token: deviceToken } }),
  createCode: (
    label: string | null,
    maxUses: number | null,
    expiresDays: number | null,
    expiresAt: string | null,
    token: string
  ) =>
    req("/admin/access-codes", {
      method: "POST",
      body: { label, max_uses: maxUses, expires_days: expiresDays, expires_at: expiresAt },
      token,
    }),
  revokeCode: (id: string, token: string) =>
    req(`/admin/access-codes/${id}/revoke`, { method: "POST", token }),
  activateCode: (id: string, token: string) =>
    req(`/admin/access-codes/${id}/activate`, { method: "POST", token }),
  deleteCode: (id: string, token: string) =>
    req(`/admin/access-codes/${id}`, { method: "DELETE", token }),
  getAuditLogs: (token: string, days: number = 7) =>
    req(`/admin/audit-logs?days=${days}`, { token }),
};
