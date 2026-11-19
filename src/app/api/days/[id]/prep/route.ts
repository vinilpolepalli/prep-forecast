import { NextResponse } from "next/server";
import { err, ownerOf, writeBody } from "@/lib/api";
import { MENU } from "@/lib/data";
import * as store from "@/lib/store";

// POST { key: menuItemId, done: boolean }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerOf();
  if (!owner) return err(401, "No owner cookie");
  const { id } = await ctx.params;
  if (!(await store.getDay(owner, id))) return err(404, "Day not found");
  const w = await writeBody(req, owner);
  if ("res" in w) return w.res;
  const { key, done } = w.body;
  if (typeof key !== "string" || !MENU.some((m) => m.id === key) || typeof done !== "boolean") return err(400, "key and done required");
  await store.setCheck(owner, id, key, done);
  return NextResponse.json({ key, done });
}
