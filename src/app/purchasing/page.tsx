import { loadDesk } from "@/lib/desk";
import { fmt, purchaseCsv } from "@/lib/engine";
import { OrderToggle } from "@/components/Controls";
import { FlagChip, SampleChip, usd } from "@/components/Bits";

export const dynamic = "force-dynamic";

export default async function Purchasing() {
  const { week, results, orders } = await loadDesk();
  const total = results.reduce((s, r) => s + r.orderCost, 0);
  const csv = purchaseCsv(results);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-bold">Purchasing: week of {week.weekStart}</h1>
        <SampleChip>SAMPLE costs</SampleChip>
        <span className="text-sm text-ink-mute">Order suggestion {usd(total)} (sample unit costs)</span>
        <a className="btn btn-ghost ml-auto no-print" download="purchase-list.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}>Download CSV</a>
      </div>
      <div className="card overflow-x-auto">
        <table>
          <thead><tr><th>Ingredient</th><th className="num">Week need</th><th className="num">On hand</th><th className="num">Par</th><th className="num">Suggested order</th><th className="num">Standing order</th><th>Flag</th><th className="no-print"></th></tr></thead>
          <tbody>{results.map((r) => (
            <tr key={r.ing.id}>
              <td><b>{r.ing.name}</b>
                <details className="text-xs text-ink-mute mt-0.5"><summary className="cursor-pointer">formula</summary><p className="mono max-w-md">{r.formula}</p></details>
              </td>
              <td className="num mono">{fmt(r.weekGross, 1)} {r.ing.unit}</td>
              <td className="num mono">{r.ing.onHand}</td>
              <td className="num mono">{r.ing.par}</td>
              <td className="num mono font-bold">{r.recommendedOrder} {r.ing.unit}<div className="text-xs font-normal text-ink-faint">{usd(r.orderCost)}</div></td>
              <td className="num mono">{r.standingOrder}</td>
              <td><FlagChip flag={r.flag} /><div className="text-xs text-ink-faint max-w-48">{r.reason}</div></td>
              <td className="no-print"><OrderToggle weekId={week.id} ingredientId={r.ing.id} ordered={orders[r.ing.id]} qty={r.recommendedOrder} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="text-xs text-ink-faint">Week need uses actual items sold for closed days and the bias-adjusted forecast for open days. Units, par levels, pack sizes and costs are SAMPLE data.</p>
    </div>
  );
}
