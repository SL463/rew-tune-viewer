import { NextResponse } from "next/server";
import { listTunes } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const tunes = await listTunes();
  return NextResponse.json({ tunes });
}
