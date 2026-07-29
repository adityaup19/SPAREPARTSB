"use client";

import { PageHeader } from "@/components/layout";
import { useState } from "react";

type Preview = {
  summary: { valid: number; invalid: number; newParts: number; existingParts: number };
  rows: { row: number; partNumber: string; name: string; quantity: number; location: string }[];
  errors: { row: number; error: string }[];
};

export default function InventoryImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [strategy, setStrategy] = useState("merge");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(mode: "preview" | "import") {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const data = new FormData();
    data.append("file", file);
    data.append("mode", mode);
    data.append("strategy", strategy);
    const response = await fetch("/api/inventory/import", { method: "POST", body: data });
    const body = await response.json();
    if (response.ok && mode === "preview") setPreview(body);
    else if (response.ok) {
      setMessage(`Import complete: ${body.created} created, ${body.updated} updated, ${body.rejected} rejected.`);
      setPreview(null);
    } else setMessage(body.error || "Import failed");
    setBusy(false);
  }

  return (
    <div>
      <PageHeader
        title="Import inventory"
        description="Validate an Excel or CSV file before changing warehouse records"
        actions={
          <a
            href="/api/inventory/export"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Export inventory CSV
          </a>
        }
      />
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <label htmlFor="inventory-file" className="block text-sm font-medium text-gray-700">
          Excel or CSV file
        </label>
        <input
          id="inventory-file"
          type="file"
          accept=".xlsx,.csv"
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setPreview(null);
          }}
          className="mt-2 block w-full text-sm"
        />
        <button
          type="button"
          disabled={!file || busy}
          onClick={() => submit("preview")}
          className="mt-5 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {busy ? "Reading file..." : "Validate and preview"}
        </button>
        {message && <p role="status" className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">{message}</p>}
      </div>

      {preview && (
        <section className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(preview.summary).map(([key, value]) => (
              <div key={key} className="rounded-lg border bg-white p-4">
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs capitalize text-gray-500">{key.replace(/([A-Z])/g, " $1")}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-white p-5">
            <label htmlFor="strategy" className="text-sm font-medium">When a part number already exists</label>
            <select
              id="strategy"
              value={strategy}
              onChange={(event) => setStrategy(event.target.value)}
              className="ml-3 rounded border border-gray-300 px-3 py-2"
            >
              <option value="merge">Add imported quantity to current stock</option>
              <option value="skip">Skip existing parts</option>
              <option value="replace">Replace details and quantity</option>
            </select>
            <button
              type="button"
              disabled={busy || preview.summary.valid === 0}
              onClick={() => submit("import")}
              className="mt-4 block rounded-lg bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            >
              Confirm import
            </button>
          </div>
          <div className="overflow-x-auto rounded-xl border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50"><tr><th className="p-3">Row</th><th className="p-3">Part</th><th className="p-3">Name</th><th className="p-3">Qty</th><th className="p-3">Location</th></tr></thead>
              <tbody className="divide-y">
                {preview.rows.map((row) => (
                  <tr key={`${row.row}-${row.partNumber}`}><td className="p-3">{row.row}</td><td className="p-3">{row.partNumber}</td><td className="p-3">{row.name}</td><td className="p-3">{row.quantity}</td><td className="p-3">{row.location}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <h2 className="font-semibold text-red-800">Rows requiring correction</h2>
              {preview.errors.map((error) => <p key={error.row} className="mt-1 text-sm text-red-700">Row {error.row}: {error.error}</p>)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
