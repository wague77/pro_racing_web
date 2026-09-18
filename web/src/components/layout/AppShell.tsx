"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar, TabBar, MobileHeader, MobileRightDrawer } from "./TabBar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, loading } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Authentication protection: redirect to /login if token is absent
  useEffect(() => {
    if (!loading && !token && pathname !== "/login") {
      router.replace("/login");
    }
  }, [token, loading, pathname, router]);

  // Don't wrap login page with navigation chrome
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Show a loading screen while reading auth state
  if (loading || (!token && pathname !== "/login")) {
    return (
      <div className="min-h-screen bg-[#0A0A0C] flex flex-col items-center justify-center">
        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse mb-4">
          <img src="/logo.jpg" alt="Logo" width={40} height={40} className="object-cover w-full h-full" />
        </div>
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-gray-100 flex flex-col md:flex-row">
      {/* 1. Desktop Sidebar */}
      <Sidebar />

      {/* 2. Mobile Top Header with Menu button on the right */}
      <MobileHeader onOpenMenu={() => setIsMenuOpen(true)} />

      {/* 3. Mobile Right Sliding Drawer Menu */}
      <MobileRightDrawer open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* 4. Main App Area */}
      <div className="flex-1 md:ml-64 pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen flex flex-col">
        <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col">
          {children}
        </main>
      </div>

      {/* 5. Mobile Bottom TabBar */}
      <TabBar />
    </div>
  );
}
