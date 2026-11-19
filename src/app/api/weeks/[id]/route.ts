import { NextResponse } from "next/server";
import { err, ownerOf } from "@/lib/api";
import { weekState } from "@/lib/service";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const owner = await ownerOf();
  if (!owner) return err(401, "No owner cookie");
  const { id } = await ctx.params;
  const s = await weekState(owner, id);
  if (!s) return err(404, "Week not found");
  return NextResponse.json({
    week: s.week,
    days: s.days.map((d, i) => ({ id: d.id, idx: d.idx, date: d.date, covers: d.covers, actualCovers: d.actualCovers, portions: s.plans[i].portions })),
    factors: s.factors,
    ingredients: s.results.map((r) => ({ id: r.ing.id, weekGross: r.weekGross, dailyGross: r.dailyGross, target: r.target, recommendedOrder: r.recommendedOrder, standingOrder: r.standingOrder, flag: r.flag, formula: r.formula })),
  });
}
