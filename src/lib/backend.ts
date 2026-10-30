/* Opslag achter één interface. In dit voorbeeld: DemoBackend (alleen in deze browser).
   Voor echt gebruik: SupabaseBackend praat met de functies gm2_* (zie gm2_schema.sql):
   per document (collectie + id), eigenaar bepaald door de server, lichaamsgewicht nooit zichtbaar voor je maat. */
import type { Data } from "./types";

export interface Backend {
  readonly kind: "demo" | "supabase";
  load(): Promise<Data | null>;
  save(d: Data): void;
  clear(): void;
}

const KEY = "gymmaat-nieuw.demo";
export class DemoBackend implements Backend {
  readonly kind = "demo" as const;
  async load() { try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Data) : null; } catch { return null; } }
  save(d: Data) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* opslag niet beschikbaar: blijft in het geheugen */ } }
  clear() { try { localStorage.removeItem(KEY); } catch { /* idem */ } }
}

/** Zo zien de documenten eruit voor gm2_push / gm2_pull. */
export function toDocs(d: Data): { col: string; id: string; data: unknown }[] {
  const me = d.me, out: { col: string; id: string; data: unknown }[] = [];
  if (d.profiles[me]) out.push({ col: "athletes", id: me, data: d.profiles[me] });
  if (d.plans[me]) out.push({ col: "plans", id: me, data: d.plans[me] });
  Object.values(d.sessions).filter(s => s.uid === me).forEach(s => out.push({ col: "sessions", id: s.id, data: s }));
  out.push({ col: "bw", id: me, data: { entries: d.bw, goal: d.bwGoal } });
  Object.values(d.custom).forEach(e => out.push({ col: "custom", id: e.id, data: e }));
  return out;
}
