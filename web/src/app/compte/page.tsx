"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

import {
  AnalysisCfg,
  AnalysisConfig,
  SharingAlerts,
  DeviceList,
  PerfConfig,
  FreeAccess,
  CodeGenerator,
  CodeList,
} from "@/components/admin/AdminComponents";

export default function Compte() {
  const router = useRouter();
  const { role, token, adminToken, signInAdmin, signOut } = useAuth();

  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const [codes, setCodes] = useState<any[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [myExpiry, setMyExpiry] = useState<string | null>(null);

  const [freeState, setFreeState] = useState<{ active: boolean; expires_at: string | null }>({
    active: false,
    expires_at: null,
  });
  const [freeBusy, setFreeBusy] = useState(false);

  const [perfDays, setPerfDays] = useState<number | null>(null);
  const [perfBusy, setPerfBusy] = useState(false);

  const [devices, setDevices] = useState<any[]>([]);
  const [deviceStats, setDeviceStats] = useState<{ count: number; android: number; ios: number; web?: number }>({
    count: 0,
    android: 0,
    ios: 0,
    web: 0,
  });

  const [alerts, setAlerts] = useState<any[]>([]);
  const [shareThreshold, setShareThreshold] = useState<number | null>(null);

  const [analysisCfg, setAnalysisCfg] = useState<AnalysisCfg | null>(null);
  const [cfgBusy, setCfgBusy] = useState(false);

  const loadMe = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.me(token);
      setMyExpiry(res.expires_at || null);
    } catch {
      /* ignore */
    }
  }, [token]);

  const loadPerfConfig = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.getPerfConfig(adminToken);
      setPerfDays(res.days);
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadDevices = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.listDevices(adminToken);
      setDevices(res.devices || []);
      setDeviceStats({ count: res.count || 0, android: res.android || 0, ios: res.ios || 0, web: res.web || 0 });
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadAlerts = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.sharingAlerts(adminToken);
      setAlerts(res.alerts || []);
      setShareThreshold(res.threshold);
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadAnalysisCfg = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.getAnalysisConfig(adminToken);
      setAnalysisCfg(res);
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadFree = useCallback(async () => {
    try {
      const st = await api.freeAccessStatus();
      setFreeState({ active: !!st.active, expires_at: st.expires_at || null });
    } catch {
      /* ignore */
    }
  }, []);

  const loadCodes = useCallback(async () => {
    if (!adminToken) return;
    setCodesLoading(true);
    try {
      const res = await api.listCodes(adminToken);
      setCodes(res || []);
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setCodesLoading(false);
    }
  }, [adminToken]);

  useEffect(() => {
    loadFree();
    loadMe();
  }, [loadFree, loadMe]);

  useEffect(() => {
    if (adminToken) {
      loadCodes();
      loadFree();
      loadPerfConfig();
      loadDevices();
      loadAlerts();
      loadAnalysisCfg();
    }
  }, [adminToken, loadCodes, loadFree, loadPerfConfig, loadDevices, loadAlerts, loadAnalysisCfg]);

  const stepCfg = (key: keyof AnalysisCfg, delta: number, min: number, max: number) => {
    setAnalysisCfg((c) => (c ? { ...c, [key]: Math.min(max, Math.max(min, +(c[key] + delta).toFixed(1))) } : c));
  };

  const saveAnalysisCfg = async () => {
    if (!adminToken || !analysisCfg) return;
    setCfgBusy(true);
    setActionErr(null);
    try {
      const res = await api.setAnalysisConfig(analysisCfg, adminToken);
      setAnalysisCfg(res);
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setCfgBusy(false);
    }
  };

  const updateThreshold = async (t: number) => {
    if (!adminToken) return;
    try {
      const res = await api.setShareConfig(t, adminToken);
      setShareThreshold(res.threshold);
      await loadAlerts();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const blockCodeDevices = async (code: string) => {
    if (!adminToken) return;
    try {
      await api.blockCodeDevices(code, adminToken);
      await loadDevices();
      await loadAlerts();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const updatePerf = async (days: number) => {
    if (!adminToken) return;
    setPerfBusy(true);
    setActionErr(null);
    try {
      const res = await api.setPerfConfig(days, adminToken);
      setPerfDays(res.days);
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setPerfBusy(false);
    }
  };

  const updateFree = async (enabled: boolean, hours: number | null) => {
    if (!adminToken) return;
    setFreeBusy(true);
    setActionErr(null);
    try {
      const st = await api.setFreeAccess(enabled, hours, adminToken);
      setFreeState({ active: !!st.active, expires_at: st.expires_at || null });
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setFreeBusy(false);
    }
  };

  const doLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password.trim()) return;
    setLoginLoading(true);
    setLoginErr(null);
    try {
      await signInAdmin(password);
      setPassword("");
    } catch (e: any) {
      setLoginErr(e.message || "Échec de connexion");
    } finally {
      setLoginLoading(false);
    }
  };

  const createCode = async (
    label: string | null,
    expiresDays: number | null,
    expiresAt: string | null
  ): Promise<boolean> => {
    if (!adminToken) return false;
    setCreating(true);
    setActionErr(null);
    try {
      await api.createCode(label, null, expiresDays, expiresAt, adminToken);
      await loadCodes();
      return true;
    } catch (e: any) {
      setActionErr(e.message);
      return false;
    } finally {
      setCreating(false);
    }
  };

  const toggle = async (item: any) => {
    if (!adminToken) return;
    try {
      if (item.active) await api.revokeCode(item.id, adminToken);
      else await api.activateCode(item.id, adminToken);
      await loadCodes();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const toggleDevice = async (dv: any) => {
    if (!adminToken) return;
    try {
      if (dv.blocked) await api.unblockDevice(dv.deviceId, adminToken);
      else await api.blockDevice(dv.deviceId, adminToken);
      await loadDevices();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F2F2F7]">
      <div className="bg-[#1C1C1E] pt-8 pb-4 shadow-md sticky top-0 z-20">
        <h1 className="text-3xl font-extrabold text-white px-5">Compte</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-5 pb-24">
        {/* Session active */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8 flex flex-row items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center shrink-0">
            <User size={24} className="text-[#10B981]" />
          </div>
          <div className="flex-1 flex flex-col">
            <span className="text-lg font-extrabold text-gray-900">Session active</span>
            <span className="text-sm font-bold text-gray-500">Accès {role === "admin" ? "administrateur" : "utilisateur"}</span>
            <span className="text-xs text-gray-400 mt-1">
              {myExpiry
                ? `Votre accès expire le ${new Date(myExpiry).toLocaleDateString("fr-FR")}`
                : role === "admin"
                ? ""
                : "Accès sans expiration"}
            </span>
          </div>
        </div>

        {/* ADMIN */}
        <h2 className="text-sm font-extrabold text-gray-400 mb-4 tracking-wider">ADMINISTRATION</h2>

        {!adminToken ? (
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <h3 className="text-lg font-extrabold text-gray-900 mb-1">Connexion administrateur</h3>
            <p className="text-sm text-gray-500 mb-4">Entrez le mot de passe administrateur pour continuer.</p>
            
            <form onSubmit={doLogin} className="flex flex-col gap-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-base text-gray-900 outline-none focus:border-[#10B981] transition-colors"
              />
              {loginErr && <p className="text-red-500 text-sm font-semibold">{loginErr}</p>}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-[#10B981] hover:bg-green-600 text-white font-bold py-3 rounded-lg transition-colors mt-2 disabled:opacity-50"
              >
                {loginLoading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </div>
        ) : (
          <>
            <AnalysisConfig cfg={analysisCfg} busy={cfgBusy} onStep={stepCfg} onSave={saveAnalysisCfg} />
            
            <SharingAlerts
              threshold={shareThreshold}
              alerts={alerts}
              onUpdateThreshold={updateThreshold}
              onBlockCodeDevices={blockCodeDevices}
              onRevokeCode={(codeId) => toggle({ id: codeId, active: true })}
            />

            <DeviceList stats={deviceStats} devices={devices} onToggleDevice={toggleDevice} />

            <PerfConfig perfDays={perfDays} busy={perfBusy} onUpdate={updatePerf} />

            <FreeAccess state={freeState} busy={freeBusy} onUpdate={updateFree} />

            <CodeGenerator creating={creating} onCreate={createCode} />

            {actionErr && <p className="text-red-500 text-sm font-semibold mb-4 px-2">{actionErr}</p>}

            <CodeList codes={codes} loading={codesLoading} onToggle={toggle} />
          </>
        )}

        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full mt-6 bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-xl transition-colors"
        >
          <LogOut size={20} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}
