"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/LanguageContext";
import { ApiError } from "@/lib/api";
import Link from "next/link";
import React, { useState } from "react";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const t = useT();

  const DEMO_ACCOUNTS = [
    { label: t.auth.farmerDemo, email: "farmer.demo@agriflow.dev" },
    { label: t.auth.buyerDemo, email: "buyer.demo@agriflow.dev" },
    { label: t.auth.logisticsDemo, email: "logistics.demo@agriflow.dev" },
    { label: t.auth.adminDemo, email: "admin.demo@agriflow.dev" },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login({ email, password });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full">
      <div className="w-full max-w-md sm:pt-10 mx-auto mb-5">
        <Link
          href="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon />
          {t.common.appName}
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div>
          <div className="mb-5 sm:mb-8">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              {t.auth.signInTitle}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.auth.signInSubtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {DEMO_ACCOUNTS.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword("demo1234");
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-full border border-gray-300 text-gray-600 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-400"
              >
                {d.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {error && (
                <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
                  {error}
                </div>
              )}
              <div>
                <Label>
                  {t.common.email} <span className="text-error-500">*</span>{" "}
                </Label>
                <Input
                  placeholder="info@gmail.com"
                  type="email"
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>
                  {t.common.password} <span className="text-error-500">*</span>{" "}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t.common.password}
                    defaultValue={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400" />
                    )}
                  </span>
                </div>
              </div>
              <div>
                <Button type="submit" className="w-full" size="sm" disabled={submitting}>
                  {submitting ? t.auth.signingIn : t.common.signIn}
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              {t.auth.dontHaveAccount} {""}
              <Link
                href="/signup"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                {t.common.signUp}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
