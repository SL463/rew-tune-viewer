"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus("error");
      setMessage("Choose a .mdat file first.");
      return;
    }
    try {
      setStatus("uploading");
      setMessage("Uploading file…");
      const origin = window.location.origin;
      const blob = await upload(`raw/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: `${origin}/api/blob-upload`,
        multipart: true,
        contentType: "application/octet-stream",
      });

      setStatus("processing");
      setMessage("Parsing measurements…");
      const res = await fetch(`${origin}/api/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawUrl: blob.url, name: name || file.name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Processing failed");

      setStatus("done");
      setMessage("Done! Redirecting…");
      router.push(`/tune/${json.id}`);
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
    }
  }

  const busy = status === "uploading" || status === "processing";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Upload a Tune</h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload a REW <code>.mdat</code> measurement file. SPL data is stored
          pre-smoothed to 1/6 octave.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Display name (optional)
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Living room — Aug 2026"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-slate-300">
            Measurement file
          </label>
          <input
            ref={fileRef}
            type="file"
            accept=".mdat,application/octet-stream"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-white hover:file:bg-slate-600"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
        >
          {busy ? "Working…" : "Upload & process"}
        </button>
      </form>

      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            status === "error"
              ? "bg-red-950/40 text-red-300"
              : "bg-slate-800/60 text-slate-300"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
