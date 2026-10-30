import { useState, type ReactNode } from "react";
import { useApp, DEMO_EMAIL, type Page as PageKey, type Accent } from "@/lib/store";
import type { Profile, Share } from "@/lib/types";
import { SHARE_DEFAULT, DAY_NAME } from "@/lib/types";
import { makeSample } from "@/lib/sample";
import { toDocs } from "@/lib/backend";
import { sessionsOf, finished, records, exById, fmtKg, weekSessions, planDays, volume } from "@/lib/logic";
import { streak, badgeStates } from "@/lib/rewards";
import { dshort, monthName, pdate } from "@/lib/dates";
import { Avatar, Btn, Card, Seg, Sheet, Stepper, COLORS, inputCls, Page, Ring, Toggle } from "./ui";
import { InviteCard } from "./Together";
import { Medal } from "./Badges";
import { MapPin, Pencil, Search, TrendingUp, Volume2, Vibrate, Smartphone, ChevronRight, UserRound, Eye, Palette, Dumbbell, Users, Database, LogOut, Info, LineChart, Award, Camera, Trash2, RotateCcw, Lock, Flame, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const GOAL_NAME: Record<Profile["goal"], string> = { spier: "Spieren opbouwen", kracht: "Sterker worden", af: "Afvallen", fit: "Fit blijven" };
export const shareOf = (p?: Profile): Share => ({ ...SHARE_DEFAULT, ...(p?.share || {}) });

/* ---------- hoofdpagina: zoekbaar, gegroepeerd, rustige rijen met schakelaars ---------- */
type Row = { k: string; t: string; ic: ReactNode; go?: PageKey; sw?: [boolean, (v: boolean) => void]; extra?: string };
export function SettingsHome() {
  const { data: d, update, setPage, nav, setNav, auth } = useApp(); const [q, setQ] = useState(""), [edit, setEdit] = useState(false); if (!d) return null;
  const me = d.profiles[d.me], mate = d.mate ? d.profiles[d.mate] : null;
  const setP = <K extends keyof Profile>(k: K, v: Profile[K]) => update(x => { x.profiles[x.me][k] = v; });
  const groups: [string, Row[]][] = [
    ["Profiel", [{ k: "profiel", t: "Mijn profiel", ic: <UserRound />, go: "profiel" }, { k: "delen", t: "Delen en privacy", ic: <Eye />, go: "delen" }, { k: "voortgang", t: "Voortgang", ic: <LineChart />, go: "voortgang" }, { k: "badges", t: "Badges", ic: <Award />, go: "badges" }]],
    ["Training", [{ k: "trainen", t: "Rusttijd en progressie", ic: <Dumbbell />, go: "trainen" }, { k: "prog", t: "Gewicht automatisch verhogen", ic: <TrendingUp />, sw: [me.prog === "op", v => setP("prog", v ? "op" : "gelijk")] },
      { k: "sound", t: "Geluid als de rust voorbij is", ic: <Volume2 />, sw: [me.sound !== false, v => setP("sound", v)] }, { k: "vibrate", t: "Trillen bij afvinken", ic: <Vibrate />, sw: [me.vibrate !== false, v => setP("vibrate", v)] }]],
    ["App", [{ k: "weergave", t: "Thema en weergave", ic: <Palette />, go: "weergave" }, { k: "nav", t: "Veeglijn in plaats van menu (test)", ic: <Smartphone />, sw: [nav === "lijn", v => setNav(v ? "lijn" : "menu")] }]],
    ["Samen", [{ k: "maat", t: mate ? `Trainingsmaat: ${mate.name}` : "Trainingsmaat uitnodigen", ic: <Users />, go: "maat" }]],
    ["Account", [{ k: "gegevens", t: "Gegevens en back-up", ic: <Database />, go: "gegevens" }, { k: "account", t: "Account en afmelden", ic: <LogOut />, go: "account" }, { k: "over", t: "Over Gymmaat", ic: <Info />, go: "over" }]],
  ];
  const f = q.trim().toLowerCase(), shown = groups.map(([g, rows]) => [g, rows.filter(r => !f || r.t.toLowerCase().includes(f) || g.toLowerCase().includes(f))] as [string, Row[]]).filter(([, r]) => r.length);
  return <div className="grid gap-5 pt-4">
    <h1 className="text-[28px] font-bold leading-tight tracking-[-0.01em]">Instellingen</h1>
    <section className="bg-surface rounded-[22px] px-5 pt-6 pb-5 grid justify-items-center text-center gap-1" aria-label="Je profiel">
      <button onClick={() => setPage("profiel")} className="rounded-full mb-2" aria-label="Bekijk je profiel"><Avatar p={me} size={96} /></button>
      <h2 className="text-[19px] font-bold">{me.name}</h2>
      <p className="text-[14px] text-mute break-all">{auth?.email}</p>
      <p className="text-[13px] text-mute flex items-center gap-1.5 flex-wrap justify-center mt-0.5"><span>{GOAL_NAME[me.goal]}</span><span aria-hidden="true">·</span><span className="flex items-center gap-1"><MapPin size={13} className="text-accent" />{me.place === "thuis" ? "Thuis" : "Sportschool"}</span></p>
      <Btn className="mt-3 rounded-full px-5" onClick={() => setEdit(true)}><Pencil size={15} />Profiel bewerken</Btn>
    </section>
    <ProfileEditSheet open={edit} onClose={() => setEdit(false)} />
    <label className="relative block"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" /><span className="sr-only">Zoeken in instellingen</span>
      <input id="set-q" value={q} onChange={e => setQ(e.target.value)} placeholder="Zoeken" className="h-11 w-full rounded-[12px] bg-sunk pl-10 pr-3 text-[16px] outline-none focus:ring-2 focus:ring-[var(--accent)]" /></label>
    {shown.map(([g, rows]) => <section key={g} className="grid gap-2"><h2 className="text-[13px] text-mute px-1">{g}</h2>
      <div className="bg-surface rounded-[16px] overflow-hidden">{rows.map(r => { const inner = <><span className="text-ink [&>svg]:h-[21px] [&>svg]:w-[21px] [&>svg]:stroke-[1.7]">{r.ic}</span><span className="grow text-[15px] font-medium text-left">{r.t}</span></>;
        return r.sw ? <div key={r.k} className="flex items-center gap-3.5 px-4 min-h-[54px] border-t border-line first:border-0">{inner}<Toggle id={`sw-${r.k}`} on={r.sw[0]} onChange={r.sw[1]} label={r.t} /></div>
          : <button key={r.k} onClick={() => setPage(r.go!)} className="w-full flex items-center gap-3.5 px-4 min-h-[54px] border-t border-line first:border-0 active:bg-sunk transition-colors">{inner}</button>; })}</div></section>)}
    {!shown.length && <p className="text-[14px] text-mute text-center py-6">Niets gevonden voor "{q}".</p>}
    <p className="text-center text-[12px] text-mute">Gymmaat · voorbeeld</p>
  </div>;
}

/* ---------- profiel zoals je maat het ziet ---------- */
export function ProfileCard({ uid, own }: { uid: string; own?: boolean }) {
  const { data: d, setPage } = useApp(); if (!d) return null;
  const p = d.profiles[uid]; if (!p) return null; const sh = shareOf(p), since = new Date(p.createdAt);
  const st = streak(d, uid), wk = weekSessions(d, uid).length, pl = planDays(d.plans[uid]).length, bs = badgeStates(d, uid).filter(b => b.level).sort((a, b) => b.level - a.level).slice(0, 6), recs = records(d, uid).slice(0, 3);
  const last = sessionsOf(d, uid).filter(s => s.finishedAt && finished(s)).slice(-3).reverse(), live = d.live[uid];
  const Hidden = ({ what }: { what: string }) => own ? <p className="text-[12px] text-mute flex items-center gap-1.5"><Lock size={12} />{what} deel je niet. <button className="text-accent font-semibold" onClick={() => setPage("delen")}>Aanpassen</button></p> : null;
  return <>
    <Card className="grid justify-items-center gap-2 text-center !py-6">
      <Avatar p={p} size={104} />
      <h2 className="display text-[30px] font-bold uppercase leading-none mt-1">{p.name}</h2>
      <p className="text-[13px] text-mute">Traint sinds {monthName(since.getMonth())} {since.getFullYear()} · {sessionsOf(d, uid).filter(s => s.finishedAt).length} trainingen</p>
      {sh.live && live && <p className="text-[13px] font-semibold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--plate-10)] animate-pulse" />Traint nu · {live.exName}</p>}
    </Card>
    <div className="grid grid-cols-2 gap-2.5">
      {sh.streak ? <Card className="grid gap-1"><span className="label flex items-center gap-1"><Flame size={13} />Streak</span><b className="display text-[34px] leading-none num">{st.count}</b><span className="text-[12px] text-mute">beste {st.best}</span></Card> : <Card><Hidden what="Je streak" />{!own && <span className="text-[13px] text-mute">Streak niet gedeeld</span>}</Card>}
      {sh.trainingen ? <Card className="flex items-center gap-3"><Ring value={pl ? wk / pl : 0} size={52} stroke={6}><span className="text-[12px] font-bold num">{wk}/{pl}</span></Ring><span className="text-[13px] text-mute leading-tight">trainingen deze week</span></Card> : <Card><Hidden what="Trainingen" /></Card>}
    </div>
    {sh.badges ? <Card><h3 className="label mb-3">Badges</h3>{bs.length ? <div className="grid grid-cols-3 gap-y-3">{bs.map(s => <div key={s.b.id} className="grid justify-items-center gap-1 text-center"><Medal s={s} size={56} /><span className="text-[12px] font-semibold leading-tight">{s.b.stepNames ? s.b.stepNames[s.level - 1] : s.b.name}</span></div>)}</div> : <p className="text-[13px] text-mute">Nog geen badges.</p>}</Card> : <Card><Hidden what="Badges" /></Card>}
    {sh.records ? recs.length > 0 && <Card className="!p-0"><h3 className="label p-4 pb-1">Records</h3>{recs.map(r => <div key={r.exId} className="flex items-center gap-3 px-4 py-3 border-t border-line"><Trophy size={16} className="text-mute shrink-0" /><span className="grow text-[14px]">{exById(d, r.exId).name}</span><b className="num text-[14px]">{fmtKg(r.w)} × {r.r}</b></div>)}</Card> : <Card><Hidden what="Records" /></Card>}
    {sh.trainingen && last.length > 0 && <Card className="!p-0"><h3 className="label p-4 pb-1">Laatste trainingen</h3>{last.map(s => <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-t border-line"><span className="grow"><b className="block text-[14px]">{s.title}</b><span className="text-[12px] text-mute">{dshort(s.date)}</span></span><span className="num text-[13px] text-mute">{fmtKg(Math.round(volume(d, s)))} kg</span></div>)}</Card>}
    {sh.schema ? <Card><h3 className="label mb-2">Schema</h3><div className="flex flex-wrap gap-1.5">{planDays(d.plans[uid]).map(k => <span key={k} className="rounded-full bg-sunk px-3 h-8 grid place-items-center text-[13px]"><b className="mr-1">{DAY_NAME[k].slice(0, 2)}</b>{d.plans[uid][k]!.title}</span>)}</div></Card> : <Card><Hidden what="Je schema" /></Card>}
  </>;
}

async function toSquareJpeg(file: File, n = 320): Promise<string> {
  const url = URL.createObjectURL(file);
  try { const img = await new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = url; });
    const c = document.createElement("canvas"); c.width = n; c.height = n; const g = c.getContext("2d")!, m = Math.min(img.width, img.height);
    g.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, n, n); return c.toDataURL("image/jpeg", .85);
  } finally { URL.revokeObjectURL(url); }
}

export function ProfilePage() {
  const { data: d, back } = useApp(); const [edit, setEdit] = useState(false); if (!d) return null;
  return <Page title="Profiel" onBack={back}>
    <p className="text-[13px] text-mute -mt-1">Zo ziet je trainingsmaat je.</p>
    <ProfileCard uid={d.me} own />
    <Btn variant="ghost" onClick={() => setEdit(true)}><Camera size={16} />Profiel bewerken</Btn>
    <ProfileEditSheet open={edit} onClose={() => setEdit(false)} />
  </Page>;
}

export function ProfileEditSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: d, update, toast } = useApp(); if (!d) return null; const me = d.profiles[d.me];
  return <>
    <Sheet open={open} onClose={onClose} title="Profiel wijzigen">
      <div className="grid gap-4">
        <div className="flex items-center gap-4"><Avatar p={me} size={84} />
          <div className="grid gap-2"><label className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[12px] bg-accent text-accent-ink font-semibold text-[14px] cursor-pointer"><Camera size={16} />Foto kiezen
            <input id="pf-photo" type="file" accept="image/*" className="sr-only" onChange={async e => { const f = e.target.files?.[0]; if (!f) return; try { const u = await toSquareJpeg(f); update(x => { x.profiles[x.me].photo = u; }); toast("Profielfoto bijgewerkt."); } catch { toast("Deze foto kon niet gelezen worden."); } e.target.value = ""; }} /></label>
            {me.photo && <Btn variant="line" size="sm" onClick={() => update(x => { delete x.profiles[x.me].photo; })}><Trash2 size={14} />Foto weghalen</Btn>}</div></div>
        <label className="grid gap-1.5"><span className="label">Naam</span><input id="pf-name" className={inputCls} value={me.name} maxLength={24} onChange={e => update(x => { x.profiles[x.me].name = e.target.value; })} /></label>
        <p className="text-[12px] text-mute">Je foto wordt verkleind tot een vierkant van 320 pixels. Zonder foto toont de app je initiaal in jouw kleur.</p>
        <Btn onClick={onClose}>Klaar</Btn>
      </div>
    </Sheet>
  </>;
}

export function MateProfilePage() {
  const { data: d, back } = useApp(); if (!d || !d.mate) return null;
  return <Page title={d.profiles[d.mate].name} onBack={back}><ProfileCard uid={d.mate} /></Page>;
}

/* ---------- delen ---------- */
export function SharePage() {
  const { data: d, update, back, setPage } = useApp(); if (!d) return null;
  const sh = shareOf(d.profiles[d.me]);
  const rows: [keyof Share, string, string][] = [["live", "Wanneer je traint", "Je maat ziet live welke oefening je doet"], ["trainingen", "Trainingen", "Hoeveel je traint en je laatste trainingen"], ["streak", "Streak", "Hoeveel trainingen op rij"], ["badges", "Badges", "Je behaalde badges"], ["records", "Records", "Je beste sets"], ["schema", "Schema", "Je trainingsdagen en hun naam"]];
  return <Page title="Delen" onBack={back}>
    <p className="text-[14px] text-mute -mt-1">Kies wat je trainingsmaat op je profiel ziet.</p>
    <div className="bg-surface rounded-[18px] overflow-hidden">{rows.map(([k, t, s]) => <label key={k} className="flex items-center gap-3 px-4 min-h-[64px] py-2.5 border-t border-line first:border-0 cursor-pointer">
      <span className="grow"><b className="block text-[15px]">{t}</b><span className="text-[12px] text-mute">{s}</span></span>
      <input id={`share-${k}`} type="checkbox" checked={sh[k]} onChange={e => update(x => { x.profiles[x.me].share = { ...shareOf(x.profiles[x.me]), [k]: e.target.checked }; })} className="h-6 w-6 accent-[var(--accent)]" /></label>)}</div>
    <Card className="flex gap-2.5 text-[13px] text-mute"><Lock size={16} className="shrink-0 mt-0.5" /><span>Je lichaamsgewicht deel je nooit: dat ziet alleen jij.</span></Card>
    <Btn variant="ghost" onClick={() => setPage("profiel")}><UserRound size={16} />Bekijk je profiel</Btn>
  </Page>;
}

export function LookPage() {
  const { data: d, update, back, theme, setTheme, accent, setAccent } = useApp(); if (!d) return null; const me = d.profiles[d.me];
  const TH: [Accent, string, string, string][] = [["roze", "Roze", "#b8325e", "#f29bb7"], ["blauw", "Blauw", "#1f4bd1", "#6e8fff"], ["grijs", "Grijs", "#27272a", "#e4e4e7"]];
  return <Page title="Weergave" onBack={back}>
    <Card className="grid gap-3"><h2 className="text-[15px] font-semibold">Thema</h2>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Thema">{TH.map(([k, n, l, dk]) => <button key={k} role="radio" aria-checked={accent === k} onClick={() => setAccent(k)}
        className={cn("rounded-[14px] p-2.5 grid gap-2 justify-items-center border-2 transition", accent === k ? "border-[var(--ink)]" : "border-transparent bg-sunk")}>
        <span className="flex h-10 w-full rounded-[10px] overflow-hidden" aria-hidden="true"><i className="flex-1" style={{ background: l }} /><i className="flex-1" style={{ background: dk }} /></span>
        <span className="text-[13px] font-semibold">{n}</span></button>)}</div>
      <p className="text-[12px] text-mute">Elk thema heeft een lichte en een donkere versie. Links licht, rechts donker.</p></Card>
    <Card className="grid gap-3"><h2 className="text-[15px] font-semibold">Kleur rond je foto</h2><div className="flex gap-3">{(Object.keys(COLORS) as Profile["color"][]).map(c => <button key={c} onClick={() => update(x => { x.profiles[x.me].color = c; })} aria-pressed={me.color === c} aria-label={c} className={cn("h-12 w-12 rounded-full ring-offset-2 ring-offset-[var(--surface)]", me.color === c && "ring-2 ring-[var(--ink)]")} style={{ background: COLORS[c] }} />)}</div><p className="text-[12px] text-mute">Rond je foto en in grafieken bij je maat.</p></Card>
    <Card className="grid gap-3"><h2 className="text-[15px] font-semibold">Licht of donker</h2><Seg value={theme} onChange={setTheme} label="Weergave" options={[["auto", "Automatisch"], ["licht", "Licht"], ["donker", "Donker"]]} /><p className="text-[12px] text-mute">Automatisch volgt je telefoon.</p></Card>
  </Page>;
}

export function TrainPage() {
  const { data: d, update, back } = useApp(); if (!d) return null; const me = d.profiles[d.me];
  return <Page title="Trainen" onBack={back}>
    <Card className="grid gap-3"><h2 className="text-[15px] font-semibold">Gewicht automatisch verhogen</h2><Seg value={me.prog} onChange={v => update(x => { x.profiles[x.me].prog = v; })} label="Progressie" options={[["op", "Ja, na alle sets"], ["gelijk", "Nee, zelf kiezen"]]} />
      <p className="text-[12px] text-mute">{me.prog === "op" ? "Haal je alle sets en voelde het niet zwaar, dan komt er de volgende keer één stap bij (meestal 2,5 kg). Twee keer op rij niet gehaald geeft 10% minder." : "Het voorstel blijft op wat je vorige keer deed."}</p></Card>
    <Card className="grid gap-3"><h2 className="text-[15px] font-semibold">Standaard rusttijd</h2><Stepper id="pf-rest" label="Rusttijd in seconden" value={me.rest} step={15} min={15} unit="sec" onChange={v => update(x => { x.profiles[x.me].rest = v; })} /><p className="text-[12px] text-mute">Per oefening kun je in je schema een andere rusttijd kiezen.</p></Card>
  </Page>;
}

export function MatePage() {
  const { data: d, update, back, setPage, toast } = useApp(); const [leave, setLeave] = useState(false); if (!d) return null;
  const mate = d.mate ? d.profiles[d.mate] : null;
  return <Page title="Trainingsmaat" onBack={back}>
    {mate ? <><button onClick={() => setPage("maatprofiel")} className="bg-surface rounded-[18px] p-4 flex items-center gap-3 text-left"><Avatar p={mate} size={52} /><span className="grow"><b className="block text-[16px]">{mate.name}</b><span className="text-[12px] text-mute">Bekijk profiel</span></span><ChevronRight size={18} className="text-mute" /></button>
      <Btn variant="line" onClick={() => setLeave(true)}>Niet meer samen trainen</Btn></> : <InviteCard />}
    <Sheet open={leave} onClose={() => setLeave(false)} title="Niet meer samen trainen" sub={`Jij en ${mate?.name} zien elkaars trainingen dan niet meer. Je eigen gegevens blijven bij jou.`}>
      <Btn variant="danger" className="w-full" onClick={() => { update(x => { const m = x.mate; if (!m) return; x.mate = null; delete x.profiles[m]; delete x.plans[m]; delete x.live[m]; Object.keys(x.sessions).forEach(k => { if (x.sessions[k].uid === m) delete x.sessions[k]; }); }); setLeave(false); toast("Je traint nu alleen."); }}>Niet meer samen trainen</Btn>
    </Sheet>
  </Page>;
}

export function DataPage() {
  const { data: d, back, auth, toast, startFresh } = useApp(); const [bk, setBk] = useState(false); if (!d) return null;
  const json = JSON.stringify({ app: "gymmaat", at: new Date().toISOString(), docs: toDocs(d) });
  return <Page title="Gegevens" onBack={back}>
    <div className="bg-surface rounded-[18px] overflow-hidden">
      <button onClick={() => setBk(true)} className="w-full flex items-center gap-3 px-4 min-h-[60px] text-left"><span className="grow"><b className="block text-[15px]">Back-up maken</b><span className="text-[12px] text-mute">Al je trainingen, schema en gewicht in één bestand</span></span><ChevronRight size={18} className="text-mute" /></button>
      {auth?.email === DEMO_EMAIL && <button onClick={() => { startFresh(makeSample()); toast("Voorbeeld teruggezet."); }} className="w-full flex items-center gap-3 px-4 min-h-[60px] border-t border-line text-left"><RotateCcw size={18} className="text-mute" /><span className="grow"><b className="block text-[15px]">Voorbeeld opnieuw beginnen</b><span className="text-[12px] text-mute">Zet de voorbeeldgegevens terug</span></span></button>}
    </div>
    <Sheet open={bk} onClose={() => setBk(false)} title="Back-up" sub="In de echte app download je dit als bestand. Hier kun je het kopiëren.">
      <textarea id="bk-json" readOnly className="w-full h-40 rounded-[12px] bg-sunk p-3 text-[11px] font-mono" value={json} />
      <Btn className="w-full mt-3" onClick={async () => { try { await navigator.clipboard.writeText(json); toast("Back-up gekopieerd."); } catch { (document.getElementById("bk-json") as HTMLTextAreaElement)?.select(); toast("Selecteer de tekst en kopieer hem."); } }}>Kopiëren</Btn>
    </Sheet>
  </Page>;
}

export function AccountPage() {
  const { back, auth, logout, deleteAccount } = useApp(); const [del, setDel] = useState(false), [conf, setConf] = useState("");
  return <Page title="Account" onBack={back}>
    <Card><span className="label">E-mailadres</span><p className="text-[15px] mt-1">{auth?.email}</p><p className="text-[12px] text-mute mt-1">Je logt in met een code die we naar dit adres mailen. Er is geen wachtwoord.</p></Card>
    <Btn variant="line" onClick={logout}><LogOut size={16} />Afmelden</Btn>
    <Btn variant="danger" onClick={() => setDel(true)}><Trash2 size={16} />Account verwijderen</Btn>
    <Sheet open={del} onClose={() => setDel(false)} title="Account verwijderen" sub="Dit wist je account, schema, alle trainingen en je gewicht. Dit kan niet ongedaan gemaakt worden.">
      <label className="grid gap-1.5"><span className="label">Typ VERWIJDER om te bevestigen</span><input id="del-conf" className={inputCls} value={conf} onChange={e => setConf(e.target.value)} autoComplete="off" /></label>
      <Btn variant="danger" className="w-full mt-3" disabled={conf.trim().toUpperCase() !== "VERWIJDER"} onClick={() => { setDel(false); deleteAccount(); }}>Definitief verwijderen</Btn>
    </Sheet>
  </Page>;
}

export function AboutPage() {
  const { back } = useApp();
  return <Page title="Over Gymmaat" onBack={back}>
    <Card className="text-[14px] grid gap-2"><h2 className="font-semibold flex items-center gap-1.5"><Lock size={15} />Privacy</h2>
      <p className="text-mute">Gymmaat bewaart je e-mailadres, profiel, schema, trainingen en lichaamsgewicht op een server in de EU.</p>
      <p className="text-mute">Wat je trainingsmaat ziet, kies je zelf onder Delen en privacy. Je lichaamsgewicht ziet alleen jij.</p>
      <p className="text-mute">Dit is een voorbeeldversie: alles blijft in deze browser en er wordt niets verstuurd.</p></Card>
    <p className="text-center text-[12px] text-mute">Gymmaat · voorbeeld</p>
  </Page>;
}
void pdate;
