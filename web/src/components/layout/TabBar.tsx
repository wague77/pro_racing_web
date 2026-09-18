"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Trophy, Heart, User, LogIn, LogOut, Wand } from "lucide-react";
import { T } from "@/lib/theme";
import { useAuth } from "@/lib/auth";

const tabs = [
  { name: "Réunions", href: "/", icon: Calendar },
  { name: "Magic Bases", href: "/magic-bases", icon: Wand },
  { name: "Pronostics", href: "/pronostics", icon: Trophy },
  { name: "Favoris", href: "/favoris", icon: Heart },
  { name: "Compte", href: "/compte", icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <div
      style={{
        backgroundColor: "rgba(28, 28, 30, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `0.5px solid ${T.color.border}`,
      }}
      className="fixed bottom-0 w-full h-[60px] pb-safe pt-2 px-4 flex justify-around items-center z-50 md:hidden glass-panel"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        const color = isActive ? T.color.brand : T.color.onSurfaceTertiary;

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className="flex flex-col items-center justify-center w-16 transition-transform hover:scale-105 active:scale-95"
          >
            <Icon size={24} color={color} strokeWidth={isActive ? 2.5 : 2} />
            <span
              className="text-[11px] font-semibold mt-1"
              style={{ color }}
            >
              {tab.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { token, signOut } = useAuth();

  return (
    <div
      style={{
        backgroundColor: T.color.surfaceSecondary,
        borderRight: `1px solid ${T.color.border}`,
      }}
      className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 py-8 px-4 z-50"
    >
      <div className="text-2xl font-black mb-8 px-4 text-gradient flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
          <img src="/logo.jpg" alt="Logo" width={32} height={32} className="object-cover" />
        </div>
        Pro-Racing
      </div>
      <div className="flex flex-col space-y-2 flex-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          const color = isActive ? T.color.brand : T.color.onSurface;
          const bg = isActive ? "rgba(16, 185, 129, 0.1)" : "transparent";

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex items-center px-4 py-3 rounded-xl transition-all duration-300 hover:bg-white/5"
              style={{ backgroundColor: bg, color }}
            >
              <Icon size={24} color={color} strokeWidth={isActive ? 2.5 : 2} className="mr-3" />
              <span className="font-semibold">{tab.name}</span>
            </Link>
          );
        })}
      </div>
      
      <div className="mt-auto pt-4 border-t border-white/5">
        {token ? (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center px-4 py-3 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={24} className="mr-3" />
            <span className="font-semibold">Déconnexion</span>
          </button>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center px-4 py-3 rounded-xl text-gray-300 hover:bg-white/5 transition-colors"
          >
            <LogIn size={24} className="mr-3" />
            <span className="font-semibold">Connexion</span>
          </Link>
        )}
      </div>
    </div>
  );
}
