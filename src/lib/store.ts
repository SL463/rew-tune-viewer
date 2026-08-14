import { put, list, del } from "@vercel/blob";
import type { ParsedTune, TuneMeta } from "@/lib/types";
export type { TuneMeta, MeasurementMeta } from "@/lib/types";

const PREFIX = "tunes/";

export function slugId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/\.mdat$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const stamp = Date.now().toString(36);
  return `${base || "tune"}-${stamp}`;
}

export async function saveTune(
  id: string,
  displayName: string,
  tune: ParsedTune,
  rawUrl?: string
): Promise<TuneMeta> {
  const dataBlob = await put(`${PREFIX}${id}/data.json`, JSON.stringify(tune), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 31536000,
  });

  const meta: TuneMeta = {
    id,
    name: displayName,
    uploadedAt: new Date().toISOString(),
    measCount: tune.measurements.length,
    dataUrl: dataBlob.url,
    rawUrl,
    measurements: tune.measurements.map((m) => ({
      id: m.id,
      name: m.name,
      band: m.band,
      channel: m.channel,
      group: m.group,
      sortIndex: m.sortIndex,
      hasImpulse: !!m.impulse,
    })),
  };

  await put(`${PREFIX}${id}/meta.json`, JSON.stringify(meta), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });

  return meta;
}

export async function listTunes(): Promise<TuneMeta[]> {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  const metaBlobs = blobs.filter((b) => b.pathname.endsWith("/meta.json"));
  const metas = await Promise.all(
    metaBlobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: "no-store" });
        if (!res.ok) return null;
        return (await res.json()) as TuneMeta;
      } catch {
        return null;
      }
    })
  );
  return metas
    .filter((m): m is TuneMeta => m !== null)
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export async function getTuneMeta(id: string): Promise<TuneMeta | null> {
  const { blobs } = await list({ prefix: `${PREFIX}${id}/meta.json`, limit: 1 });
  if (!blobs.length) return null;
  const res = await fetch(blobs[0].url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as TuneMeta;
}

export async function deleteTune(id: string): Promise<void> {
  const { blobs } = await list({ prefix: `${PREFIX}${id}/`, limit: 1000 });
  if (blobs.length) {
    await del(blobs.map((b) => b.url));
  }
}
