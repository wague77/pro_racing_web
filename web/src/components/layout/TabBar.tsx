"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Trophy, Heart, User } from "lucide-react";
import { T } from "@/lib/theme";

const tabs = [
  { name: "Réunions", href: "/", icon: Calendar },
  { name: "Pronostics", href: "/pronostics", icon: Trophy },
  { name: "Favoris", href: "/favoris", icon: Heart },
  { name: "Compte", href: "/compte", icon: User },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <div
      style={{
        backgroundColor: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: `0.5px solid ${T.color.border}`,
      }}
      className="fixed bottom-0 w-full h-[60px] pb-safe pt-2 px-4 flex justify-around items-center z-50 md:hidden"
    >
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        const color = isActive ? T.color.brand : T.color.muted;

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className="flex flex-col items-center justify-center w-16"
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

  return (
    <div
      style={{
        backgroundColor: T.color.surfaceSecondary,
        borderRight: `1px solid ${T.color.border}`,
      }}
      className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 py-8 px-4 z-50"
    >
      <div className="text-2xl font-bold mb-8 px-4" style={{ color: T.color.brand }}>
        Pro-Racing
      </div>
      <div className="flex flex-col space-y-2">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          const color = isActive ? T.color.brand : T.color.onSurfaceTertiary;
          const bg = isActive ? T.color.brandSecondary : "transparent";

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className="flex items-center px-4 py-3 rounded-lg transition-colors"
              style={{ backgroundColor: bg, color }}
            >
              <Icon size={24} color={color} strokeWidth={isActive ? 2.5 : 2} className="mr-3" />
              <span className="font-semibold">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
