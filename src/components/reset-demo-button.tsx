"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

/**
 * One-click "Reset demo data" control for the deployed demo. Lets a presenter
 * restore the pristine sample data (15 parts / 295 units) between practice runs
 * without any terminal or code access.
 */
export function ResetDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleReset = async () => {
    if (busy) return;
    const ok = window.confirm(
      "Reset the demo to its original state?\n\nThis restores 15 parts / 295 units and clears any changes made during the demo."
    );
    if (!ok) return;

    setBusy(true);
    setDone(false);
    try {
      const res = await fetch("/api/demo/reset", { method: "POST" });
      if (!res.ok) throw new Error("Reset failed");
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 3000);
    } catch {
      window.alert("Sorry, the demo reset failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleReset}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 hover:text-gray-900 disabled:opacity-60"
      title="Restore the original demo data (15 parts / 295 units)"
    >
      <RefreshCw className={"w-4 h-4 " + (busy ? "animate-spin" : "")} />
      {busy ? "Resetting..." : done ? "Demo reset" : "Reset demo data"}
    </button>
  );
}
