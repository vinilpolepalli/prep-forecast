import { redirect } from "next/navigation";
import { currentOwner } from "./owner";
import { listWeeks, mondayOf, todayStr } from "./store";
import { weekState } from "./service";

export const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const dateLabel = (d: string) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/** Loads the owner's current week (the one containing "today"). */
export async function loadDesk() {
  const owner = await currentOwner();
  const weeks = await listWeeks(owner);
  const cur = weeks.find((w) => w.weekStart === mondayOf(todayStr())) ?? weeks[weeks.length - 1];
  const s = await weekState(owner, cur.id);
  if (!s) redirect("/");
  const todayIdx = Math.max(0, Math.min(6, s.days.findIndex((d) => d.date === s.today)));
  return { owner, ...s, todayIdx };
}
