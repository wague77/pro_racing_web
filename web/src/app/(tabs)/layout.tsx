"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TabBar, Sidebar } from "@/components/layout/TabBar";

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
    }
  }, [token, loading, router]);

  if (loading || !token) return null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 md:ml-64 pb-20 md:pb-0">
        <main className="max-w-7xl mx-auto min-h-screen">
          {children}
        </main>
      </div>
      <TabBar />
    </div>
  );
}
