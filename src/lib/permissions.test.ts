import { describe, expect, it } from "vitest";
import { hasPermission } from "./permissions";

describe("role permissions", () => {
  it("lets workers receive and move stock but blocks management", () => {
    expect(hasPermission("WORKER", "inventory:receive")).toBe(true);
    expect(hasPermission("WORKER", "inventory:move")).toBe(true);
    expect(hasPermission("WORKER", "reservation:manage")).toBe(false);
    expect(hasPermission("WORKER", "inventory:delete")).toBe(false);
  });

  it("lets managers operate workflows without destructive administration", () => {
    expect(hasPermission("MANAGER", "inventory:manage")).toBe(true);
    expect(hasPermission("MANAGER", "project:manage")).toBe(true);
    expect(hasPermission("MANAGER", "user:manage")).toBe(false);
    expect(hasPermission("MANAGER", "inventory:delete")).toBe(false);
  });

  it("reserves user and destructive controls for admins", () => {
    expect(hasPermission("ADMIN", "user:manage")).toBe(true);
    expect(hasPermission("ADMIN", "inventory:delete")).toBe(true);
  });
});
