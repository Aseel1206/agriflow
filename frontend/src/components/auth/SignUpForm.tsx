"use client";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import Button from "@/components/ui/button/Button";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "@/icons";
import { useAuth, Role } from "@/context/AuthContext";
import { useT } from "@/context/LanguageContext";
import { ApiError } from "@/lib/api";
import { findLocation, LOCATIONS } from "@/lib/locations";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useState } from "react";

const LOCATION_OPTIONS = LOCATIONS.map((l) => ({ value: l.name, label: l.name }));
const VALID_ROLES: Role[] = ["farmer", "buyer", "logistics"];

export default function SignUpForm() {
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role");
  const initialRole = VALID_ROLES.includes(requestedRole as Role) ? (requestedRole as Role) : "farmer";

  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>(initialRole);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [buyerType, setBuyerType] = useState("retailer");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { register } = useAuth();
  const t = useT();

  const ROLES: { value: Role; label: string; blurb: string }[] = [
    { value: "farmer", label: t.auth.roleFarmer, blurb: t.auth.roleFarmerBlurb },
    { value: "buyer", label: t.auth.roleBuyer, blurb: t.auth.roleBuyerBlurb },
    { value: "logistics", label: t.auth.roleLogistics, blurb: t.auth.roleLogisticsBlurb },
  ];
  const BUYER_TYPE_OPTIONS = [
    { value: "retailer", label: t.auth.retailer },
    { value: "wholesaler", label: t.auth.wholesaler },
    { value: "bulk_buyer", label: t.auth.bulkBuyer },
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const loc = findLocation(location);
    if (!loc) {
      setError(t.auth.selectLocation);
      return;
    }

    setSubmitting(true);
    try {
      await register({
        email,
        password,
        full_name: fullName,
        role,
        village: loc.name,
        district: loc.name,
        state: "Karnataka",
        lat: loc.lat,
        lng: loc.lng,
        business_name: role === "buyer" ? businessName || fullName : undefined,
        buyer_type: role === "buyer" ? buyerType : undefined,
        company_name: role === "logistics" ? companyName || fullName : undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 lg:w-1/2 w-full overflow-y-auto no-scrollbar">
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
              {t.auth.signUpTitle}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t.auth.signUpSubtitle}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`rounded-lg border px-2 py-3 text-center transition-colors ${
                  role === r.value
                    ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                    : "border-gray-300 dark:border-gray-700"
                }`}
              >
                <span
                  className={`block text-sm font-medium ${
                    role === r.value ? "text-brand-600 dark:text-brand-400" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {r.label}
                </span>
              </button>
            ))}
          </div>
          <p className="mb-6 -mt-3 text-xs text-gray-500 dark:text-gray-400">
            {ROLES.find((r) => r.value === role)?.blurb}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {error && (
                <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/15 dark:text-error-400">
                  {error}
                </div>
              )}

              <div>
                <Label>
                  {t.common.fullName}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder={t.common.fullName}
                  defaultValue={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {role === "buyer" && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <Label>{t.auth.businessName}</Label>
                    <Input
                      type="text"
                      placeholder="e.g. Bengaluru Retail Market"
                      defaultValue={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>{t.auth.buyerType}</Label>
                    <Select
                      options={BUYER_TYPE_OPTIONS}
                      defaultValue="retailer"
                      onChange={setBuyerType}
                    />
                  </div>
                </div>
              )}

              {role === "logistics" && (
                <div>
                  <Label>{t.auth.companyName}</Label>
                  <Input
                    type="text"
                    placeholder="e.g. Swift Transport Co."
                    defaultValue={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>
                  {t.common.location}
                  <span className="text-error-500">*</span>
                </Label>
                <Select
                  options={LOCATION_OPTIONS}
                  placeholder={t.auth.selectLocation}
                  onChange={setLocation}
                />
              </div>

              <div>
                <Label>
                  {t.common.email}
                  <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder={t.common.email}
                  defaultValue={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label>
                  {t.common.password}
                  <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder={t.common.password}
                    type={showPassword ? "text" : "password"}
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
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? t.auth.creatingAccount : t.common.signUp}
                </Button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              {t.auth.alreadyHaveAccount}{" "}
              <Link
                href="/signin"
                className="text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                {t.common.signIn}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
