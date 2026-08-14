import Link from "next/link";
import { listTunes } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tunes = await listTunes();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Measurement Tunes</h1>
          <p className="mt-1 text-sm text-slate-400">
            Read-only SPL and impulse views from REW measurement files.
          </p>
        </div>
        <Link
          href="/upload"
          prefetch={false}
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
        >
          Upload tune
        </Link>
      </div>

      {tunes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">
          No tunes yet. Upload a REW <code>.mdat</code> file to get started.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tunes.map((t) => (
            <li key={t.id}>
              <Link
                href={`/tune/${t.id}`}
                className="block rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-sky-600 hover:bg-slate-900"
              >
                <div className="truncate font-medium text-white">{t.name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {t.measCount} measurements ·{" "}
                  {new Date(t.uploadedAt).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
