import Link from "next/link";
import { loadDesk, SHORT, dateLabel } from "@/lib/desk";
import { fmt } from "@/lib/engine";
import { MENU } from "@/lib/data";
import { CoversEditor } from "@/components/Controls";
import { FlagChip, SampleChip } from "@/components/Bits";

export const dynamic = "force-dynamic";

export default async function Desk() {
  const { week, days, plans, results, todayIdx, today } = await loadDesk();
  const tp = plans[todayIdx];
  const flagged = results.filter((r) => r.flag !== "OK");
  const totalPortions = Object.values(tp.portions).reduce((a, b) => a + b, 0);
  return (
    <div className="space-y-6">
      <section className="card p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-bold">Today&apos;s prep: {SHORT[todayIdx]} {dateLabel(today)}</h1>
          <SampleChip>SAMPLE menu</SampleChip>
          <span className="text-sm text-ink-mute">{days[todayIdx].covers} covers {days[todayIdx].actualCovers != null ? "forecast at close" : "forecast"}, {fmt(totalPortions, 0)} portions</span>
        </div>
        <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6">
          {MENU.map((m) => {
            const adj = tp.portions[m.id], base = tp.basePortions[m.id];
            return (
              <li key={m.id} className="flex justify-between py-1 border-b border-line text-sm">
                <span>{m.name}</span>
                <span className="mono">{Math.ceil(adj)}{Math.ceil(adj) !== Math.ceil(base) && <span className="text-ink-faint"> (base {Math.ceil(base)})</span>}</span>
              </li>
            );
          })}
        </ul>
        <Link href={`/prep/${todayIdx}`} className="btn mt-3 inline-block">Open prep list</Link>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="label text-base">Week of {dateLabel(week.weekStart)} <span className="normal-case font-normal text-ink-faint">revision {week.revision}</span></h2>
          <Link href="/learn" className="text-sm text-accent hover:text-accent-hover font-medium">Record actuals</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((d, i) => {
            const isToday = i === todayIdx;
            const past = d.date < today;
            return (
              <div key={d.id} className={`card p-3 ${isToday ? "border-accent" : ""}`}>
                <div className="flex justify-between items-baseline">
                  <p className="font-bold">{SHORT[i]} <span className="font-normal text-ink-faint text-sm">{dateLabel(d.date)}</span></p>
                  {isToday && <span className="label text-accent">today</span>}
                </div>
                <div className="mt-2"><CoversEditor weekId={week.id} idx={i} covers={d.covers} locked={d.actualCovers != null} /></div>
                <p className="text-xs text-ink-mute mt-2">{fmt(Object.values(plans[i].portions).reduce((a, b) => a + b, 0), 0)} portions{d.actualCovers == null ? " (bias-adjusted)" : " sold"}</p>
                {d.actualCovers != null
                  ? <p className="text-xs mt-1">Actual {d.actualCovers} <span className="text-ink-faint">({d.actualCovers - d.covers >= 0 ? "+" : ""}{d.actualCovers - d.covers} vs forecast)</span></p>
                  : past && <p className="text-xs mt-1 text-accent">Awaiting actuals</p>}
                <Link href={`/prep/${i}`} className="text-xs text-accent hover:text-accent-hover font-medium mt-1 inline-block">Prep list</Link>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="p-4 pb-2 flex items-baseline gap-3">
          <h2 className="label text-base">Open flags</h2>
          <span className="text-sm text-ink-mute">standing order (placed on baseline covers) vs current forecast</span>
        </div>
        {flagged.length === 0 ? <p className="px-4 pb-4 text-sm text-ink-mute">No open flags. Edit a day&apos;s covers to see risk surface.</p> : (
          <ul className="px-4 pb-2">{flagged.map((r) => (
            <li key={r.ing.id} className="border-t border-line py-2 grid gap-x-4 gap-y-1 sm:grid-cols-[11rem_9rem_1fr] items-center">
              <span className="font-medium">{r.ing.name}</span><span><FlagChip flag={r.flag} /></span><span className="text-sm text-ink-mute">{r.reason}</span>
            </li>
          ))}</ul>
        )}
        <p className="px-4 py-3 text-xs text-ink-faint">Restaurant, menu, recipes, par levels and costs are SAMPLE data. The forecast engine is a deterministic heuristic, not ML.</p>
      </section>
    </div>
  );
}
