"use client";

import React, { useState, useEffect } from "react";
import { Download, X, Share, PlusSquare, Smartphone, Check } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // 1. Register service worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.log("SW registration error", err));
    }

    // 2. Check if already running in standalone mode (already installed as PWA)
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isStandaloneMode);
    if (isStandaloneMode) return;

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // 4. Listen for Chrome/Android/Desktop install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user dismissed recently
      const dismissedUntil = localStorage.getItem("pwa_dismissed_until");
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        // Show after 1.5 seconds for a smooth first impression
        setTimeout(() => setShowPrompt(true), 1500);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 5. If iOS and not dismissed, show prompt after 2 seconds
    if (isAppleDevice && !isStandaloneMode) {
      const dismissedUntil = localStorage.getItem("pwa_dismissed_until");
      if (!dismissedUntil || Date.now() > Number(dismissedUntil)) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    }

    // 6. Listen for manual trigger from menu or anywhere
    const handleManualTrigger = () => {
      setShowPrompt(true);
    };
    window.addEventListener("trigger-pwa-install", handleManualTrigger);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("trigger-pwa-install", handleManualTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstalled(true);
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal for 2 days
    localStorage.setItem("pwa_dismissed_until", String(Date.now() + 2 * 24 * 60 * 60 * 1000));
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
      <div className="bg-[#18181B] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden flex flex-col gap-4 text-white">
        
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Fermer"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header Icon + App Title */}
        <div className="flex items-center gap-3.5 pr-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/30 shrink-0">
            <img src="/icon-192.png" alt="Pro-Racing Logo" width={56} height={56} className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">Pro-Racing Stats</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <span className="text-xs text-emerald-400 font-semibold">Application Mobile Officielle</span>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="text-sm text-gray-300 leading-relaxed bg-white/5 border border-white/5 rounded-2xl p-3.5">
          <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <Smartphone size={16} className="text-[#10B981]" />
            Installer sur votre téléphone
          </p>
          <p className="text-xs text-gray-300">
            Accédez instantanément à vos pronostics Quinté+, variations de cotes et alertes directement depuis l'écran d'accueil de votre téléphone, sans passer par le navigateur web.
          </p>
        </div>

        {/* Specific Instructions for iOS or One-Click button for Android/Chrome */}
        {isIOS ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-xs text-gray-200 space-y-2.5">
            <p className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Share size={15} /> Comment installer sur iPhone / iPad :
            </p>
            <ol className="space-y-1.5 text-gray-300 list-decimal list-inside text-xs leading-relaxed">
              <li>
                Appuyez sur le bouton <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">Partager ⎋</span> en bas de Safari.
              </li>
              <li>
                Faites défiler vers le bas et touchez <span className="font-bold text-white bg-white/10 px-1.5 py-0.5 rounded">« Sur l'écran d'accueil » ⊞</span>.
              </li>
              <li>
                Touchez <span className="font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">« Ajouter »</span> en haut à droite.
              </li>
            </ol>
          </div>
        ) : null}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {!isIOS && deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-emerald-400 hover:to-emerald-600 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <Download size={18} />
              Installer maintenant
            </button>
          ) : isIOS ? (
            <button
              onClick={handleDismiss}
              className="flex-1 bg-[#10B981] hover:bg-emerald-600 text-white font-bold py-3.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Check size={18} />
              J'ai compris
            </button>
          ) : (
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-extrabold py-3.5 px-4 rounded-xl shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-2 text-sm"
            >
              <Download size={18} />
              Ajouter à l'écran d'accueil
            </button>
          )}

          <button
            onClick={handleDismiss}
            className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-sm font-semibold transition-colors text-center"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
