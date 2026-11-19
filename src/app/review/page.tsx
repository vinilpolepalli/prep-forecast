import { loadDesk } from "@/lib/desk";
import { fmt } from "@/lib/engine";
import { reviewState } from "@/lib/service";
import { SHORT, dateLabel } from "@/lib/desk";
import { SampleChip, usd } from "@/components/Bits";

export const dynamic = "force-dynamic";

export default async function Review() {
  const { owner } = await loadDesk();
  const r = await reviewState(owner);
  const over = r.lines.reduce((s, l) => s + l.overCost, 0);
  const short = r.lines.reduce((s, l) => s + l.shortCost, 0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-bold">Waste and stockout review</h1>
        <SampleChip>SAMPLE costs</SampleChip>
      </div>
      <p className="text-sm text-ink-mute max-w-3xl">Over-prepped = gross ingredient implied by the forecast the kitchen prepped to, minus what the actual items sold needed. Under-prepped is the reverse. Costed at sample unit costs; across {r.days} closed days.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="card p-4"><p className="label">Over-prepped (sample cost)</p><p className="text-2xl font-bold mono">{usd(over)}</p></div>
        <div className="card p-4"><p className="label">Under-prepped, shortfall at cost (sample)</p><p className="text-2xl font-bold mono">{usd(short)}</p></div>
      </div>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Ingredient</th><th className="num">Prepped</th><th className="num">Used</th><th className="num">Over</th><th className="num">Short</th><th className="num">Over cost</th><th className="num">Short cost</th></tr></thead>
          <tbody>{r.lines.map((l) => (
            <tr key={l.id}><td>{l.name}</td><td className="num mono">{fmt(l.prepped, 1)} {l.unit}</td><td className="num mono">{fmt(l.used, 1)}</td><td className="num mono">{fmt(l.over, 1)}</td><td className="num mono">{fmt(l.short, 1)}</td><td className="num mono">{usd(l.overCost)}</td><td className="num mono">{usd(l.shortCost)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Day</th><th className="num">Over cost</th><th className="num">Short cost</th></tr></thead>
          <tbody>{r.perDay.map((d) => <tr key={d.date}><td>{SHORT[d.idx]} {dateLabel(d.date)}</td><td className="num mono">{usd(d.over)}</td><td className="num mono">{usd(d.short)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
