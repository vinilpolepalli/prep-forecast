import { describe, it, expect } from "vitest";
import { planDays, analyze, computeBias, factorsOf, defaultActualItems, fmt, reviewDays, STANDING, DAMPING } from "./engine";
import { DEFAULT_COVERS, MENU, INGREDIENTS, ITEMS_PER_COVER } from "./data";

describe("engine", () => {
  it("mix shares sum to 1", () => expect(MENU.reduce((s, m) => s + m.mixShare, 0)).toBeCloseTo(1, 9));
  it("is deterministic", () => expect(planDays(DEFAULT_COVERS)).toEqual(planDays(DEFAULT_COVERS)));
  it("hand-checks chicken for one day", () => {
    const d = planDays([100, 0, 0, 0, 0, 0, 0])[0];
    const items = 100 * ITEMS_PER_COVER;
    const net = items * (0.2 * 0.4 + 0.15 * 0.35 + 0.1 * 0.28 + 0.06 * 0.3);
    expect(d.needs.chicken.net).toBeCloseTo(net, 9);
    expect(d.needs.chicken.gross).toBeCloseTo(net / 0.82, 9);
  });
  it("orders round up to pack size", () => {
    for (const r of analyze(planDays(DEFAULT_COVERS))) {
      expect(r.recommendedOrder % r.ing.packSize).toBe(0);
      expect(r.recommendedOrder).toBeGreaterThanOrEqual(r.target - 1e-6);
    }
  });
  it("baseline is all OK-or-explained and standing order matches recommended", () => {
    for (const r of analyze(planDays(DEFAULT_COVERS))) expect(r.standingOrder).toBe(r.recommendedOrder);
  });
  it("big cover increase raises stockout risk", () => {
    const flags = analyze(planDays(DEFAULT_COVERS.map((c) => c * 1.5))).filter((r) => r.flag === "STOCKOUT RISK");
    expect(flags.length).toBeGreaterThan(0);
  });
  it("STOCKOUT RISK only when balance goes negative", () => {
    const r = analyze(planDays(DEFAULT_COVERS.map((c) => c * 1.5))).filter((x) => x.flag === "STOCKOUT RISK");
    for (const x of r) { expect(x.minBalance).toBeLessThan(0); expect(x.reason).toMatch(/^Runs ~.+ short before week end$/); }
  });
  it("LOW PAR when balance stays positive but ends under half of par", () => {
    let found = 0;
    for (let m = 1; m <= 1.6; m += 0.005) {
      for (const x of analyze(planDays(DEFAULT_COVERS.map((c) => c * m))).filter((y) => y.flag === "LOW PAR")) {
        found++;
        expect(x.minBalance).toBeGreaterThanOrEqual(0);
        expect(x.endBalance).toBeLessThan(x.ing.par * 0.5);
        expect(x.reason).toBe(`Ends week at ${fmt(x.endBalance)} ${x.ing.unit}, under half of par (${x.ing.par})`);
      }
    }
    expect(found).toBeGreaterThan(0);
  });
  it("bias math: damped correction", () => {
    const base = Object.fromEntries(MENU.map((m) => [m.id, 100]));
    const actual = Object.fromEntries(MENU.map((m) => [m.id, m.id === "burger" ? 120 : 100]));
    const b = computeBias([{ date: "2026-01-01", baseForecast: base, actual }]);
    const burger = b.find((x) => x.id === "burger")!;
    expect(burger.bias).toBeCloseTo(0.2, 9);
    expect(burger.factor).toBeCloseTo(1 + DAMPING * 0.2, 9);
    expect(b.find((x) => x.id === "salad")!.factor).toBe(1);
  });
  it("clamps extreme bias", () => {
    const b = computeBias([{ date: "d", baseForecast: { burger: 10 }, actual: { burger: 100 } }]);
    expect(b.find((x) => x.id === "burger")!.factor).toBe(1.25);
  });
  it("only last 7 days are used", () => {
    const hist = Array.from({ length: 9 }, (_, i) => ({ date: `2026-01-0${i + 1}`, baseForecast: { burger: 10 }, actual: { burger: i < 2 ? 1000 : 10 } }));
    expect(computeBias(hist).find((x) => x.id === "burger")!.bias).toBe(0);
  });
  it("adjustment scales portions and needs", () => {
    const f = { burger: 1.1 };
    const adj = planDays(DEFAULT_COVERS, f)[0], base = planDays(DEFAULT_COVERS)[0];
    expect(adj.portions.burger).toBeCloseTo(base.portions.burger * 1.1, 9);
    expect(adj.needs.bun.gross).toBeCloseTo(base.needs.bun.gross * 1.1, 9);
    expect(factorsOf(computeBias([])).burger).toBe(1);
  });
  it("review splits over and short", () => {
    const prepped = defaultActualItems(200), actual = defaultActualItems(180);
    const r = reviewDays([{ prepped, actual }]);
    expect(r.every((l) => l.short === 0 && l.over >= 0)).toBe(true);
    expect(r.find((l) => l.id === "chicken")!.over).toBeGreaterThan(0);
    expect(Object.keys(STANDING).length).toBe(INGREDIENTS.length);
  });
});
