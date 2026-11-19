// Pure deterministic core. No I/O, no randomness, no ML.
import { DAYS, INGREDIENTS, MENU, ITEMS_PER_COVER, DEFAULT_COVERS, type Ingredient } from "./data";

export type Flag = "OVER-ORDER" | "STOCKOUT RISK" | "LOW PAR" | "OK";
export type ItemQty = Record<string, number>;

/** Bias heuristic constants (shown in the UI). */
export const DAMPING = 0.5; // lambda: fraction of the observed bias we correct
export const CLAMP_MIN = 0.8;
export const CLAMP_MAX = 1.25;
export const WINDOW = 7; // most recent days with actuals

export const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
export const fmt = (n: number, d = 1) => round(n, d).toLocaleString("en-US", { maximumFractionDigits: d });

export type DayPlan = {
  day: string;
  covers: number;
  basePortions: ItemQty; // covers x items/cover x mix share (no adjustment)
  portions: ItemQty; // basePortions x item factor
  needs: Record<string, { net: number; gross: number }>; // from adjusted portions
  baseGross: Record<string, number>; // gross from unadjusted portions
};

export function portionsFor(covers: number): ItemQty {
  const items = covers * ITEMS_PER_COVER;
  return Object.fromEntries(MENU.map((m) => [m.id, items * m.mixShare]));
}

export function needsFor(portions: ItemQty) {
  const needs: DayPlan["needs"] = {};
  for (const ing of INGREDIENTS) {
    let net = 0;
    for (const m of MENU) net += (m.recipe[ing.id] ?? 0) * (portions[m.id] ?? 0);
    needs[ing.id] = { net, gross: net / ing.yieldPct };
  }
  return needs;
}

export function planDays(covers: number[], factors: ItemQty = {}): DayPlan[] {
  return DAYS.map((day, i) => {
    const basePortions = portionsFor(covers[i]);
    const portions = Object.fromEntries(MENU.map((m) => [m.id, basePortions[m.id] * (factors[m.id] ?? 1)]));
    const needs = needsFor(portions);
    const baseGross = Object.fromEntries(Object.entries(needsFor(basePortions)).map(([k, v]) => [k, v.gross]));
    return { day, covers: covers[i], basePortions, portions, needs, baseGross };
  });
}

// ---------- learn loop ----------
export type ActualRecord = { date: string; baseForecast: ItemQty; actual: ItemQty };

export type ItemBias = {
  id: string;
  name: string;
  sumForecast: number;
  sumActual: number;
  bias: number; // sumActual / sumForecast - 1
  rawFactor: number; // 1 + DAMPING * bias
  factor: number; // clamped
  clamped: boolean;
  days: number;
};

/**
 * Deterministic bias correction (heuristic, not ML):
 *   bias_i   = sum(actual_i) / sum(base forecast_i) - 1     over the last 7 days with actuals
 *   factor_i = clamp(1 + 0.5 * bias_i, 0.80, 1.25)
 * Errors are measured against the UNADJUSTED forecast so the correction does not chase itself.
 */
export function computeBias(history: ActualRecord[]): ItemBias[] {
  const win = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-WINDOW);
  return MENU.map((m) => {
    const sumForecast = win.reduce((s, h) => s + (h.baseForecast[m.id] ?? 0), 0);
    const sumActual = win.reduce((s, h) => s + (h.actual[m.id] ?? 0), 0);
    const bias = sumForecast > 0 ? sumActual / sumForecast - 1 : 0;
    const rawFactor = 1 + DAMPING * bias;
    const factor = Math.min(CLAMP_MAX, Math.max(CLAMP_MIN, rawFactor));
    return { id: m.id, name: m.name, sumForecast, sumActual, bias, rawFactor, factor, clamped: factor !== rawFactor, days: win.length };
  });
}

export const factorsOf = (b: ItemBias[]): ItemQty => Object.fromEntries(b.map((x) => [x.id, x.factor]));

// ---------- purchasing ----------
export type IngredientResult = {
  ing: Ingredient;
  dailyGross: number[];
  weekGross: number;
  target: number; // need + par - onHand
  recommendedOrder: number;
  standingOrder: number;
  minBalance: number;
  endBalance: number;
  flag: Flag;
  reason: string;
  wasteCost: number;
  orderCost: number;
  formula: string;
};

const packs = (qty: number, pack: number) => Math.max(0, Math.ceil(qty / pack - 1e-9) * pack);
export const orderFor = (ing: Ingredient, weekGross: number) => packs(weekGross + ing.par - ing.onHand, ing.packSize);

// Standing order = what the kitchen placed against the BASELINE forecast, before any edit or adjustment.
const BASE_PLAN = planDays(DEFAULT_COVERS);
export const STANDING: Record<string, number> = Object.fromEntries(
  INGREDIENTS.map((ing) => [ing.id, orderFor(ing, BASE_PLAN.reduce((s, d) => s + d.needs[ing.id].gross, 0))]),
);

export function analyze(days: DayPlan[]): IngredientResult[] {
  return INGREDIENTS.map((ing): IngredientResult => {
    const dailyGross = days.map((d) => d.needs[ing.id].gross);
    const weekGross = dailyGross.reduce((a, b) => a + b, 0);
    const standingOrder = STANDING[ing.id];
    let bal = ing.onHand + standingOrder;
    let minBalance = bal;
    for (const g of dailyGross) {
      bal -= g;
      minBalance = Math.min(minBalance, bal);
    }
    const endBalance = bal;
    const excess = endBalance - ing.par;
    let flag: Flag = "OK";
    let reason = "Standing order covers forecast and leaves roughly par.";
    if (minBalance < 0) {
      flag = "STOCKOUT RISK";
      reason = `Runs ~${fmt(-minBalance)} ${ing.unit} short before week end`;
    } else if (endBalance < ing.par * 0.5) {
      flag = "LOW PAR";
      reason = `Ends week at ${fmt(endBalance)} ${ing.unit}, under half of par (${ing.par})`;
    } else if (excess > ing.packSize) {
      flag = "OVER-ORDER";
      reason = `Ends ${fmt(excess)} ${ing.unit} over par; more than one pack (${ing.packSize}) too many.`;
    }
    const target = weekGross + ing.par - ing.onHand;
    const recommendedOrder = packs(target, ing.packSize);
    const formula = `need = ${fmt(weekGross, 2)} (sum of portions x qty / yield ${ing.yieldPct}); target = ${fmt(weekGross, 2)} + par ${ing.par} - on hand ${ing.onHand} = ${fmt(target, 2)}; order = ceil(${fmt(target, 2)} / ${ing.packSize}) x ${ing.packSize} = ${recommendedOrder}`;
    return {
      ing, dailyGross, weekGross, target, recommendedOrder, standingOrder, minBalance, endBalance, flag, reason, formula,
      wasteCost: ing.perishable ? Math.max(0, excess) * ing.unitCost : 0,
      orderCost: recommendedOrder * ing.unitCost,
    };
  });
}

// ---------- waste / stockout review ----------
export type ReviewLine = { id: string; name: string; unit: string; prepped: number; used: number; over: number; short: number; overCost: number; shortCost: number };

/** prepped = gross implied by the (adjusted) forecast; used = gross implied by actual items sold. */
export function reviewDays(rows: { prepped: ItemQty; actual: ItemQty }[]): ReviewLine[] {
  return INGREDIENTS.map((ing) => {
    let prepped = 0, used = 0, over = 0, short = 0;
    for (const r of rows) {
      const p = needsFor(r.prepped)[ing.id].gross;
      const u = needsFor(r.actual)[ing.id].gross;
      prepped += p; used += u;
      over += Math.max(0, p - u);
      short += Math.max(0, u - p);
    }
    return { id: ing.id, name: ing.name, unit: ing.unit, prepped, used, over, short, overCost: over * ing.unitCost, shortCost: short * ing.unitCost };
  });
}

export function defaultActualItems(covers: number): ItemQty {
  return Object.fromEntries(Object.entries(portionsFor(covers)).map(([k, v]) => [k, round(v, 0)]));
}

export function purchaseCsv(results: IngredientResult[]): string {
  const rows = [["ingredient", "unit", "recommended_order", "standing_order", "unit_cost_usd_sample", "est_cost_usd_sample", "flag"]];
  for (const r of results) rows.push([r.ing.name, r.ing.unit, String(r.recommendedOrder), String(r.standingOrder), r.ing.unitCost.toFixed(2), r.orderCost.toFixed(2), r.flag]);
  return rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
}
