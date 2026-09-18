"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

import {
  AnalysisCfg,
  AnalysisConfig,
  DeviceList,
  PerfConfig,
  AccessCodesManager,
} from "@/components/admin/AdminComponents";

export default function Compte() {
  const router = useRouter();
  const { role, token, adminToken, signInAdmin, signOut } = useAuth();

  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErr, setLoginErr] = useState<string | null>(null);

  const [actionErr, setActionErr] = useState<string | null>(null);
  const [myExpiry, setMyExpiry] = useState<string | null>(null);

  const [perfDays, setPerfDays] = useState<number | null>(null);
  const [perfBusy, setPerfBusy] = useState(false);

  const [devices, setDevices] = useState<any[]>([]);
  const [deviceStats, setDeviceStats] = useState<{ count: number; android: number; ios: number; web?: number }>({
    count: 0,
    android: 0,
    ios: 0,
    web: 0,
  });

  const [analysisCfg, setAnalysisCfg] = useState<AnalysisCfg | null>(null);
  const [cfgBusy, setCfgBusy] = useState(false);

  const [codes, setCodes] = useState<any[]>([]);
  const [codesBusy, setCodesBusy] = useState(false);

  const [freeAccess, setFreeAccess] = useState<{active: boolean; expires_at: string | null} | null>(null);
  const [freeAccessBusy, setFreeAccessBusy] = useState(false);

  const [loginConfig, setLoginConfig] = useState<{payment_link: string; whatsapp_link?: string; show_demo_button: boolean} | null>(null);
  const [loginConfigBusy, setLoginConfigBusy] = useState(false);

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

  const loadAnalysisCfg = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.getAnalysisConfig(adminToken);
      setAnalysisCfg(res);
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadCodes = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.listCodes(adminToken);
      setCodes(Array.isArray(res) ? res : []);
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  const loadFreeAccess = useCallback(async () => {
    try {
      const res = await api.freeAccessStatus();
      setFreeAccess(res);
    } catch {
      /* ignore */
    }
  }, []);

  const loadLoginConfig = useCallback(async () => {
    if (!adminToken) return;
    try {
      const res = await api.getLoginConfig();
      setLoginConfig(res);
    } catch {
      /* ignore */
    }
  }, [adminToken]);

  useEffect(() => {
    loadMe();
    loadFreeAccess();
  }, [loadMe, loadFreeAccess]);

  useEffect(() => {
    if (adminToken) {
      loadPerfConfig();
      loadDevices();
      loadAnalysisCfg();
      loadCodes();
      loadLoginConfig();
    }
  }, [adminToken, loadPerfConfig, loadDevices, loadAnalysisCfg, loadCodes, loadLoginConfig]);

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

  const createCode = async (dateStr: string) => {
    if (!adminToken) return;
    setCodesBusy(true);
    setActionErr(null);
    try {
      await api.createCode(null, null, null, dateStr, adminToken);
      await loadCodes();
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setCodesBusy(false);
    }
  };

  const revokeCode = async (id: string) => {
    if (!adminToken) return;
    setActionErr(null);
    try {
      await api.revokeCode(id, adminToken);
      await loadCodes();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const activateCode = async (id: string) => {
    if (!adminToken) return;
    setActionErr(null);
    try {
      await api.activateCode(id, adminToken);
      await loadCodes();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const deleteCode = async (id: string) => {
    if (!adminToken) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce code définitivement ?")) return;
    setActionErr(null);
    try {
      await api.deleteCode(id, adminToken);
      await loadCodes();
    } catch (e: any) {
      setActionErr(e.message);
    }
  };

  const toggleFreeAccess = async () => {
    if (!adminToken) return;
    setFreeAccessBusy(true);
    setActionErr(null);
    try {
      await api.setFreeAccess(!freeAccess?.active, null, adminToken);
      await loadFreeAccess();
    } catch (e: any) {
      setActionErr(e.message);
    } finally {
      setFreeAccessBusy(false);
    }
  };

  const updateLoginConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken || !loginConfig) return;
    setLoginConfigBusy(true);
    setActionErr(null);
    try {
      const res = await api.setLoginConfig(loginConfig, adminToken);
      setLoginConfig(res);
    } catch (err: any) {
      setActionErr(err.message);
    } finally {
      setLoginConfigBusy(false);
    }
  };

  const toggleDemoButton = async () => {
    if (!adminToken) return;
    const currentCfg = loginConfig || { payment_link: "", whatsapp_link: "", show_demo_button: true };
    const updatedCfg = { ...currentCfg, show_demo_button: !currentCfg.show_demo_button };
    setLoginConfigBusy(true);
    setActionErr(null);
    try {
      const res = await api.setLoginConfig(updatedCfg, adminToken);
      setLoginConfig(res);
    } catch (err: any) {
      setActionErr(err.message);
    } finally {
      setLoginConfigBusy(false);
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
              {loginErr && (
                <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-3 text-sm font-semibold flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{loginErr}</span>
                </div>
              )}
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
            <div className="bg-gradient-to-br from-[#10B981] to-[#047857] rounded-xl p-6 mb-8 text-white shadow-[0_4px_20px_rgba(16,185,129,0.2)]">
              <h3 className="text-2xl font-black mb-2 flex items-center gap-2">
                Bienvenue, Administrateur <span className="text-xl">👑</span>
              </h3>
              <p className="text-green-50 text-sm font-medium leading-relaxed">
                Vous êtes sur votre espace de contrôle. Générez des codes d'accès, ajustez l'IA ou activez le mode démo en un clin d'œil.
              </p>
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Mode Démo & Bouton Connexion</h3>
              <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-base">Accès public gratuit</h4>
                    <p className="text-sm text-gray-500 mt-1 flex flex-col">
                      <span>{freeAccess?.active ? "Le mode démo est actuellement activé." : "Le mode démo est désactivé."}</span>
                      {freeAccess?.active && (
                        <span className="font-bold text-[#10B981]">
                          Date d'expiration : {freeAccess.expires_at ? new Date(freeAccess.expires_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "Illimité"}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    disabled={freeAccessBusy}
                    onClick={toggleFreeAccess}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${freeAccess?.active ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-[#10B981] text-white hover:bg-green-600"} ${freeAccessBusy ? "opacity-50" : ""}`}
                  >
                    {freeAccess?.active ? "Désactiver" : "Activer"}
                  </button>
                </div>

                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-base">Bouton « Mode Démo » (Page Connexion)</h4>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {loginConfig?.show_demo_button ?? true
                        ? "Le bouton 'Essayer en mode démo' est actuellement visible."
                        : "Le bouton 'Essayer en mode démo' est actuellement masqué."}
                    </p>
                  </div>
                  <button
                    disabled={loginConfigBusy}
                    onClick={toggleDemoButton}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 ${
                      (loginConfig?.show_demo_button ?? true)
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        : "bg-green-50 text-[#10B981] hover:bg-green-100 border border-green-200"
                    } ${loginConfigBusy ? "opacity-50" : ""}`}
                  >
                    {(loginConfig?.show_demo_button ?? true) ? (
                      <>
                        <EyeOff size={16} />
                        Masquer le bouton démo
                      </>
                    ) : (
                      <>
                        <Eye size={16} />
                        Afficher le bouton démo
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {loginConfig && (
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Page de connexion</h3>
                <form onSubmit={updateLoginConfig} className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-4">
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm mb-2">Lien de paiement (S'abonner)</h4>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={loginConfig.payment_link}
                      onChange={(e) => setLoginConfig({ ...loginConfig, payment_link: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#10B981]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Laissez vide pour masquer le bouton "S'abonner".</p>
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm mb-2">Lien WhatsApp</h4>
                    <input
                      type="url"
                      placeholder="https://chat.whatsapp.com/..."
                      value={loginConfig.whatsapp_link || ""}
                      onChange={(e) => setLoginConfig({ ...loginConfig, whatsapp_link: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#10B981]"
                    />
                    <p className="text-xs text-gray-400 mt-1">Laissez vide pour masquer le bouton WhatsApp.</p>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-sm">Bouton "Mode Démo"</h4>
                      <p className="text-xs text-gray-400 mt-0.5">Afficher le bouton "Essayer en mode démo" sur la page de connexion.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={loginConfig.show_demo_button}
                        onChange={(e) => setLoginConfig({ ...loginConfig, show_demo_button: e.target.checked })}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
                    </label>
                  </div>
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loginConfigBusy}
                      className="bg-[#10B981] hover:bg-green-600 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                    >
                      {loginConfigBusy ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            <AccessCodesManager codes={codes} busy={codesBusy} onCreate={createCode} onRevoke={revokeCode} onActivate={activateCode} onDelete={deleteCode} />

            <AnalysisConfig cfg={analysisCfg} busy={cfgBusy} onStep={stepCfg} onSave={saveAnalysisCfg} />

            <DeviceList stats={deviceStats} devices={devices} onToggleDevice={toggleDevice} />

            <PerfConfig perfDays={perfDays} busy={perfBusy} onUpdate={updatePerf} />

            {actionErr && <p className="text-red-500 text-sm font-semibold mb-4 px-2">{actionErr}</p>}
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
