"use client";
import React, { useEffect, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { api } from "@/lib/api";
import { onForegroundMessage } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useT } from "@/context/LanguageContext";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso + "Z").getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const { token } = useAuth();
  const t = useT();

  const unreadCount = items.filter((n) => !n.is_read).length;

  function refresh() {
    if (!token) return;
    api.get<NotificationItem[]>("/notifications/mine").then(setItems).catch(() => {});
  }

  useEffect(refresh, [token]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    onForegroundMessage(() => refresh()).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => unsubscribe?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggleDropdown() {
    setIsOpen((prev) => !prev);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await api.patch(`/notifications/${id}/read`);
    } catch {
      refresh();
    }
  }

  async function markAllRead() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await api.post("/notifications/mark-all-read");
    } catch {
      refresh();
    }
  }

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            unreadCount === 0 ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex max-h-[480px] w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t.common.notifications}</h5>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              {t.common.markAllRead}
            </button>
          )}
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {items.length === 0 && (
            <li className="py-8 text-sm text-center text-gray-500 dark:text-gray-400">{t.common.noNotificationsYet}</li>
          )}
          {items.map((n) => (
            <li key={n.id}>
              <DropdownItem
                onItemClick={() => markRead(n.id)}
                className={`flex flex-col gap-1 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5 ${
                  n.is_read ? "" : "bg-brand-25 dark:bg-brand-500/5"
                }`}
              >
                <span className="text-theme-sm font-medium text-gray-800 dark:text-white/90">{n.title}</span>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">{n.message}</span>
                <span className="text-theme-xs text-gray-400 dark:text-gray-500">{timeAgo(n.created_at)}</span>
              </DropdownItem>
            </li>
          ))}
        </ul>
      </Dropdown>
    </div>
  );
}
