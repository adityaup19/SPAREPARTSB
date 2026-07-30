"use client";

import { PageHeader } from "@/components/layout";
import { formatDateTime } from "@/lib/utils";
import { useEffect, useState } from "react";

type Activity = {
  id: string;
  type: string;
  details: string | null;
  source: string;
  createdAt: string;
  actor: { email: string; displayName: string | null; role: string } | null;
  metadata: { actorEmail?: string } | null;
  part: { name: string; partNumber: string } | null;
  project: { name: string } | null;
};

function actorLabel(item: Activity) {
  if (item.actor) return item.actor.displayName || item.actor.email;
  if (item.metadata?.actorEmail) return `${item.metadata.actorEmail} (removed)`;
  return "System";
}

export default function AuditPage() {
  const [items, setItems] = useState<Activity[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      const response = await fetch(`/api/audit?search=${encodeURIComponent(search)}`);
      if (!response.ok) {
        setError("Unable to load audit history.");
        return;
      }
      setError("");
      setItems((await response.json()).items);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div>
      <PageHeader
        title="Audit history"
        description="Who changed warehouse data, what changed, and when"
        actions={
          <a href="/api/audit/export" className="rounded-lg border bg-white px-4 py-2 text-sm font-medium">
            Export audit CSV
          </a>
        }
      />
      <input
        aria-label="Search audit history"
        placeholder="Search user, part number, or activity"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="mb-4 w-full max-w-lg rounded-lg border border-gray-300 px-3 py-2"
      />
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Record</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="px-4 py-3">{actorLabel(item)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{item.type.replaceAll("_", " ")}</p>
                  <p className="text-gray-500">{item.details}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {item.part ? `${item.part.name} (${item.part.partNumber})` : item.project?.name || "—"}
                </td>
                <td className="px-4 py-3">{item.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
