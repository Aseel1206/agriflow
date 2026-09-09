"use client";

import { useSidebar } from "@/context/SidebarContext";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/LanguageContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { token, loading } = useAuth();
  const t = useT();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/signin");
    }
  }, [loading, token, router]);

  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
    ? "lg:ml-[290px]"
    : "lg:ml-[90px]";

  if (loading || !token) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 dark:text-gray-400">
        {t.common.loading}
      </div>
    );
  }

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div
        className={`flex-1 transition-all  duration-300 ease-in-out ${mainContentMargin}`}
      >
        <AppHeader />
        <main className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">{children}</main>
      </div>
    </div>
  );
}
