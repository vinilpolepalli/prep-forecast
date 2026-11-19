import { NextResponse } from "next/server";
import { err, isCovers, ownerOf, writeBody } from "@/lib/api";
import { MENU } from "@/lib/data";
import { defaultActualItems, factorsOf, portionsFor, type ItemQty } from "@/lib/engine";
import * as store from "@/lib/store";
import { biasFor } from "@/lib/service";

// POST { covers: int, items?: { [menuItemId]: int } }. Items default to actual covers at the forecast mix.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerOf();
  if (!owner) return err(401, "No owner cookie");
  const { id } = await ctx.params;
  const day = await store.getDay(owner, id);
  if (!day) return err(404, "Day not found");
  const w = await writeBody(req, owner);
  if ("res" in w) return w.res;
  if (day.date > store.todayStr()) return err(409, "Cannot enter actuals for a future day");
  const { covers, items } = w.body;
  if (!isCovers(covers)) return err(400, "covers must be an integer 0-10000");
  let actual: ItemQty = defaultActualItems(covers);
  if (items !== undefined) {
    if (typeof items !== "object" || items === null || Array.isArray(items)) return err(400, "items must be an object");
    for (const [k, v] of Object.entries(items)) {
      if (!MENU.some((m) => m.id === k)) return err(400, `unknown item ${k}`);
      if (!isCovers(v)) return err(400, `item ${k} must be an integer 0-10000`);
      actual[k] = v as number;
    }
  }
  const base = portionsFor(day.covers);
  // What the desk showed for this day = base x factors from all OTHER days' actuals.
  const f = factorsOf(await biasFor(owner, day.id));
  const adjusted = Object.fromEntries(MENU.map((m) => [m.id, base[m.id] * (f[m.id] ?? 1)]));
  await store.saveActuals(owner, day, covers, actual, base, adjusted);
  const bias = await biasFor(owner);
  return NextResponse.json({ dayId: id, covers, items: actual, bias: bias.map((b) => ({ id: b.id, bias: b.bias, factor: b.factor })) });
}
