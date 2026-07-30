"use client";

import { PageHeader } from "@/components/layout";
import { useCurrentUser } from "@/components/auth-provider";
import { useCallback, useEffect, useState } from "react";

type Role = "ADMIN" | "MANAGER" | "WORKER";

type User = {
  id: string;
  email: string;
  displayName: string | null;
  role: Role;
  active: boolean;
};

const ROLE_HELP: Record<Role, string> = {
  ADMIN: "Full access, including users and imports",
  MANAGER: "Inventory, reservations, projects, and audit",
  WORKER: "Scan, receive, and look up parts",
};

export default function UserAdminPage() {
  const currentUser = useCurrentUser();
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("WORKER");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    if (response.ok) {
      setUsers(await response.json());
      setError("");
    } else {
      setError((await response.json()).error ?? "Unable to load users.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite() {
    setBusy(true);
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const body = await response.json();
    if (response.ok) {
      setMessage(
        body.reused
          ? `${email} already had a sign-in, so access was granted directly. They can sign in now.`
          : `Invitation emailed to ${email}. They set a password from that link.`
      );
      setEmail("");
      await load();
    } else {
      setError(body.error ?? "Unable to invite user.");
    }
    setBusy(false);
  }

  async function updateUser(id: string, patch: Partial<Pick<User, "role" | "active">>) {
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (response.ok) await load();
    else setError((await response.json()).error ?? "Unable to update user.");
  }

  async function resendInvite(user: User) {
    setMessage("");
    setError("");
    setBusy(true);
    const response = await fetch(`/api/admin/users/${user.id}/resend-invite`, {
      method: "POST",
    });
    const body = await response.json();
    if (response.ok) setMessage(body.message);
    else setError(body.error ?? "Unable to resend the invitation.");
    setBusy(false);
  }

  async function removeUser(user: User) {
    if (
      !window.confirm(
        `Remove ${user.email}? They lose access immediately and their sign-in is deleted. Their history stays in the audit trail.`
      )
    ) {
      return;
    }
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const body = await response.json();
    if (response.ok) {
      setMessage(body.warning ?? `${user.email} was removed.`);
      await load();
    } else {
      setError(body.error ?? "Unable to remove user.");
    }
  }

  return (
    <div>
      <PageHeader
        title="User administration"
        description="Invite employees, set roles, and control warehouse access"
      />

      <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-900">Invite user</h2>
        <p className="mt-1 text-sm text-gray-500">
          Roles take effect immediately, with no redeploy.
        </p>
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
            onChange={(event) => setRole(event.target.value as Role)}
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
        <p className="mt-2 text-sm text-gray-500">{ROLE_HELP[role]}</p>
        {message && (
          <p role="status" className="mt-3 text-sm text-green-700">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}
      </section>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  Loading users...
                </td>
              </tr>
            )}
            {!loading && !users.length && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const isSelf = user.id === currentUser.id;
              return (
                <tr key={user.id} className={user.active ? "" : "bg-gray-50"}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">
                      {user.displayName || user.email}
                      {isSelf && (
                        <span className="ml-2 rounded bg-primary-50 px-1.5 py-0.5 text-xs font-medium text-primary-700">
                          You
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Role for ${user.email}`}
                      value={user.role}
                      disabled={isSelf}
                      onChange={(event) =>
                        updateUser(user.id, { role: event.target.value as Role })
                      }
                      className="rounded border border-gray-300 px-2 py-1.5 disabled:bg-gray-100 disabled:text-gray-500"
                    >
                      <option value="WORKER">Worker</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => updateUser(user.id, { active: !user.active })}
                      className={`rounded px-3 py-1.5 font-medium disabled:opacity-60 ${
                        user.active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {user.active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => resendInvite(user)}
                        disabled={busy || !user.active}
                        title="Email a fresh link to set a password"
                        className="rounded px-3 py-1.5 font-medium text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                      >
                        Resend invite
                      </button>
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => removeUser(user)}
                          className="rounded px-3 py-1.5 font-medium text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-gray-500">
        Invited users set their own password from the emailed link. If that link
        expired, use <strong>Resend invite</strong>. Disabling keeps a
        person&apos;s history and lets you restore access later. Removing deletes
        their sign-in; audit entries stay, attributed to their email address.
      </p>
    </div>
  );
}
