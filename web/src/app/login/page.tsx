"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, PlayCircle, Loader2, Lock, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { IMAGES } from "@/lib/theme";

export default function Login() {
  const router = useRouter();
  const { signInAdmin, signInDemo, signInWithCode, expiredNotice, clearExpiredNotice } = useAuth();
  
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  
  // "code" | "admin"
  const [mode, setMode] = useState<"code" | "admin">("code");

  const [loginCfg, setLoginCfg] = useState<{payment_link: string; whatsapp_link?: string; show_demo_button: boolean} | null>(null);
  const [freeAccess, setFreeAccess] = useState<{active: boolean} | null>(null);

  useEffect(() => {
    api.getLoginConfig().then(setLoginCfg).catch(() => {});
    api.freeAccessStatus().then(setFreeAccess).catch(() => {});
  }, []);

  useEffect(() => {
    if (expiredNotice) {
      setError(expiredNotice);
      clearExpiredNotice();
    }
  }, [expiredNotice, clearExpiredNotice]);

  const runShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const submitCode = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithCode(code.trim());
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Code d'accès invalide ou expiré");
      runShake();
    } finally {
      setLoading(false);
    }
  };

  const submitAdmin = async () => {
    if (!password.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signInAdmin(password.trim());
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Mot de passe incorrect");
      runShake();
    } finally {
      setLoading(false);
    }
  };

  const submitDemo = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    setError(null);
    try {
      await signInDemo();
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Mode démo indisponible");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#0A0A0C] relative overflow-hidden">
      {/* Left Pane / Background */}
      <div className="absolute inset-0 md:relative md:flex-1 z-0 flex flex-col justify-center">
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-40 mix-blend-luminosity" 
          style={{ backgroundImage: `url(${IMAGES.hero})` }} 
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0A0A0C] via-[#0A0A0C]/80 to-transparent" />
        
        {/* Top Content (Hero) */}
        <div className="relative z-10 px-6 pt-20 md:pt-0 max-w-md mx-auto md:ml-20 w-full text-center md:text-left">
          <div className="flex flex-col items-center md:items-start gap-4">
            <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight">Pro-Racing</h1>
          </div>
          <p className="text-gray-400 text-lg md:text-xl mt-4 font-medium max-w-sm">
            L'intelligence artificielle au service<br className="md:hidden" /> de vos pronostics hippiques
          </p>
        </div>
      </div>

      {/* Right Pane (Form) */}
      <div className="relative z-10 glass-panel md:bg-[#151518]/95 rounded-t-[40px] md:rounded-none px-8 pt-8 pb-12 w-full md:w-[480px] lg:w-[550px] mx-auto flex flex-col justify-center border-t md:border-t-0 md:border-l border-white/10 mt-auto md:mt-0 h-fit md:h-full">
        <div className="flex bg-white/5 p-1 rounded-xl mb-8">
          <button
            onClick={() => { setMode("code"); setError(null); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              mode === "code" ? "bg-[#10B981] text-white shadow-lg" : "text-gray-400 hover:text-white"
            }`}
          >
            Code d'accès
          </button>
          <button
            onClick={() => { setMode("admin"); setError(null); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              mode === "admin" ? "bg-[#10B981] text-white shadow-lg" : "text-gray-400 hover:text-white"
            }`}
          >
            Administrateur
          </button>
        </div>

        <div className={`transition-transform ${shake ? 'animate-shake' : ''}`}>
          {mode === "code" ? (
            <div className="relative flex items-center">
              <KeyRound className="absolute left-4 text-gray-400" size={20} />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Entrez votre code d'accès"
                className={`w-full bg-white/5 rounded-2xl pl-12 pr-4 py-4 text-lg font-bold tracking-widest text-white border-2 outline-none transition-colors placeholder:text-gray-500 placeholder:tracking-normal ${
                  error ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-[#10B981]'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitCode();
                }}
              />
            </div>
          ) : (
            <div className="relative flex items-center">
              <Lock className="absolute left-4 text-gray-400" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe administrateur"
                className={`w-full bg-white/5 rounded-2xl pl-12 pr-4 py-4 text-lg font-bold text-white border-2 outline-none transition-colors placeholder:text-gray-500 ${
                  error ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-[#10B981]'
                }`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitAdmin();
                }}
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-400 text-sm font-medium mt-3 text-center">{error}</p>
        )}

        <button
          onClick={mode === "code" ? submitCode : submitAdmin}
          disabled={(mode === "code" ? !code.trim() : !password.trim()) || loading}
          className="w-full bg-gradient-to-r from-[#10B981] to-[#047857] text-white rounded-2xl py-4 mt-6 flex justify-center items-center font-black text-lg transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-[0_4px_20px_rgba(16,185,129,0.3)]"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Se connecter"}
        </button>

        {(loginCfg?.show_demo_button !== false && freeAccess?.active !== false) && (
          <>
            <div className="flex items-center gap-4 mt-8">
              <div className="flex-1 h-[1px] bg-white/10" />
              <span className="text-gray-500 text-sm font-semibold uppercase tracking-widest">Ou</span>
              <div className="flex-1 h-[1px] bg-white/10" />
            </div>

            <button
              onClick={submitDemo}
              disabled={demoLoading}
              className="w-full flex justify-center items-center gap-2 py-4 mt-6 rounded-2xl bg-white/5 text-white font-bold text-base transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 border border-white/5"
            >
              {demoLoading ? <Loader2 className="animate-spin text-[#10B981]" /> : (
                <>
                  <PlayCircle size={20} className="text-[#10B981]" />
                  Essayer en mode démo
                </>
              )}
            </button>
          </>
        )}

        {loginCfg?.payment_link && (
          <div className="mt-8 relative overflow-hidden rounded-[24px] group cursor-pointer transition-all duration-300 hover:scale-[1.02] shadow-[0_0_40px_rgba(245,158,11,0.15)] hover:shadow-[0_0_50px_rgba(245,158,11,0.3)]">
            {/* Base Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#0A0A0C] to-[#1a1a1a] border border-amber-500/30 rounded-[24px]" />
            
            {/* Animated Gold Shimmers */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent opacity-80" />
            <div className="absolute -inset-full bg-gradient-to-r from-transparent via-amber-200/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] skew-x-12" />
            <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-amber-500/10 to-transparent" />
            
            {/* Glowing Border effect */}
            <div className="absolute inset-0 rounded-[24px] border border-amber-400/20 group-hover:border-amber-400/50 transition-colors duration-500" />

            <div className="relative z-10 p-6 flex flex-col items-center text-center">
              {/* Floating Badge */}
              <div className="absolute -top-3 right-4 bg-gradient-to-r from-red-500 to-orange-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg shadow-red-500/30 animate-pulse uppercase tracking-wider border border-white/20">
                VIP Exclusif
              </div>

              {/* Icon */}
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full animate-pulse" />
                <div className="bg-gradient-to-br from-amber-300 via-amber-500 to-orange-600 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)] border-2 border-white/20">
                  <Award size={32} color="#ffffff" />
                </div>
              </div>
              
              {/* Typography */}
              <h3 className="text-2xl font-black bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text text-transparent mb-2">
                Passez au Niveau IA Pro
              </h3>
              
              <div className="flex flex-col gap-2 mb-6 w-full text-left px-2">
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5 border border-white/5">
                  <div className="bg-green-500/20 p-1 rounded-full">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-gray-200 text-sm font-semibold">Le <span className="text-amber-400">Top 8 IA</span> Ultra Précis</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5 border border-white/5">
                  <div className="bg-green-500/20 p-1 rounded-full">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-gray-200 text-sm font-semibold">Couplés Gagnants à <span className="text-amber-400">90%</span></span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-2.5 border border-white/5">
                  <div className="bg-green-500/20 p-1 rounded-full">
                    <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-gray-200 text-sm font-semibold">Bases & <span className="text-amber-400">Tocards Exclusifs</span></span>
                </div>
              </div>
              
              {/* Call to action */}
              <a
                href={loginCfg.payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full relative group/btn overflow-hidden rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 p-[2px]"
              >
                <div className="absolute inset-0 bg-white/20 group-hover/btn:bg-transparent transition-colors" />
                <div className="relative bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-3.5 rounded-[10px] flex justify-center items-center gap-2 shadow-inner">
                  <span className="text-white font-black text-lg tracking-wide drop-shadow-md">
                    S'abonner Maintenant
                  </span>
                  <PlayCircle size={20} className="text-white drop-shadow-md" />
                </div>
              </a>
              <p className="text-xs text-gray-400 mt-3 font-medium uppercase tracking-wider">
                Gagnez tous les jours avec Pro-Racing
              </p>
            </div>
          </div>
        )}

        {loginCfg?.whatsapp_link && (
          <a
            href={loginCfg.whatsapp_link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex justify-center items-center py-4 mt-4 rounded-2xl bg-gradient-to-r from-[#25D366] to-[#128C7E] text-white font-black text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#25D366]/20"
          >
            Nous contacter sur WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

