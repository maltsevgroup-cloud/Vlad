import { AppProvider, useApp, type Tab } from "@/lib/store";
import { Login } from "./app/Login";
import { Onboarding } from "./app/Onboarding";
import { Home } from "./app/Home";
import { PlanView } from "./app/PlanView";
import { Progress } from "./app/Progress";
import { BadgesPage, Medal } from "./app/Badges";
import { ChatHead } from "./app/Chat";
import { GestureBar } from "./app/GestureBar";
import { StreakPop } from "./app/StreakPop";
import { Sheet, Btn } from "./app/ui";
import { badgeStates, LEVELS } from "@/lib/rewards";
import { nextTraining } from "@/lib/logic";
import { today } from "@/lib/dates";
import { startSession } from "./app/actions";
import { Together } from "./app/Together";
import { SettingsHome, ProfilePage, MateProfilePage, SharePage, LookPage, TrainPage, MatePage, DataPage, AccountPage, AboutPage } from "./app/Settings";
import { Workout } from "./app/Workout";
import { House, ClipboardList, Users, Settings as Cog, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS: [Tab, string, typeof House][] = [["vandaag", "Home", House], ["schema", "Schema", ClipboardList], ["samen", "Samen", Users], ["profiel", "Instellingen", Cog]];

function Shell() {
  const { data, auth, tab, setTab, workout, openWorkout, toastMsg, toastUndo, page, setPage, update, celebrate, setCelebrate, unread, nav } = useApp();
  let body;
  if (!auth) body = <Login />;
  else if (!data) body = <Onboarding />;
  else body = <>
    <main inert={!!workout || !!page} className="max-w-[480px] mx-auto gutter" style={{ paddingTop: 8, paddingBottom: nav === "lijn" ? "calc(64px + env(safe-area-inset-bottom, 0px))" : "calc(96px + env(safe-area-inset-bottom, 0px))" }}>
      {tab === "vandaag" && <Home />}{tab === "schema" && <PlanView />}{tab === "samen" && <Together />}{tab === "profiel" && <SettingsHome />}
    </main>
    {page?.startsWith("voortgang") && <Progress initial={page === "voortgang:gewicht" ? "gewicht" : page === "voortgang:records" ? "records" : "kracht"} />}
    {page === "badges" && <BadgesPage />}{page === "profiel" && <ProfilePage />}{page === "maatprofiel" && <MateProfilePage />}{page === "delen" && <SharePage />}{page === "weergave" && <LookPage />}
    {page === "trainen" && <TrainPage />}{page === "maat" && <MatePage />}{page === "gegevens" && <DataPage />}{page === "account" && <AccountPage />}{page === "over" && <AboutPage />}
    {nav === "lijn" ? <GestureBar /> : <>
    <nav inert={!!workout} className="fixed bottom-0 inset-x-0 z-[38] bg-surface border-t border-line" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)", paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }} aria-label="Hoofdmenu">
      <div className="max-w-[480px] mx-auto grid grid-cols-5">{[TABS[0], TABS[1], null, TABS[2], TABS[3]].map(x => {
        if (!x) { const live = data.live[data.me], nt = nextTraining(data, data.me);
          return <div key="train" className="relative grid place-items-center"><button onClick={() => { const run = live && data.sessions[live.sessionId] && !data.sessions[live.sessionId].finishedAt ? live.sessionId : null;
              if (run) { openWorkout(run); return; } if (!nt) { setPage(null); setTab("schema"); return; } let id = ""; update(d => { id = startSession(d, nt.day); }); setTimeout(() => openWorkout(id || `${data.me}_${today()}_${nt.day}`), 0); }}
            className="absolute -top-5 h-16 w-16 rounded-full bg-accent text-accent-ink grid place-items-center shadow-[0_10px_24px_-10px_var(--accent)] ring-4 ring-[var(--surface)] active:scale-95 transition" aria-label={live ? "Training verderzetten" : "Training starten"}>
            <Dumbbell size={26} strokeWidth={2.3} /></button>
            <span className="text-[12px] font-semibold text-mute mt-11">Training</span></div>; }
        const [k, n, I] = x; const on = tab === k && !page;
        return <button key={k} onClick={() => { setPage(null); setTab(k); window.scrollTo(0, 0); }} aria-current={on ? "page" : undefined}
        className={cn("relative h-16 grid place-items-center content-center gap-1 text-[12px] font-semibold", on ? "text-accent" : "text-mute")}>
        <span className={cn("h-8 w-14 grid place-items-center rounded-full transition", on && "bg-accent-soft")}><I size={20} strokeWidth={on ? 2.4 : 2} /></span>{n}
        {k === "samen" && unread > 0 && <span className="absolute top-1 right-[calc(50%-26px)] min-w-[18px] h-[18px] px-1 rounded-full bg-[#E5262B] text-white text-[11px] font-bold num grid place-items-center ring-2 ring-[var(--surface)]" aria-label={`${unread} ongelezen`}>{unread}</span>}</button>; })}</div>
    </nav>
    </>}
    {workout && <Workout sid={workout} />}
    <StreakPop />
    {!(tab === "samen" && !page && !workout) && <ChatHead bottom={workout ? 120 : nav === "lijn" ? 56 : 92} />}
    {celebrate && <Sheet open onClose={() => setCelebrate(null)} title="Nieuwe badge" sub="Goed gedaan.">
      <div className="grid gap-3">{badgeStates(data, data.me).filter(s => celebrate.includes(s.b.id)).map(s => <div key={s.b.id} className="flex items-center gap-3 rounded-[14px] bg-sunk p-3"><Medal s={s} size={56} />
        <div><b className="block text-[15px]">{s.b.stepNames ? s.b.stepNames[s.level - 1] : s.b.name}</b><span className="text-[13px] text-mute">Level {LEVELS[s.level - 1].n} · {s.b.unit(s.b.steps[s.level - 1])}</span></div></div>)}
        <Btn onClick={() => { setCelebrate(null); setPage("badges"); }}>Bekijk je badges</Btn></div></Sheet>}
  </>;
  return <>{body}{toastMsg && <div className="fixed left-1/2 -translate-x-1/2 z-[70] w-max max-w-[92%] flex items-center gap-3 rounded-full bg-ink text-bg pl-4 pr-1.5 py-1.5 text-[13px] font-semibold shadow-xl anim-sheet" style={{ bottom: nav === "lijn" ? "calc(56px + env(safe-area-inset-bottom, 0px))" : "calc(92px + env(safe-area-inset-bottom, 0px))" }} role="status">
    <span className="py-1">{toastMsg}</span>{toastUndo ? <button onClick={toastUndo} className="h-9 px-3 rounded-full text-bg font-bold" style={{ background: "color-mix(in srgb, var(--bg) 18%, transparent)" }}>Ongedaan maken</button> : <span className="w-2" />}</div>}</>;
}
export default function App() { return <AppProvider><Shell /></AppProvider>; }
