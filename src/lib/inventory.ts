import { prisma } from "@/lib/db";
import { Prisma, type ActivityType, type PrismaClient } from "@prisma/client";

/**
 * Business logic for inventory management.
 *
 * Quantity model:
 *  - totalQuantity: physical units currently held in the warehouse.
 *  - reservedQuantity: units committed to active reservations
 *    (status "Reserved" or "Ready for Pickup"). This is a denormalized
 *    field kept in sync via `recomputeReservedQuantity`.
 *  - availableQuantity: derived, never stored -> totalQuantity - reservedQuantity.
 */

export const RESERVATION_STATUSES = [
  "Reserved",
  "Ready for Pickup",
  "Picked Up",
  "Returned",
  "Cancelled",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

/** Statuses that still hold units in the warehouse against availability. */
export const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "Reserved",
  "Ready for Pickup",
];

export function computeAvailable(part: {
  totalQuantity: number;
  reservedQuantity: number;
}): number {
  return Math.max(0, part.totalQuantity - part.reservedQuantity);
}

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Recalculate and persist reservedQuantity for a part based on its active
 * reservation rows. Keeps the denormalized value consistent after any change.
 */
export async function recomputeReservedQuantity(
  db: Db,
  partId: string
): Promise<number> {
  const active = await db.reservation.findMany({
    where: { partId, status: { in: ACTIVE_RESERVATION_STATUSES } },
    select: { quantity: true },
  });
  const reservedQuantity = active.reduce((sum, r) => sum + r.quantity, 0);
  await db.part.update({
    where: { id: partId },
    data: { reservedQuantity },
  });
  return reservedQuantity;
}

export async function logActivity(
  db: Db,
  data: {
    type: ActivityType;
    details?: string;
    partId?: string | null;
    projectId?: string | null;
    actorId?: string | null;
    source?: "WEB" | "SCAN" | "IMPORT" | "SYSTEM";
    metadata?: Prisma.InputJsonValue;
  }
): Promise<void> {
  await db.activity.create({
    data: {
      type: data.type,
      details: data.details,
      partId: data.partId ?? null,
      projectId: data.projectId ?? null,
      actorId: data.actorId ?? null,
      source: data.source ?? "WEB",
      metadata: data.metadata,
    },
  });
}

/** Retry serializable transactions that collide under concurrent warehouse use. */
export async function withSerializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  attempts = 3
): Promise<T> {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034";
      if (!retryable || attempt === attempts) throw error;
    }
  }
  throw new Error("Transaction retry limit exceeded");
}

/** Human-friendly label for an activity type (for UI display). */
export function activityLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    PART_CREATED: "Part Added",
    PART_UPDATED: "Part Updated",
    PART_DELETED: "Part Deleted",
    QUANTITY_ADDED: "Quantity Added",
    QUANTITY_REMOVED: "Quantity Removed",
    PART_MOVED: "Part Moved",
    RESERVATION_CREATED: "Reservation Created",
    RESERVATION_UPDATED: "Reservation Updated",
    RESERVATION_READY: "Ready for Pickup",
    RESERVATION_CANCELLED: "Reservation Cancelled",
    PART_PICKED_UP: "Picked Up",
    PART_RETURNED: "Returned",
    PROJECT_CREATED: "Project Created",
    PROJECT_UPDATED: "Project Updated",
    PROJECT_DELETED: "Project Deleted",
    INVENTORY_IMPORTED: "Inventory Imported",
    INVENTORY_EXPORTED: "Inventory Exported",
    USER_INVITED: "User Invited",
    USER_ROLE_CHANGED: "User Access Updated",
    USER_REMOVED: "User Removed",
  };
  return labels[type] ?? type;
}

/** Build a single-line location string from structured location fields. */
export function formatLocation(part: {
  location?: string | null;
  aisle?: string | null;
  shelf?: string | null;
  bin?: string | null;
}): string {
  const parts: string[] = [];
  if (part.location) parts.push(part.location);
  if (part.aisle) parts.push(`Aisle ${part.aisle}`);
  if (part.shelf) parts.push(`Shelf ${part.shelf}`);
  if (part.bin) parts.push(`Bin ${part.bin}`);
  return parts.length > 0 ? parts.join(", ") : "Unassigned";
}

/**
 * Apply the quantity/status side effects of a reservation status transition.
 * Returns the totalQuantity delta that should be applied to the part.
 *  - Picked Up  -> physical units leave the warehouse (total decreases)
 *  - Returned   -> physical units come back (total increases)
 */
export function totalQuantityDeltaForTransition(
  from: string,
  to: string,
  quantity: number
): number {
  const wasPickedUp = from === "Picked Up";
  const isPickedUp = to === "Picked Up";
  const isReturned = to === "Returned";

  if (!wasPickedUp && isPickedUp) return -quantity;
  if (wasPickedUp && isReturned) return quantity;
  if (wasPickedUp && !isPickedUp && !isReturned) return quantity; // reverted out of picked up
  return 0;
}

export function activityTypeForStatus(status: string): ActivityType {
  switch (status) {
    case "Ready for Pickup":
      return "RESERVATION_READY";
    case "Picked Up":
      return "PART_PICKED_UP";
    case "Returned":
      return "PART_RETURNED";
    case "Cancelled":
      return "RESERVATION_CANCELLED";
    default:
      return "RESERVATION_UPDATED";
  }
}

export { prisma };
