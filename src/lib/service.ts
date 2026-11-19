import { DAYS, INGREDIENTS, MENU } from "./data";
import { analyze, computeBias, factorsOf, needsFor, planDays, portionsFor, reviewDays, type DayPlan, type ItemQty } from "./engine";
import * as store from "./store";

/** Bias is computed from every actual the owner has entered, optionally excluding one day (when re-entering it). */
export async function biasFor(owner: string, excludeDayId?: string) {
  const all = (await store.allActualDays(owner)).filter((d) => d.id !== excludeDayId);
  return computeBias(all.map((d) => ({ date: d.date, baseForecast: d.frozenBase ?? {}, actual: d.actualItems ?? {} })));
}

export async function weekState(owner: string, weekId: string) {
  const week = await store.getWeek(owner, weekId);
  if (!week) return null;
  const days = await store.getWeekDays(owner, weekId);
  const bias = await biasFor(owner);
  const factors = factorsOf(bias);
  const plans: DayPlan[] = planDays(days.map((d) => d.covers), factors).map((p, i) => {
    const d = days[i];
    // Days with actuals contribute what was really sold; open days use the adjusted forecast.
    if (d.actualItems) return { ...p, portions: d.actualItems, needs: needsFor(d.actualItems) };
    return p;
  });
  const results = analyze(plans);
  const orders = await store.getOrders(owner, weekId);
  return { week, days, plans, results, orders, bias, factors, today: store.todayStr() };
}

export async function reviewState(owner: string) {
  const all = await store.allActualDays(owner);
  const rows = all.map((d) => ({ prepped: d.frozenAdjusted ?? portionsFor(d.covers), actual: d.actualItems as ItemQty }));
  const lines = reviewDays(rows);
  const perDay = all.map((d) => {
    const l = reviewDays([{ prepped: d.frozenAdjusted ?? {}, actual: d.actualItems as ItemQty }]);
    return { date: d.date, idx: d.idx, over: l.reduce((s, x) => s + x.overCost, 0), short: l.reduce((s, x) => s + x.shortCost, 0) };
  });
  return { lines, perDay, days: all.length };
}

export const dayLabel = (i: number) => DAYS[i];
export { INGREDIENTS, MENU };
