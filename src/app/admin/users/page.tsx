"use client";

import { PageHeader } from "@/components/layout";
import { useEffect, useState } from "react";

type User = {
  id: string;
  email: string;
  displayName: string | null;
  role: "ADMIN" | "MANAGER" | "WORKER";
  active: boolean;
};

export default function UserAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<User["role"]>("WORKER");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/admin/users");
    if (response.ok) setUsers(await response.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function invite() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const body = await response.json();
    setMessage(response.ok ? `Invitation sent to ${email}` : body.error);
    if (response.ok) {
      setEmail("");
      await load();
    }
    setBusy(false);
  }

  async function updateUser(id: string, patch: Partial<Pick<User, "role" | "active">>) {
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (response.ok) await load();
    else setMessage((await response.json()).error);
  }

  return (
    <div>
      <PageHeader
        title="User administration"
        description="Invite employees and control warehouse access"
      />
      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Invite user</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input
            aria-label="Work email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <select
            aria-label="Role"
            value={role}
            onChange={(event) => setRole(event.target.value as User["role"])}
            className="rounded-lg border border-gray-300 px-3 py-2"
          >
            <option value="WORKER">Worker</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            type="button"
            onClick={invite}
            disabled={busy || !email}
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {busy ? "Sending..." : "Send invitation"}
          </button>
        </div>
        {message && <p role="status" className="mt-3 text-sm text-gray-600">{message}</p>}
      </section>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{user.displayName || user.email}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <select
                    aria-label={`Role for ${user.email}`}
                    value={user.role}
                    onChange={(event) =>
                      updateUser(user.id, { role: event.target.value as User["role"] })
                    }
                    className="rounded border border-gray-300 px-2 py-1.5"
                  >
                    <option value="WORKER">Worker</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => updateUser(user.id, { active: !user.active })}
                    className={`rounded px-3 py-1.5 font-medium ${
                      user.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {user.active ? "Active" : "Disabled"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
