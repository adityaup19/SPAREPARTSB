import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function daysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function isWarrantyExpiringSoon(date: Date | string | null | undefined, days: number = 90): boolean {
  const remaining = daysUntil(date);
  if (remaining === null) return false;
  return remaining > 0 && remaining <= days;
}

export function isWarrantyExpired(date: Date | string | null | undefined): boolean {
  const remaining = daysUntil(date);
  if (remaining === null) return false;
  return remaining <= 0;
}

export function getConditionColor(condition: string): string {
  switch (condition.toLowerCase()) {
    case "new":
      return "bg-green-100 text-green-800";
    case "refurbished":
      return "bg-blue-100 text-blue-800";
    case "used":
      return "bg-yellow-100 text-yellow-800";
    case "damaged":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case "active":
      return "bg-green-100 text-green-800";
    case "planned":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-gray-100 text-gray-800";
    case "on hold":
      return "bg-yellow-100 text-yellow-800";
    case "reserved":
      return "bg-orange-100 text-orange-800";
    case "ready for pickup":
      return "bg-indigo-100 text-indigo-800";
    case "picked up":
      return "bg-purple-100 text-purple-800";
    case "returned":
      return "bg-teal-100 text-teal-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getAvailableQuantity(
  totalQuantity: number,
  reservations: { quantity: number; status: string }[]
): number {
  const reserved = reservations
    .filter((r) => r.status === "Reserved")
    .reduce((sum, r) => sum + r.quantity, 0);
  return totalQuantity - reserved;
}
