import { describe, expect, it } from "vitest";
import {
  activityTypeForStatus,
  computeAvailable,
  totalQuantityDeltaForTransition,
} from "./inventory";

describe("inventory availability", () => {
  it("subtracts active reservations from physical stock", () => {
    expect(computeAvailable({ totalQuantity: 12, reservedQuantity: 3 })).toBe(9);
  });

  it("never presents corrupt negative availability", () => {
    expect(computeAvailable({ totalQuantity: 2, reservedQuantity: 3 })).toBe(0);
  });
});

describe("reservation stock transitions", () => {
  it("removes physical stock only when picked up", () => {
    expect(totalQuantityDeltaForTransition("Ready for Pickup", "Picked Up", 4)).toBe(-4);
  });

  it("restores physical stock when a pickup is returned", () => {
    expect(totalQuantityDeltaForTransition("Picked Up", "Returned", 4)).toBe(4);
  });

  it("does not change stock when a reservation is cancelled", () => {
    expect(totalQuantityDeltaForTransition("Reserved", "Cancelled", 4)).toBe(0);
  });
});

describe("audit activity mapping", () => {
  it("maps operational statuses to specific audit events", () => {
    expect(activityTypeForStatus("Ready for Pickup")).toBe("RESERVATION_READY");
    expect(activityTypeForStatus("Picked Up")).toBe("PART_PICKED_UP");
    expect(activityTypeForStatus("Returned")).toBe("PART_RETURNED");
  });
});
