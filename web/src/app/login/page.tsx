"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Info, PlayCircle, Loader2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { IMAGES } from "@/lib/theme";

export default function Login() {
  const router = useRouter();
  const { signInAdmin, signInDemo, expiredNotice, clearExpiredNotice } = useAuth();
  
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

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
    <div className="flex flex-col h-screen bg-[#1C1C1E] relative overflow-hidden">
      {/* Background Image & Gradient */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center" 
        style={{ backgroundImage: `url(${IMAGES.hero})` }} 
      />
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#1C1C1E8C] via-[#1C1C1EBF] to-[#1C1C1E]" />

      {/* Top Content */}
      <div className="relative z-10 flex-1 px-6 pt-20 md:pt-32 max-w-lg mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0A7A42] flex items-center justify-center">
            <Award size={26} color="#ffffff" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex-1">Pro-Racing Stats</h1>
        </div>
        <p className="text-white/85 text-lg mt-6 leading-relaxed">
          Horse Data Analysis<br />Réunions · Statistiques · Données
        </p>
      </div>

      {/* Bottom Sheet */}
      <div className="relative z-10 bg-white rounded-t-[28px] px-6 pt-8 pb-10 w-full max-w-lg mx-auto shadow-2xl">
        <h2 className="text-2xl font-extrabold text-[#1C1C1E]">Connexion</h2>
        <p className="text-[#8E8E93] mt-1.5 leading-5">
          Connectez-vous en tant qu'administrateur ou essayez l'application en mode démo.
        </p>

        <div className={`mt-6 transition-transform ${shake ? 'animate-shake' : ''}`}>
          <div className="relative flex items-center">
            <Lock className="absolute left-4 text-[#8E8E93]" size={20} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe administrateur"
              className={`w-full bg-[#EBEBEF] rounded-xl pl-12 pr-4 py-4 text-xl font-bold tracking-widest text-[#1C1C1E] border-2 outline-none transition-colors ${error ? 'border-[#E11D48]' : 'border-transparent focus:border-[#0A7A42]'}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitAdmin();
              }}
            />
          </div>
        </div>

        {error && (
          <p className="text-[#E11D48] text-base mt-2 text-center">{error}</p>
        )}

        <button
          onClick={submitAdmin}
          disabled={!password.trim() || loading}
          className="w-full bg-[#0A7A42] text-white rounded-xl py-4 mt-6 flex justify-center items-center font-extrabold text-lg transition-opacity disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Accès Complet"}
        </button>

        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-[1px] bg-black/10" />
          <span className="text-black/40 text-sm font-semibold">ou</span>
          <div className="flex-1 h-[1px] bg-black/10" />
        </div>

        <button
          onClick={submitDemo}
          disabled={demoLoading}
          className="w-full flex justify-center items-center gap-2 py-3.5 mt-4 rounded-xl bg-black/5 text-[#1C1C1E] font-extrabold text-base transition-opacity disabled:opacity-50 hover:bg-black/10"
        >
          {demoLoading ? <Loader2 className="animate-spin text-[#0A7A42]" /> : (
            <>
              <PlayCircle size={18} color="#0A7A42" />
              Essayer en mode démo (gratuit)
            </>
          )}
        </button>
        <p className="text-black/40 text-sm text-center mt-2">
          3 courses · aperçu des fonctionnalités
        </p>
      </div>
    </div>
  );
}

