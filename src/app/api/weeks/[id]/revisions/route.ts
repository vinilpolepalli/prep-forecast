import { NextResponse } from "next/server";
import { err, ownerOf } from "@/lib/api";
import * as store from "@/lib/store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerOf();
  if (!owner) return err(401, "No owner cookie");
  const { id } = await ctx.params;
  if (!(await store.getWeek(owner, id))) return err(404, "Week not found");
  return NextResponse.json({ revisions: await store.listRevisions(owner, id) });
}
