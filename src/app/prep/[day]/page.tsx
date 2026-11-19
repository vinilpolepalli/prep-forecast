import Link from "next/link";
import { notFound } from "next/navigation";
import { loadDesk, SHORT, dateLabel } from "@/lib/desk";
import { INGREDIENTS, MENU } from "@/lib/data";
import { fmt } from "@/lib/engine";
import { getChecks } from "@/lib/store";
import { PrepCheck } from "@/components/Controls";
import { SampleChip } from "@/components/Bits";

export const dynamic = "force-dynamic";

export default async function PrepDay({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  const desk = await loadDesk();
  const idx = day === "today" ? desk.todayIdx : Number(day);
  if (!Number.isInteger(idx) || idx < 0 || idx > 6) notFound();
  const d = desk.days[idx], plan = desk.plans[idx];
  const checks = await getChecks(desk.owner, d.id);
  const ing = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
  const lines = INGREDIENTS.filter((i) => plan.needs[i.id].gross > 0);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 no-print">
        {SHORT.map((s, i) => <Link key={s} href={`/prep/${i}`} className={`btn ${i === idx ? "" : "btn-ghost"}`}>{s}</Link>)}
      </div>
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-bold">Prep list: {SHORT[idx]} {dateLabel(d.date)}</h1>
        <SampleChip>SAMPLE recipes</SampleChip>
        <span className="text-sm text-ink-mute">
          {d.actualItems ? `Closed: ${d.actualCovers} actual covers (forecast ${d.covers}). Showing what was sold.` : `${d.covers} covers x 1.3 items/cover x mix share x bias factor`}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {MENU.map((m) => {
          const q = plan.portions[m.id], base = plan.basePortions[m.id], f = desk.factors[m.id] ?? 1;
          const batch = Math.ceil(q);
          return (
            <section key={m.id} className="card border-dashed p-4">
              <div className="flex justify-between gap-3">
                <PrepCheck dayId={d.id} recipe={m.id} done={!!checks[m.id]} label={m.name} />
                <span className="mono text-lg font-bold">{batch}</span>
              </div>
              <p className="text-xs text-ink-faint mt-1 mono">
                {d.actualItems ? `sold ${fmt(q, 0)}` : `${fmt(base, 2)} base x ${f.toFixed(3)} factor = ${fmt(q, 2)} -> batch ${batch}`}
              </p>
              <ul className="mt-2 text-sm">
                {Object.entries(m.recipe).map(([k, qty]) => (
                  <li key={k} className="flex justify-between border-t border-line py-0.5">
                    <span>{ing[k].name}</span>
                    <span className="mono text-ink-mute">{qty} x {fmt(q, 1)} = <b className="text-ink">{fmt(qty * q, 2)}</b> {ing[k].unit}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <section className="card overflow-x-auto">
        <h2 className="label text-base p-4 pb-2">Pull list (raw, after yield loss)</h2>
        <table>
          <thead><tr><th>Ingredient</th><th className="num">Net (usable)</th><th className="num">Yield</th><th className="num">Gross to pull</th></tr></thead>
          <tbody>{lines.map((i) => (
            <tr key={i.id}><td>{i.name}</td><td className="num mono">{fmt(plan.needs[i.id].net, 2)} {i.unit}</td><td className="num mono">{i.yieldPct}</td><td className="num mono font-bold">{fmt(plan.needs[i.id].gross, 2)} {i.unit}</td></tr>
          ))}</tbody>
        </table>
        <p className="p-3 text-xs text-ink-faint">gross = net / yield. Recipes, yields and quantities are SAMPLE data.</p>
      </section>
    </div>
  );
}
