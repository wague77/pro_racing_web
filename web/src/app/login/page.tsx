"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, PlayCircle, Loader2, Lock, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth";
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
    <div className="flex flex-col h-screen bg-[#0A0A0C] relative overflow-hidden">
      {/* Background Image & Gradient */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-40 mix-blend-luminosity" 
        style={{ backgroundImage: `url(${IMAGES.hero})` }} 
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/80 to-transparent" />

      {/* Top Content */}
      <div className="relative z-10 flex-1 px-6 pt-20 md:pt-32 max-w-md mx-auto w-full text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#10B981] to-[#047857] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <Award size={36} color="#ffffff" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Pro-Racing</h1>
        </div>
        <p className="text-gray-400 text-lg mt-4 font-medium">
          L'intelligence artificielle au service<br />de vos pronostics hippiques
        </p>
      </div>

      {/* Bottom Sheet */}
      <div className="relative z-10 glass-panel rounded-t-[40px] px-8 pt-8 pb-12 w-full max-w-lg mx-auto border-t border-white/10">
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
      </div>
    </div>
  );
}

