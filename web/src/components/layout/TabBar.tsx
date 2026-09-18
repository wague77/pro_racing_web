"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Calendar, 
  Trophy, 
  Heart, 
  User, 
  LogIn, 
  LogOut, 
  Wand, 
  Menu as MenuIcon, 
  X, 
  ShieldCheck, 
  Sparkles,
  ChevronRight
} from "lucide-react";
import { T } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

export const tabs = [
  { name: "Réunions", href: "/", icon: Calendar, description: "Programme & Quinté+" },
  { name: "Magic Bases", href: "/magic-bases", icon: Wand, description: "Bases fiables de la journée" },
  { name: "Pronostics", href: "/pronostics", icon: Trophy, description: "Analyses & Algorithmes IA" },
  { name: "Favoris", href: "/favoris", icon: Heart, description: "Chevaux & courses suivis" },
  { name: "Compte", href: "/compte", icon: User, description: "Espace client & Administration" },
];

// =========================================================================
// 1. Mobile Header (Fixed Top Bar on Phones with Right-side Menu Button)
// =========================================================================
export function MobileHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { role } = useAuth();

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#121214]/95 backdrop-blur-md border-b border-white/10 z-40 px-4 flex items-center justify-between shadow-lg">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.3)] border border-emerald-500/30">
          <img src="/logo.jpg" alt="Logo" width={32} height={32} className="object-cover w-full h-full" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
            Pro-Racing <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Stats PMU IA</span>
        </div>
      </Link>

      {/* Button Menu on the right */}
      <button
        onClick={onOpenMenu}
        aria-label="Ouvrir le menu"
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 px-3 py-1.5 rounded-xl transition-all text-white shadow-sm"
      >
        <span className="text-xs font-bold text-gray-200">Menu</span>
        <div className="relative">
          <MenuIcon size={20} className="text-[#10B981]" />
          {role === "admin" && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10B981]" />
          )}
        </div>
      </button>
    </header>
  );
}

// =========================================================================
// 2. Mobile Right Drawer (Sliding Menu from the Right)
// =========================================================================
export function MobileRightDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { token, role, signOut } = useAuth();

  // Close menu when route changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent background scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`md:hidden fixed inset-0 bg-black/75 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer Panel */}
      <aside
        className={`md:hidden fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-[#141416] border-l border-white/10 z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-emerald-500/30">
              <img src="/logo.jpg" alt="Logo" width={36} height={36} className="object-cover w-full h-full" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Pro-Racing Stats</h3>
              <p className="text-xs text-gray-400">Menu Principal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le menu"
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Session Card */}
        <div className="p-4 mx-4 mt-4 bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-[#10B981] flex items-center justify-center border border-emerald-500/20">
              {role === "admin" ? <ShieldCheck size={20} /> : <User size={20} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">
                  {role === "admin" ? "Administrateur 👑" : role === "demo" ? "Mode Démo" : "Client Connecté"}
                </span>
              </div>
              <p className="text-xs text-emerald-400/90 font-medium">
                {token ? "Accès Pro Actif" : "Non connecté"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
            Navigation
          </div>
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.name}
                href={tab.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-500/15 text-[#10B981] border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                    : "text-gray-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-[#10B981]" : "text-gray-400"} />
                  <div>
                    <p className="text-sm font-bold">{tab.name}</p>
                    <p className="text-[11px] text-gray-500">{tab.description}</p>
                  </div>
                </div>
                <ChevronRight size={16} className={`transition-transform ${isActive ? "text-[#10B981] translate-x-1" : "text-gray-600"}`} />
              </Link>
            );
          })}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {token ? (
            <button
              onClick={() => {
                onClose();
                signOut();
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-xl transition-colors border border-red-500/20 text-sm"
            >
              <LogOut size={18} />
              <span>Se déconnecter</span>
            </button>
          ) : (
            <Link
              href="/login"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-[#10B981] hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow-lg shadow-emerald-500/20"
            >
              <LogIn size={18} />
              <span>Se connecter</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}

// =========================================================================
// 3. TabBar (Fixed Bottom Bar on Phones)
// =========================================================================
export function TabBar() {
  const pathname = usePathname();

  return (
    <div
      style={{
        backgroundColor: "rgba(20, 20, 22, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `0.5px solid rgba(255, 255, 255, 0.1)`,
      }}
      className="fixed bottom-0 left-0 right-0 w-full h-[62px] pb-safe pt-2 px-3 flex justify-around items-center z-40 md:hidden shadow-2xl"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        const color = isActive ? T.color.brand : "#9CA3AF";

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className="flex flex-col items-center justify-center w-16 transition-transform active:scale-90"
          >
            <div className={`p-1 rounded-xl transition-colors ${isActive ? "bg-emerald-500/10" : ""}`}>
              <Icon size={22} color={color} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            <span
              className={`text-[10px] font-bold mt-0.5 tracking-tight ${isActive ? "text-[#10B981]" : "text-gray-400"}`}
            >
              {tab.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

// =========================================================================
// 4. Sidebar (Fixed Left Navigation on Desktop)
// =========================================================================
export function Sidebar() {
  const pathname = usePathname();
  const { token, signOut } = useAuth();

  return (
    <div
      style={{
        backgroundColor: "#121214",
        borderRight: `1px solid rgba(255, 255, 255, 0.08)`,
      }}
      className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 py-8 px-4 z-40 shadow-xl"
    >
      <Link href="/" className="text-2xl font-black mb-8 px-4 text-white flex items-center gap-3 group">
        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.25)] border border-emerald-500/30 group-hover:scale-105 transition-transform">
          <img src="/logo.jpg" alt="Logo" width={36} height={36} className="object-cover w-full h-full" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
            Pro-Racing <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </span>
          <span className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">Pronostics IA</span>
        </div>
      </Link>

      <div className="flex flex-col space-y-1.5 flex-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-emerald-500/10 text-[#10B981] font-bold border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                  : "text-gray-300 hover:bg-white/5 hover:text-white font-medium"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={`mr-3 ${isActive ? "text-[#10B981]" : "text-gray-400"}`} />
              <span className="text-sm">{tab.name}</span>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-auto pt-4 border-t border-white/5">
        {token ? (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-semibold"
          >
            <LogOut size={20} className="mr-3" />
            <span>Déconnexion</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center px-4 py-3 rounded-xl text-gray-300 hover:bg-white/5 transition-colors text-sm font-semibold"
          >
            <LogIn size={20} className="mr-3" />
            <span>Connexion</span>
          </Link>
        )}
      </div>
    </div>
  );
}
