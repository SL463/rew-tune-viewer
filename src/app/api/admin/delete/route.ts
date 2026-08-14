import { NextRequest, NextResponse } from "next/server";
import { deleteTune } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: { id?: string };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!payload.id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  await deleteTune(payload.id);
  return NextResponse.json({ ok: true });
}
