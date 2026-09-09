"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth, Role } from "@/context/AuthContext";
import { useT } from "@/context/LanguageContext";
import type { Dictionary } from "@/lib/i18n";
import {
  GridIcon,
  BoxCubeIcon,
  ListIcon,
  TableIcon,
  PieChartIcon,
  PlusIcon,
  TaskIcon,
  HorizontaLDots,
} from "../icons/index";
import SidebarWidget from "./SidebarWidget";

type NavItem = {
  nameKey: keyof Dictionary["nav"];
  icon: React.ReactNode;
  path: string;
};

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  farmer: [
    { nameKey: "dashboard", icon: <GridIcon />, path: "/farmer" },
    { nameKey: "myProduce", icon: <BoxCubeIcon />, path: "/farmer/produce" },
    { nameKey: "addProduce", icon: <PlusIcon />, path: "/farmer/produce/new" },
    { nameKey: "orders", icon: <TaskIcon />, path: "/farmer/orders" },
    { nameKey: "market", icon: <PieChartIcon />, path: "/market" },
  ],
  buyer: [
    { nameKey: "dashboard", icon: <GridIcon />, path: "/buyer" },
    { nameKey: "myRequirements", icon: <ListIcon />, path: "/buyer/requirements" },
    { nameKey: "postRequirement", icon: <PlusIcon />, path: "/buyer/requirements/new" },
    { nameKey: "orders", icon: <TaskIcon />, path: "/buyer/orders" },
    { nameKey: "market", icon: <PieChartIcon />, path: "/market" },
  ],
  logistics: [
    { nameKey: "dashboard", icon: <GridIcon />, path: "/logistics" },
    { nameKey: "myVehicles", icon: <BoxCubeIcon />, path: "/logistics/vehicles" },
    { nameKey: "findLoad", icon: <TableIcon />, path: "/logistics/loads" },
    { nameKey: "myRoutes", icon: <TaskIcon />, path: "/logistics/routes" },
    { nameKey: "market", icon: <PieChartIcon />, path: "/market" },
  ],
  admin: [
    { nameKey: "dashboard", icon: <GridIcon />, path: "/admin" },
    { nameKey: "market", icon: <PieChartIcon />, path: "/market" },
  ],
};

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { role } = useAuth();
  const t = useT();
  const pathname = usePathname();

  const isActive = (path: string) => path === pathname;
  const navItems = role ? NAV_BY_ROLE[role] : [];
  const showLabel = isExpanded || isHovered || isMobileOpen;

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200
        ${
          isExpanded || isMobileOpen
            ? "w-[290px]"
            : isHovered
            ? "w-[290px]"
            : "w-[90px]"
        }
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex  ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link href={role ? NAV_BY_ROLE[role][0].path : "/signin"}>
          {showLabel ? (
            <>
              <Image
                className="dark:hidden"
                src="/images/logo/logo.svg"
                alt="AgriFlow"
                width={150}
                height={40}
              />
              <Image
                className="hidden dark:block"
                src="/images/logo/logo-dark.svg"
                alt="AgriFlow"
                width={150}
                height={40}
              />
            </>
          ) : (
            <Image
              src="/images/logo/logo-icon.svg"
              alt="AgriFlow"
              width={32}
              height={32}
            />
          )}
        </Link>
      </div>
      <div className="flex flex-col overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="mb-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2
                className={`mb-4 text-xs uppercase flex leading-[20px] text-gray-400 ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
                }`}
              >
                {showLabel ? t.common.menu : <HorizontaLDots />}
              </h2>
              <ul className="flex flex-col gap-4">
                {navItems.map((nav) => (
                  <li key={nav.nameKey}>
                    <Link
                      href={nav.path}
                      className={`menu-item group ${
                        isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                      }`}
                    >
                      <span
                        className={
                          isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                        }
                      >
                        {nav.icon}
                      </span>
                      {showLabel && <span className="menu-item-text">{t.nav[nav.nameKey]}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
        {showLabel ? <SidebarWidget /> : null}
      </div>
    </aside>
  );
};

export default AppSidebar;
