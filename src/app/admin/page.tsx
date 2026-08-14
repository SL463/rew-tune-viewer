"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { TuneMeta } from "@/lib/types";

export default function AdminPage() {
  const [tunes, setTunes] = useState<TuneMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${window.location.origin}/api/tunes`, {
        cache: "no-store",
      });
      const json = await res.json();
      setTunes(json.tunes ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`${window.location.origin}/api/admin/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Delete failed");
      }
      setTunes((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Admin</h1>
          <p className="mt-1 text-sm text-slate-400">Manage uploaded tunes.</p>
        </div>
        <Link
          href="/upload"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Upload tune
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-slate-500">Loading…</div>
      ) : tunes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
          No tunes uploaded.
        </div>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-slate-500">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Measurements</th>
              <th className="py-2 pr-4 font-medium">Uploaded</th>
              <th className="py-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tunes.map((t) => (
              <tr key={t.id} className="border-b border-slate-900">
                <td className="py-2 pr-4">
                  <Link href={`/tune/${t.id}`} className="text-sky-400 hover:underline">
                    {t.name}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-slate-400">{t.measCount}</td>
                <td className="py-2 pr-4 text-slate-400">
                  {new Date(t.uploadedAt).toLocaleString()}
                </td>
                <td className="py-2 pr-4 text-right">
                  <button
                    onClick={() => remove(t.id, t.name)}
                    disabled={busyId === t.id}
                    className="rounded-md border border-red-900/60 bg-red-950/30 px-2.5 py-1 text-xs text-red-300 hover:bg-red-900/40 disabled:opacity-50"
                  >
                    {busyId === t.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
