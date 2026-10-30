import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { weekSessions, planDays, volume, fmtKg, prsIn, exById, finished } from "@/lib/logic";
import { dshort, today, addDays } from "@/lib/dates";
import { makeSample, DEMO_MATE } from "@/lib/sample";
import { ChatBody } from "./Chat";
import { Avatar, Btn, Card, Ring } from "./ui";
import { Copy, Trophy, ChevronRight } from "lucide-react";
import { shareOf } from "./Settings";

export function InviteCard() {
  const { update, toast, data: d } = useApp(); const [code, setCode] = useState<string | null>(null);
  const url = code ? `https://gymmaat.app/?join=${code}` : "";
  return <Card className="grid gap-3"><h2 className="display text-[26px] font-bold uppercase leading-none">Nodig je maat uit</h2>
    <p className="text-[14px] text-mute">Samen zien jullie elkaars trainingen, kunnen jullie elkaar aanmoedigen en berichten sturen. Je lichaamsgewicht blijft alleen voor jou.</p>
    {!code ? <Btn onClick={() => setCode(Math.random().toString(36).slice(2, 10))}>Uitnodigingslink maken</Btn> : <>
      <div className="flex items-center gap-2 rounded-[12px] bg-sunk p-2 pl-3"><input id="invite-url" readOnly value={url} className="grow min-w-0 bg-transparent text-[13px] num outline-none" onFocus={e => e.target.select()} aria-label="Uitnodigingslink" />
        <Btn size="sm" onClick={async () => { try { await navigator.clipboard.writeText(url); toast("Link gekopieerd."); } catch { (document.getElementById("invite-url") as HTMLInputElement)?.select(); toast("Selecteer de link en kopieer hem."); } }}><Copy size={14} />Kopieer</Btn></div>
      <p className="text-[12px] text-mute">Werkt 7 dagen en maar één keer. Je maat logt in met een eigen e-mailadres.</p>
      {d && <Btn variant="line" size="sm" onClick={() => { const s = makeSample(); update(x => { x.mate = DEMO_MATE; x.profiles[DEMO_MATE] = s.profiles[DEMO_MATE]; x.plans[DEMO_MATE] = s.plans[DEMO_MATE]; Object.values(s.sessions).filter(q => q.uid === DEMO_MATE).forEach(q => { x.sessions[q.id] = q; }); x.live[DEMO_MATE] = s.live[DEMO_MATE]; }); toast("Noor heeft je uitnodiging aanvaard (voorbeeld)."); }}>Voorbeeld: laat Noor aanvaarden</Btn>}
    </>}
  </Card>;
}

export function Together() {
  const { data: d, markRead, unread, setPage } = useApp();
  useEffect(() => { if (unread) markRead(); }, [unread, markRead]);
  if (!d) return null;
  const mate = d.mate ? d.profiles[d.mate] : null, me = d.profiles[d.me];
  if (!mate) return <div className="grid gap-3.5"><header className="pt-3"><h1 className="display text-[34px] font-bold uppercase leading-none">Samen</h1></header><InviteCard /></div>;
  const live = shareOf(mate).live ? d.live[mate.uid] : undefined, meW = weekSessions(d, d.me).length, mW = weekSessions(d, mate.uid).length;
  const feed = Object.values(d.sessions).filter(s => s.uid === mate.uid && finished(s) && s.date >= addDays(today(), -10)).sort((a, b) => a.date < b.date ? 1 : -1).slice(0, 4);

  return <div className="grid gap-3.5">
    <header className="pt-3"><h1 className="display text-[34px] font-bold uppercase leading-none">Samen</h1></header>
    <Card className="grid gap-3"><button className="flex items-center gap-3 text-left" onClick={() => setPage("maatprofiel")} aria-label={`Profiel van ${mate.name}`}><Avatar p={mate} size={48} /><div className="grow"><b className="text-[18px]">{mate.name}</b>
      <p className="text-[13px] text-mute flex items-center gap-1.5">{live ? <><span className="h-2 w-2 rounded-full bg-[var(--plate-10)] animate-pulse" />Traint nu · {live.exName}</> : "Niet aan het trainen"}</p></div><ChevronRight size={18} className="text-mute" /></button>
      {live && <div className="h-2 rounded-full bg-sunk overflow-hidden"><div className="h-full bg-[var(--chart-mate)] rounded-full transition-all" style={{ width: `${(live.setsDone / live.setsTotal) * 100}%` }} /></div>}
      <div className="grid grid-cols-2 gap-2">{[[me, meW, planDays(d.plans[d.me]).length, "var(--chart-me)"], [mate, mW, planDays(d.plans[mate.uid]).length, "var(--chart-mate)"]].map(([p, w, pl, c]) => { const P = p as typeof me;
        return <div key={P.uid} className="rounded-[14px] bg-sunk p-3 flex items-center gap-3"><Ring value={(w as number) / Math.max(1, pl as number)} size={42} color={c as string}><span className="text-[11px] font-bold num">{w as number}/{pl as number}</span></Ring><span className="text-[13px] leading-tight"><b className="block">{P.uid === d.me ? "Jij" : P.name}</b><span className="text-mute">deze week</span></span></div>; })}</div>
    </Card>

    {feed.length > 0 && <Card className="!p-0"><p className="label p-4 pb-1">Recent van {mate.name}</p><ul>{feed.map(s => { const prs = prsIn(d, s);
      return <li key={s.id} className="px-4 py-3 border-t border-line"><div className="flex justify-between gap-2"><b className="text-[14px]">{s.title}</b><span className="text-[12px] text-mute shrink-0">{s.date === today() ? "vandaag" : dshort(s.date)}</span></div>
        <p className="text-[12px] text-mute num">{s.items.reduce((a, i) => a + i.sets.filter(z => z.done && z.r > 0).length, 0)} sets · {fmtKg(Math.round(volume(d, s)))} kg</p>
        {prs.length > 0 && <p className="text-[12px] mt-1 flex items-center gap-1 text-good font-semibold"><Trophy size={13} />Record: {prs.map(p => `${exById(d, p.exId).name} ${fmtKg(p.w)} × ${p.r}`).join(", ")}</p>}</li>; })}</ul></Card>}

    <Card className="!p-0 overflow-hidden">
      <p className="label p-4 pb-2">Chat</p>
      <ChatBody />
    </Card>
  </div>;
}
