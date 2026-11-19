import { NextResponse } from "next/server";
import { err, ownerOf, writeBody } from "@/lib/api";
import { INGREDIENTS } from "@/lib/data";
import * as store from "@/lib/store";
import { weekState } from "@/lib/service";

// POST { ingredientId, ordered: boolean }  - records the currently recommended qty when marking ordered.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerOf();
  if (!owner) return err(401, "No owner cookie");
  const { id } = await ctx.params;
  if (!(await store.getWeek(owner, id))) return err(404, "Week not found");
  const w = await writeBody(req, owner);
  if ("res" in w) return w.res;
  const { ingredientId, ordered } = w.body;
  if (typeof ingredientId !== "string" || !INGREDIENTS.some((i) => i.id === ingredientId) || typeof ordered !== "boolean") return err(400, "ingredientId and ordered required");
  const s = await weekState(owner, id);
  const qty = s!.results.find((r) => r.ing.id === ingredientId)!.recommendedOrder;
  await store.setOrder(owner, id, ingredientId, ordered ? qty : null);
  return NextResponse.json({ ingredientId, ordered, qty: ordered ? qty : null });
}
