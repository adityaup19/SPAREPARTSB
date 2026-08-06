"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  FolderKanban,
  ScanLine,
  Menu,
  X,
  ShieldCheck,
  History,
  LogOut,
  FileUp,
} from "lucide-react";
import type { AppUser } from "@prisma/client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type NavigationItem = {
  name: string;
  href: string;
  icon: typeof Package;
  managerOnly?: boolean;
  adminOnly?: boolean;
};

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Add a Part", href: "/scan", icon: ScanLine },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Reservations", href: "/reservations", icon: ClipboardList },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Import / Export", href: "/inventory/import", icon: FileUp, managerOnly: true },
  { name: "Audit History", href: "/audit", icon: History, managerOnly: true },
  { name: "User Admin", href: "/admin/users", icon: ShieldCheck, adminOnly: true },
];

export function Sidebar({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={mobileOpen}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? (
          <X className="w-6 h-6 text-gray-600" />
        ) : (
          <Menu className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Close navigation menu"
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen bg-white border-r border-gray-200 transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Spare Parts</h1>
              <p className="text-xs text-gray-500">Inventory Tracker</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation
              .filter((item) => !item.adminOnly || user.role === "ADMIN")
              .filter(
                (item) =>
                  !item.managerOnly ||
                  user.role === "ADMIN" ||
                  user.role === "MANAGER"
              )
              .map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "w-5 h-5",
                      isActive ? "text-primary-600" : "text-gray-400"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-200">
            <p className="truncate text-sm font-medium text-gray-900">
              {user.displayName || user.email}
            </p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="rounded bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600">
                {user.role}
              </span>
              <button
                type="button"
                aria-label="Sign out"
                title="Sign out"
                onClick={async () => {
                  await createSupabaseBrowserClient().auth.signOut();
                  window.location.assign("/login");
                }}
                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
