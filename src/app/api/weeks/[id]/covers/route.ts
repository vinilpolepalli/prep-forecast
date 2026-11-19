import { NextResponse } from "next/server";
import { err, isCovers, ownerOf, writeBody } from "@/lib/api";
import * as store from "@/lib/store";
import { weekState } from "@/lib/service";

// POST { covers: number[7] }  or  { day: 0-6, covers: number }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerOf();
  if (!owner) return err(401, "No owner cookie");
  const { id } = await ctx.params;
  const week = await store.getWeek(owner, id);
  if (!week) return err(404, "Week not found");
  const w = await writeBody(req, owner);
  if ("res" in w) return w.res;
  const days = await store.getWeekDays(owner, id);
  const next = days.map((d) => d.covers);
  const b = w.body;
  let reason: string;
  if (Array.isArray(b.covers)) {
    if (b.covers.length !== 7 || !b.covers.every(isCovers)) return err(400, "covers must be 7 integers 0-10000");
    b.covers.forEach((c, i) => (next[i] = c as number));
    reason = "week covers edited";
  } else {
    if (typeof b.day !== "number" || !Number.isInteger(b.day) || b.day < 0 || b.day > 6) return err(400, "day must be 0-6");
    if (!isCovers(b.covers)) return err(400, "covers must be an integer 0-10000");
    next[b.day] = b.covers;
    reason = `day ${b.day} covers ${days[b.day].covers} -> ${b.covers}`;
  }
  const locked = days.filter((d, i) => d.actualItems && d.covers !== next[i]);
  if (locked.length) return err(409, "Days with actuals are locked");
  const revision = await store.setCovers(owner, week, next, reason);
  const s = await weekState(owner, id);
  return NextResponse.json({ revision, covers: next, ingredients: s!.results.map((r) => ({ id: r.ing.id, weekGross: r.weekGross, recommendedOrder: r.recommendedOrder, flag: r.flag })) });
}
