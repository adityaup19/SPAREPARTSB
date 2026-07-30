import { describe, expect, it } from "vitest";
import { resolveSiteUrl, safeNextPath } from "./site-url";

describe("invitation link base URL", () => {
  it("prefers the configured production domain", () => {
    expect(
      resolveSiteUrl(
        {
          NEXT_PUBLIC_SITE_URL: "https://sparepartsb.vercel.app/",
          VERCEL_PROJECT_PRODUCTION_URL: "other.vercel.app",
        },
        "https://preview-abc.vercel.app"
      )
    ).toBe("https://sparepartsb.vercel.app");
  });

  it("falls back to the Vercel production host over the preview host", () => {
    expect(
      resolveSiteUrl(
        {
          VERCEL_PROJECT_PRODUCTION_URL: "sparepartsb.vercel.app",
          VERCEL_URL: "sparepartsb-git-branch.vercel.app",
        },
        "https://sparepartsb-git-branch.vercel.app"
      )
    ).toBe("https://sparepartsb.vercel.app");
  });

  it("uses localhost only when nothing is deployed", () => {
    expect(resolveSiteUrl({}, "http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("ignores blank configuration", () => {
    expect(
      resolveSiteUrl({ NEXT_PUBLIC_SITE_URL: "   " }, "https://sparepartsb.vercel.app")
    ).toBe("https://sparepartsb.vercel.app");
  });
});

describe("post-login redirect safety", () => {
  it("keeps in-app paths", () => {
    expect(safeNextPath("/auth/set-password")).toBe("/auth/set-password");
  });

  it("rejects absolute and protocol-relative destinations", () => {
    expect(safeNextPath("https://evil.example.com")).toBe("/");
    expect(safeNextPath("//evil.example.com")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
