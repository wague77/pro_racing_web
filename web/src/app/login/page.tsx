"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Info, Zap, PlayCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { IMAGES, T } from "@/lib/theme";

export default function Login() {
  const router = useRouter();
  const { signInWithCode, signInFree, signInDemo, expiredNotice, clearExpiredNotice } = useAuth();
  
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [freeLoading, setFreeLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [freeActive, setFreeActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (expiredNotice) {
      setError(expiredNotice);
      clearExpiredNotice();
    }
  }, [expiredNotice, clearExpiredNotice]);

  useEffect(() => {
    api
      .freeAccessStatus()
      .then((s) => setFreeActive(!!s.active))
      .catch(() => setFreeActive(false));
  }, []);

  const runShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const submit = async () => {
    if (!code.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithCode(code.trim());
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Code invalide");
      runShake();
    } finally {
      setLoading(false);
    }
  };

  const submitFree = async () => {
    if (freeLoading) return;
    setFreeLoading(true);
    setError(null);
    try {
      await signInFree();
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Accès libre indisponible");
      setFreeActive(false);
    } finally {
      setFreeLoading(false);
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
        <h2 className="text-2xl font-extrabold text-[#1C1C1E]">Entrez votre code d'accès</h2>
        <p className="text-[#8E8E93] mt-1.5 leading-5">
          Un code fourni par votre administrateur est requis pour continuer.
        </p>

        <div className="flex items-center gap-2 bg-[#E6F4EA] rounded-xl py-2 px-3 mt-4">
          <Info size={16} color="#0A7A42" />
          <p className="text-sm font-semibold text-[#054D29] flex-1">
            Version Démo · Utilisez le code : <span className="font-extrabold text-[#0A7A42] tracking-wider">DEMO2026</span>
          </p>
        </div>

        <div className={`mt-6 transition-transform ${shake ? 'animate-shake' : ''}`}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="EX : DEMO2026"
            className={`w-full bg-[#EBEBEF] rounded-xl px-4 py-4 text-xl font-bold tracking-[3px] text-center text-[#1C1C1E] border-2 outline-none transition-colors ${error ? 'border-[#E11D48]' : 'border-transparent focus:border-[#0A7A42]'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>

        {error && (
          <p className="text-[#E11D48] text-base mt-2 text-center">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={!code.trim() || loading}
          className="w-full bg-[#0A7A42] text-white rounded-xl py-4 mt-6 flex justify-center items-center font-extrabold text-lg transition-opacity disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Valider"}
        </button>

        {freeActive && (
          <button
            onClick={submitFree}
            disabled={freeLoading}
            className="w-full flex justify-center items-center gap-2 py-3.5 mt-3 rounded-xl border-[1.5px] border-[#0A7A42] text-[#0A7A42] font-extrabold text-base transition-opacity disabled:opacity-50"
          >
            {freeLoading ? <Loader2 className="animate-spin" /> : (
              <>
                <Zap size={16} />
                Entrer en accès libre
              </>
            )}
          </button>
        )}

        <div className="flex items-center gap-3 mt-6">
          <div className="flex-1 h-[1px] bg-black/10" />
          <span className="text-black/40 text-sm font-semibold">ou</span>
          <div className="flex-1 h-[1px] bg-black/10" />
        </div>

        <button
          onClick={submitDemo}
          disabled={demoLoading}
          className="w-full flex justify-center items-center gap-2 py-3.5 mt-4 rounded-xl bg-black/5 text-[#1C1C1E] font-extrabold text-base transition-opacity disabled:opacity-50"
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
