import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { ensureOwnerWeeks, takeWrite } from "./store";

export const MAX_BODY = 20 * 1024;
export const err = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function ownerOf(): Promise<string | null> {
  const id = (await headers()).get("x-pf-uid") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  await ensureOwnerWeeks(id);
  return id;
}

/** Parses a JSON write body: enforces 20KB cap (413) and the 120 writes/hour/owner limit (429). */
export async function writeBody(req: Request, owner: string): Promise<{ body: Record<string, unknown> } | { res: NextResponse }> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return { res: err(413, "Body too large (20KB max)") };
  const text = await req.text();
  if (text.length > MAX_BODY) return { res: err(413, "Body too large (20KB max)") };
  let body: unknown;
  try { body = JSON.parse(text || "{}"); } catch { return { res: err(400, "Invalid JSON") }; }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return { res: err(400, "Body must be an object") };
  const t = await takeWrite(owner);
  if (!t.ok) return { res: NextResponse.json({ error: "Rate limit: 120 writes per hour" }, { status: 429, headers: { "Retry-After": "3600" } }) };
  return { body: body as Record<string, unknown> };
}

export const isCovers = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 10000;
