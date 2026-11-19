"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(url: string, body: unknown): Promise<string | null> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (r.ok) return null;
  return ((await r.json().catch(() => ({}))) as { error?: string }).error ?? `Error ${r.status}`;
}

export function CoversEditor({ weekId, idx, covers, locked }: { weekId: string; idx: number; covers: number; locked: boolean }) {
  const router = useRouter();
  const [v, setV] = useState(String(covers));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = Number(v) !== covers;
  async function save() {
    setBusy(true);
    const e = await post(`/api/weeks/${weekId}/covers`, { day: idx, covers: Number(v) });
    setMsg(e);
    setBusy(false);
    if (!e) router.refresh();
  }
  if (locked) {
    return (
      <div>
        <span className="label block">Forecast at close</span>
        <p className="mono mt-1 text-lg">{covers}</p>
      </div>
    );
  }
  return (
    <div>
      <label className="label block" htmlFor={`c-${idx}`}>Forecast covers</label>
      <div className="flex flex-col gap-2 mt-1">
        <input id={`c-${idx}`} className="field" type="number" min={0} max={10000} step={1} inputMode="numeric" value={v} onChange={(e) => setV(e.target.value)} />
        <button className="btn" disabled={busy || !dirty} onClick={save}>Save</button>
      </div>
      {msg && <p role="alert" className="text-xs text-red-800 mt-1">{msg}</p>}
    </div>
  );
}

export function PrepCheck({ dayId, recipe, done, label }: { dayId: string; recipe: string; done: boolean; label: string }) {
  const [on, setOn] = useState(done);
  const [msg, setMsg] = useState<string | null>(null);
  async function toggle(next: boolean) {
    setOn(next);
    const e = await post(`/api/days/${dayId}/prep`, { key: recipe, done: next });
    if (e) { setOn(!next); setMsg(e); } else setMsg(null);
  }
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input type="checkbox" className="h-5 w-5 accent-[#c2410c]" checked={on} onChange={(e) => toggle(e.target.checked)} />
      <span className={on ? "line-through text-ink-faint" : "font-semibold"}>{label}</span>
      {msg && <span role="alert" className="text-xs text-red-800">{msg}</span>}
    </label>
  );
}

export function OrderToggle({ weekId, ingredientId, ordered, qty }: { weekId: string; ingredientId: string; ordered: number | undefined; qty: number }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  async function go() {
    const e = await post(`/api/weeks/${weekId}/orders`, { ingredientId, ordered: ordered === undefined });
    setMsg(e);
    if (!e) router.refresh();
  }
  return (
    <div>
      <button className={ordered === undefined ? "btn" : "btn btn-ghost"} onClick={go} disabled={qty === 0 && ordered === undefined}>{ordered === undefined ? "Mark ordered" : `Ordered ${ordered} (undo)`}</button>
      {msg && <p role="alert" className="text-xs text-red-800 mt-1">{msg}</p>}
    </div>
  );
}

export function ActualsForm({ dayId, label, forecast, existing, menu }: { dayId: string; label: string; forecast: number; existing: number | null; menu: { id: string; name: string; expected: number; actual: number | null }[] }) {
  const router = useRouter();
  const [covers, setCovers] = useState(String(existing ?? forecast));
  const [items, setItems] = useState<Record<string, string>>(Object.fromEntries(menu.map((m) => [m.id, m.actual == null ? "" : String(m.actual)])));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const body: { covers: number; items?: Record<string, number> } = { covers: Number(covers) };
    const filled = Object.entries(items).filter(([, v]) => v !== "");
    if (filled.length) body.items = Object.fromEntries(menu.map((m) => [m.id, items[m.id] === "" ? Math.round(m.expected * Number(covers) / Math.max(1, forecast)) : Number(items[m.id])]));
    const e = await post(`/api/days/${dayId}/actuals`, body);
    setMsg(e);
    setBusy(false);
    if (!e) router.refresh();
  }
  return (
    <div className="card p-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-24"><p className="label">{label}</p><p className="text-xs text-ink-faint">forecast {forecast}</p></div>
        <div className="w-28"><label className="label block" htmlFor={`a-${dayId}`}>Actual covers</label><input id={`a-${dayId}`} className="field" type="number" min={0} max={10000} value={covers} onChange={(e) => setCovers(e.target.value)} /></div>
        <button className="btn" disabled={busy} onClick={save}>{existing == null ? "Record actuals" : "Update actuals"}</button>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-ink-mute">Optional: items sold (blank = forecast mix)</summary>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
          {menu.map((m) => (
            <label key={m.id} className="text-xs text-ink-mute">{m.name}
              <input className="field mt-0.5" type="number" min={0} max={10000} placeholder={String(Math.round(m.expected))} value={items[m.id]} onChange={(e) => setItems({ ...items, [m.id]: e.target.value })} />
            </label>
          ))}
        </div>
      </details>
      {msg && <p role="alert" className="text-xs text-red-800 mt-1">{msg}</p>}
    </div>
  );
}
