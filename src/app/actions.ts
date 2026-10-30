import type { Data, DayKey, Session, Msg } from "@/lib/types";
import { suggest, exById } from "@/lib/logic";
import { today } from "@/lib/dates";

export const sessionId = (uid: string, date: string, day: DayKey) => `${uid}_${date}_${day}`;
/** maakt de training van vandaag aan, sets vooraf ingevuld met de voorstellen */
export function startSession(d: Data, day: DayKey): string {
  const uid = d.me, date = today(), id = sessionId(uid, date, day);
  if (!d.sessions[id]) {
    const pd = d.plans[uid]?.[day]; if (!pd) return id;
    const s: Session = { id, uid, date, day, title: pd.title, startedAt: Date.now(), items: pd.items.map(it => { const sg = suggest(d, uid, it, id), ex = exById(d, it.exId);
      const n = ex.kind === "cardio" ? 1 : it.sets;
      return { pid: it.id, exId: it.exId, target: sg.r, sets: Array.from({ length: n }, () => ({ w: ex.kind === "cardio" ? (sg.w || 8) : sg.w, r: ex.kind === "cardio" ? it.target : sg.r, done: false })) }; }) };
    d.sessions[id] = s;
  } else if (d.sessions[id].finishedAt && !d.sessions[id].items.some(i => i.sets.some(z => z.done && z.r > 0))) delete d.sessions[id].finishedAt; // afgerond zonder sets: gewoon verder
  syncLive(d, id); return id;
}
export function syncLive(d: Data, sid: string) {
  const s = d.sessions[sid]; if (!s) return;
  if (s.finishedAt) { delete d.live[s.uid]; return; }
  const total = s.items.reduce((a, i) => a + i.sets.length, 0), done = s.items.reduce((a, i) => a + i.sets.filter(z => z.done).length, 0);
  let idx = s.items.findIndex(i => i.sets.some(z => !z.done)); if (idx < 0) idx = s.items.length - 1;
  d.live[s.uid] = { uid: s.uid, sessionId: sid, title: s.title, exName: exById(d, s.items[idx].exId).name, exIdx: idx, exTotal: s.items.length, setsDone: done, setsTotal: total, startedAt: s.startedAt, updatedAt: Date.now() };
}
export function sendMsg(d: Data, text: string) {
  if (!d.mate || !text.trim()) return; const m: Msg = { id: "m" + Date.now() + Math.random().toString(36).slice(2, 5), from: d.me, to: d.mate, text: text.trim().slice(0, 200), at: Date.now() }; d.msgs.push(m);
}
export const CHEERS = ["Zet 'm op!", "Sterk bezig!", "Nog even volhouden!", "Trots op je!", "Laatste set, geef alles!"];
