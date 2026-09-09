"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import Button from "@/components/ui/button/Button";
import LanguageSwitcher from "@/components/header/LanguageSwitcher";
import FontSizeControl from "@/components/header/FontSizeControl";
import ReadAloudButton from "@/components/common/ReadAloudButton";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import { useT } from "@/context/LanguageContext";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = useT();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex items-center">
            <Image className="dark:hidden" src="/images/logo/logo.svg" alt={t.common.appName} width={140} height={38} />
            <Image
              className="hidden dark:block"
              src="/images/logo/logo-dark.svg"
              alt={t.common.appName}
              width={140}
              height={38}
            />
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <FontSizeControl />
            <ReadAloudButton />
            <LanguageSwitcher />
            <ThemeToggleButton />
            <Link href="/signin">
              <Button variant="outline" size="sm">
                {t.common.signIn}
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">{t.landing.getStarted}</Button>
            </Link>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-gray-200 py-8 dark:border-gray-800">
        <div className="mx-auto max-w-(--breakpoint-2xl) px-4 text-center md:px-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.landing.footerTagline}</p>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} {t.common.appName}
          </p>
        </div>
      </footer>
    </div>
  );
}
