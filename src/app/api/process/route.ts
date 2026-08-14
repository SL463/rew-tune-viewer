import { NextRequest, NextResponse } from "next/server";
import { parseMdat } from "@/lib/rew/parseMdat";
import { saveTune, slugId } from "@/lib/store";

export const runtime = "nodejs";
export const maxDuration = 60;

// Fetches a previously-uploaded raw .mdat from Blob, parses it, and stores the
// processed tune (SPL 1/6-oct smoothed + impulse). Behind Basic Auth.
export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: { rawUrl?: string; name?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { rawUrl, name } = payload;
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing rawUrl" }, { status: 400 });
  }

  const res = await fetch(rawUrl, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json(
      { error: `Could not fetch raw file (${res.status})` },
      { status: 400 }
    );
  }
  const buf = Buffer.from(await res.arrayBuffer());

  let tune;
  try {
    tune = parseMdat(buf);
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse .mdat: ${(err as Error).message}` },
      { status: 422 }
    );
  }

  if (!tune.measurements.length) {
    return NextResponse.json(
      { error: "No measurements found in file" },
      { status: 422 }
    );
  }

  const displayName = (name || "Untitled tune").replace(/\.mdat$/i, "").trim();
  const id = slugId(displayName);
  const meta = await saveTune(id, displayName, tune, rawUrl);

  return NextResponse.json({ ok: true, id: meta.id, meta });
}
