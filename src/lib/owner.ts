import { headers } from "next/headers";
import { ensureOwnerWeeks } from "./store";

export async function currentOwner(): Promise<string> {
  const h = await headers();
  const id = h.get("x-pf-uid") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error("no owner");
  await ensureOwnerWeeks(id);
  return id;
}
