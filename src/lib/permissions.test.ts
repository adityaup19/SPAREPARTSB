import { describe, expect, it } from "vitest";
import { bootstrapAdminEmails, canBootstrapAdmin, hasPermission } from "./permissions";

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

describe("first admin bootstrap", () => {
  const allowedEmails = bootstrapAdminEmails(" Warehouse.Admin@company.com , ops@company.com ");

  it("promotes a listed email only while no admin exists", () => {
    expect(
      canBootstrapAdmin({
        email: "warehouse.admin@company.com",
        activeAdminCount: 0,
        allowedEmails,
      })
    ).toBe(true);
  });

  it("stops having any effect once an admin exists", () => {
    expect(
      canBootstrapAdmin({
        email: "warehouse.admin@company.com",
        activeAdminCount: 1,
        allowedEmails,
      })
    ).toBe(false);
  });

  it("never promotes an unlisted email", () => {
    expect(
      canBootstrapAdmin({ email: "intern@company.com", activeAdminCount: 0, allowedEmails })
    ).toBe(false);
  });

  it("grants nobody access when the variable is unset", () => {
    expect(
      canBootstrapAdmin({
        email: "anyone@company.com",
        activeAdminCount: 0,
        allowedEmails: bootstrapAdminEmails(undefined),
      })
    ).toBe(false);
  });
});
