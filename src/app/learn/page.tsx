import { loadDesk, SHORT, dateLabel } from "@/lib/desk";
import { INGREDIENTS, MENU } from "@/lib/data";
import { CLAMP_MAX, CLAMP_MIN, DAMPING, WINDOW, fmt } from "@/lib/engine";
import { allActualDays } from "@/lib/store";
import { ActualsForm } from "@/components/Controls";
import { SampleChip, pct } from "@/components/Bits";

export const dynamic = "force-dynamic";

export default async function Learn() {
  const desk = await loadDesk();
  const { owner, days, plans, bias, week, today, todayIdx } = desk;
  const history = await allActualDays(owner);
  const open = days.filter((d) => d.date <= today);
  const tIdx = Math.min(6, todayIdx + 1);
  const tp = plans[tIdx];
  const winDays = Math.min(WINDOW, history.length);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Learn loop</h1>
        <p className="text-sm text-ink-mute max-w-3xl mt-1">
          Enter actual covers for a past day. The desk measures forecast error per menu item and applies a <b>deterministic bias correction</b> to future days.
          This is a simple heuristic (a damped ratio), not machine learning, and carries no accuracy claim. Prior-week history is SAMPLE data.
        </p>
        <div className="card p-3 mt-3 text-sm mono leading-relaxed">
          <p>bias(item) = sum(actual) / sum(base forecast) - 1, over the last {WINDOW} days with actuals (now {winDays})</p>
          <p>factor(item) = clamp(1 + {DAMPING} x bias, {CLAMP_MIN}, {CLAMP_MAX})   <span className="text-ink-faint">damping = {DAMPING}</span></p>
          <p>adjusted portions = base portions x factor. Error is measured against the unadjusted forecast so the correction does not chase itself.</p>
        </div>
      </div>

      <section>
        <h2 className="label text-base mb-2">Record actuals ({week.label.toLowerCase()})</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {open.map((d) => (
            <ActualsForm key={d.id + (d.actualCovers ?? "n")} dayId={d.id} label={`${SHORT[d.idx]} ${dateLabel(d.date)}`} forecast={d.covers} existing={d.actualCovers}
              menu={MENU.map((m) => ({ id: m.id, name: m.name, expected: plans[d.idx].basePortions[m.id], actual: d.actualItems ? d.actualItems[m.id] : null }))} />
          ))}
        </div>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="label text-base p-4 pb-2">Forecast vs actual covers</h2>
        <table>
          <thead><tr><th>Day</th><th className="num">Forecast</th><th className="num">Actual</th><th className="num">Error</th><th className="num">Error %</th></tr></thead>
          <tbody>{history.map((d) => {
            const e = (d.actualCovers ?? 0) - d.covers;
            return <tr key={d.id}><td>{SHORT[d.idx]} {dateLabel(d.date)}</td><td className="num mono">{d.covers}</td><td className="num mono">{d.actualCovers}</td><td className="num mono">{e >= 0 ? "+" : ""}{e}</td><td className="num mono">{pct(e / Math.max(1, d.covers))}</td></tr>;
          })}</tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="label text-base p-4 pb-2">Per-item bias <SampleChip>SAMPLE menu</SampleChip></h2>
        <table>
          <thead><tr><th>Item</th><th className="num">Forecast (sum)</th><th className="num">Actual (sum)</th><th className="num">Bias</th><th className="num">Factor</th><th>Calculation</th></tr></thead>
          <tbody>{bias.map((b) => (
            <tr key={b.id}><td>{b.name}</td><td className="num mono">{fmt(b.sumForecast, 1)}</td><td className="num mono">{fmt(b.sumActual, 0)}</td><td className="num mono">{pct(b.bias)}</td><td className="num mono font-bold">{b.factor.toFixed(3)}</td>
              <td className="mono text-xs text-ink-mute">1 + {DAMPING} x {b.bias.toFixed(4)} = {b.rawFactor.toFixed(4)}{b.clamped ? ` -> clamped ${b.factor}` : ""}</td></tr>
          ))}</tbody>
        </table>
      </section>

      <section className="card overflow-x-auto">
        <h2 className="label text-base p-4 pb-2">How the adjustment changed {SHORT[tIdx]}&apos;s prep list</h2>
        <table>
          <thead><tr><th>Recipe</th><th className="num">Base portions</th><th className="num">Factor</th><th className="num">Adjusted</th><th className="num">Batch change</th></tr></thead>
          <tbody>{MENU.map((m) => {
            const b = tp.basePortions[m.id], a = tp.portions[m.id];
            return <tr key={m.id}><td>{m.name}</td><td className="num mono">{fmt(b, 2)}</td><td className="num mono">{(desk.factors[m.id] ?? 1).toFixed(3)}</td><td className="num mono">{fmt(a, 2)}</td><td className="num mono">{Math.ceil(b)} to {Math.ceil(a)} ({Math.ceil(a) - Math.ceil(b) >= 0 ? "+" : ""}{Math.ceil(a) - Math.ceil(b)})</td></tr>;
          })}</tbody>
        </table>
        <table>
          <thead><tr><th>Ingredient (gross)</th><th className="num">Before</th><th className="num">After</th><th className="num">Delta</th></tr></thead>
          <tbody>{INGREDIENTS.map((i) => {
            const b = tp.baseGross[i.id], a = tp.needs[i.id].gross;
            return <tr key={i.id}><td>{i.name}</td><td className="num mono">{fmt(b, 2)} {i.unit}</td><td className="num mono">{fmt(a, 2)} {i.unit}</td><td className="num mono">{a - b >= 0 ? "+" : ""}{fmt(a - b, 2)}</td></tr>;
          })}</tbody>
        </table>
      </section>
    </div>
  );
}
