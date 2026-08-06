"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  ScanLine,
  FolderKanban,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { name: "Home", href: "/", icon: LayoutDashboard },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Add", href: "/scan", icon: ScanLine, primary: true },
  { name: "Reserve", href: "/reservations", icon: ClipboardList },
  { name: "Projects", href: "/projects", icon: FolderKanban },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          if (item.primary) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex flex-col items-center justify-center"
              >
                <span className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary-600 text-white shadow-lg border-4 border-white">
                  <item.icon className="w-6 h-6" />
                </span>
                <span className="text-[10px] font-medium text-primary-700 -mt-1">
                  {item.name}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-[11px] font-medium",
                isActive ? "text-primary-700" : "text-gray-500"
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
      </div>
    </nav>
  );
}
