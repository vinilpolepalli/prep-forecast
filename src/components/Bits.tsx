import type { Flag } from "@/lib/engine";

export function FlagChip({ flag }: { flag: Flag }) {
  const cls = flag === "OK" ? "chip-ok" : flag === "STOCKOUT RISK" ? "chip-stock" : flag === "LOW PAR" ? "chip-low" : "chip-over";
  return <span className={`chip ${cls}`}>{flag}</span>;
}
export const SampleChip = ({ children = "SAMPLE" }: { children?: string }) => <span className="chip chip-sample">{children}</span>;
export const usd = (n: number) => `$${n.toFixed(2)}`;
export const signed = (n: number, d = 1) => `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(d)}`;
export const pct = (n: number, d = 1) => `${n >= 0 ? "+" : "-"}${Math.abs(n * 100).toFixed(d)}%`;
