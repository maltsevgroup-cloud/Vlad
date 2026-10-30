import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Data, Msg } from "./types";
import { DemoBackend, type Backend } from "./backend";
import { makeSample, DEMO_MATE } from "./sample";
import { exById } from "./logic";

export type Tab = "vandaag" | "schema" | "samen" | "profiel";
export type Page = "voortgang" | "voortgang:gewicht" | "voortgang:records" | "badges" | "profiel" | "maatprofiel" | "delen" | "weergave" | "trainen" | "maat" | "gegevens" | "account" | "over" | null;
export type ThemePref = "auto" | "licht" | "donker";
export type Accent = "blauw" | "roze" | "grijs";
export type NavMode = "menu" | "lijn";
interface Auth { email: string; uid: string }
interface Ctx {
  data: Data | null; auth: Auth | null; tab: Tab; setTab: (t: Tab) => void;
  update: (fn: (d: Data) => void) => void;
  workout: string | null; openWorkout: (sid: string | null) => void;
  toast: (m: string, undo?: () => void) => void; toastMsg: string | null; toastUndo: (() => void) | null; undoable: (msg: string, fn: (d: Data) => void) => void;
  login: (email: string) => void; logout: () => void; deleteAccount: () => void; startFresh: (d: Data) => void;
  theme: ThemePref; setTheme: (t: ThemePref) => void; backend: Backend; accent: Accent; setAccent: (a: Accent) => void; nav: NavMode; setNav: (n: NavMode) => void;
  page: Page; setPage: (p: Page) => void; back: () => void; celebrate: string[] | null; setCelebrate: (ids: string[] | null) => void;
  streakPop: string[] | null; setStreakPop: (b: string[] | null) => void; unread: number; markRead: () => void; chatOpen: boolean; setChatOpen: (b: boolean) => void; typing: boolean;
}
const C = createContext<Ctx>(null as unknown as Ctx);
export const useApp = () => useContext(C);
export const DEMO_EMAIL = "sam@voorbeeld.be";
const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* niet beschikbaar */ } };

const REPLIES = ["Dankje! Nog twee oefeningen.", "Haha, jij ook!", "Bijna klaar hier.", "Komt goed, zie je straks."];

export function AppProvider({ children }: { children: ReactNode }) {
  const backend = useRef<Backend>(new DemoBackend()).current;
  const [data, setData] = useState<Data | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [tab, setTab] = useState<Tab>("vandaag");
  const [workout, openWorkout] = useState<string | null>(null);
  const [stack, setStack] = useState<Page[]>([]); const page = stack.length ? stack[stack.length - 1] : null;
  const setPage = useCallback((p: Page) => setStack(s => p === null ? [] : [...s.filter(x => x !== p), p]), []);
  const back = useCallback(() => setStack(s => s.slice(0, -1)), []);
  const [celebrate, setCelebrate] = useState<string[] | null>(null);
  const [streakPop, setStreakPop] = useState<string[] | null>(null);
  const [chatOpen, setChatOpen] = useState(false), [typing, setTyping] = useState(false);
  const [readAt, setReadAt] = useState<number | null>(() => { const v = lsGet("gymmaat-nieuw.readAt"); return v ? +v : null; });
  const [toastMsg, setToast] = useState<string | null>(null); const [toastUndo, setToastUndo] = useState<(() => void) | null>(null);
  const [theme, setThemeS] = useState<ThemePref>(() => (lsGet("gymmaat-nieuw.theme") as ThemePref) || "auto");
  const tt = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string, undo?: () => void) => { setToast(m); setToastUndo(() => undo || null); clearTimeout(tt.current); tt.current = window.setTimeout(() => { setToast(null); setToastUndo(null); }, undo ? 5000 : 2600); }, []);
  const update = useCallback((fn: (d: Data) => void) => setData(prev => { if (!prev) return prev; const n = structuredClone(prev); fn(n); backend.save(n); return n; }), [backend]);

  const toastRef = useRef(toast); toastRef.current = toast;
  /** wijziging met "Ongedaan maken" in de melding: de vorige toestand wordt 5 seconden bijgehouden */
  const undoable = useCallback((msg: string, fn: (d: Data) => void) => {
    let snap: Data | null = null;
    setData(prev => { if (!prev) return prev; snap = structuredClone(prev); const n = structuredClone(prev); fn(n); backend.save(n); return n; });
    toast(msg, () => { if (snap) { const s = snap; setData(s); backend.save(s); toastRef.current("Hersteld."); } });
  }, [backend, toast]);
  // eerste keer: meteen het voorbeeld tonen, ingelogd als Sam
  useEffect(() => { (async () => {
    const a = lsGet("gymmaat-nieuw.auth");
    if (a === "uit") { setAuth(null); return; }
    const saved = await backend.load(); const d = saved || makeSample(); if (!saved) backend.save(d);
    setData(d); setAuth(a ? JSON.parse(a) : { email: DEMO_EMAIL, uid: d.me });
  })(); }, [backend]);

  useEffect(() => { const r = document.documentElement; if (theme === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", theme === "donker" ? "dark" : "light"); }, [theme]);
  const setTheme = (t: ThemePref) => { setThemeS(t); lsSet("gymmaat-nieuw.theme", t); };
  const [accent, setAccentS] = useState<Accent>(() => (lsGet("gymmaat-nieuw.accent") as Accent) || "blauw");
  useEffect(() => { const r = document.documentElement; if (accent === "blauw") r.removeAttribute("data-accent"); else r.setAttribute("data-accent", accent); }, [accent]);
  // statusbalk van de telefoon in de achtergrondkleur van het thema
  useEffect(() => { const paint = () => { const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim(); if (!bg) return;
      let m = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null; if (!m) { m = document.createElement("meta"); m.name = "theme-color"; document.head.appendChild(m); } m.content = bg; };
    paint(); const mq = window.matchMedia?.("(prefers-color-scheme: dark)"); mq?.addEventListener?.("change", paint); return () => mq?.removeEventListener?.("change", paint); }, [accent, theme]);
  const setAccent = (a: Accent) => { setAccentS(a); lsSet("gymmaat-nieuw.accent", a); };
  const [nav, setNavS] = useState<NavMode>(() => (lsGet("gymmaat-nieuw.nav") as NavMode) || "menu");
  const setNav = (n: NavMode) => { setNavS(n); lsSet("gymmaat-nieuw.nav", n); };

  // voorbeeld: je maat traint verder en antwoordt op berichten
  useEffect(() => {
    if (!data?.mate || data.mate !== DEMO_MATE) return;
    const iv = window.setInterval(() => update(d => { const l = d.live[DEMO_MATE]; if (!l) return;
      l.setsDone = Math.min(l.setsTotal, l.setsDone + 1); l.updatedAt = Date.now();
      const plan = d.plans[DEMO_MATE]; const day = Object.values(plan).find(p => p?.title === l.title);
      if (day) { let n = l.setsDone, i = 0; while (i < day.items.length && n >= day.items[i].sets) { n -= day.items[i].sets; i++; } l.exIdx = Math.min(i, day.items.length - 1); l.exName = day.items[l.exIdx] ? exById(d, day.items[l.exIdx].exId).name : l.exName; }
      if (l.setsDone >= l.setsTotal) delete d.live[DEMO_MATE];
    }), 45000);
    return () => clearInterval(iv);
  }, [data?.mate, update]);
  const pinged = useRef(false);
  useEffect(() => { if (!data || data.mate !== DEMO_MATE || pinged.current) return; pinged.current = true;
    const t = window.setTimeout(() => update(d => { if (d.mate !== DEMO_MATE) return; d.msgs.push({ id: "p" + Date.now(), from: DEMO_MATE, to: d.me, text: "Ben je al onderweg? Ik zit aan de leg press.", at: Date.now() }); }), 20000);
    return () => clearTimeout(t); }, [data, update]);
  const lastMsgs = useRef(0);
  useEffect(() => {
    if (!data || data.mate !== DEMO_MATE) return;
    const mine = data.msgs.filter(m => m.from === data.me && m.to === DEMO_MATE);
    if (mine.length > lastMsgs.current && lastMsgs.current > 0) {
      const t0 = window.setTimeout(() => setTyping(true), 1200);
      const t = window.setTimeout(() => { setTyping(false); update(d => { const m: Msg = { id: "r" + Date.now(), from: DEMO_MATE, to: d.me, text: REPLIES[d.msgs.length % REPLIES.length], at: Date.now() }; d.msgs.push(m); }); }, 4200);
      lastMsgs.current = mine.length; return () => { clearTimeout(t0); clearTimeout(t); setTyping(false); };
    }
    lastMsgs.current = mine.length;
  }, [data, update]);

  // eerste keer: alles voor het laatste bericht van je maat is gelezen, dat ene niet (zoals na een melding)
  useEffect(() => { if (!data || readAt !== null) return; const last = data.msgs.filter(m => m.from === data.mate).slice(-1)[0]; const v = last ? last.at - 1 : Date.now(); setReadAt(v); lsSet("gymmaat-nieuw.readAt", String(v)); }, [data, readAt]);
  const markRead = useCallback(() => { const v = Date.now(); setReadAt(v); lsSet("gymmaat-nieuw.readAt", String(v)); }, []);
  const unread = data && data.mate && readAt !== null ? data.msgs.filter(m => m.from === data.mate && m.to === data.me && m.at > readAt).length : 0;
  useEffect(() => { if (chatOpen && unread) markRead(); }, [chatOpen, unread, markRead]);
  const login = async (email: string) => {
    email = email.trim().toLowerCase();
    if (email === DEMO_EMAIL) { const d = (await backend.load()) || makeSample(); backend.save(d); setData(d); const a = { email, uid: d.me }; setAuth(a); lsSet("gymmaat-nieuw.auth", JSON.stringify(a)); setTab("vandaag"); return; }
    setData(null); setAuth({ email, uid: "u-" + Math.random().toString(36).slice(2, 10) }); // nieuw account: onboarding
  };
  const startFresh = (d: Data) => { setData(d); backend.save(d); if (auth) lsSet("gymmaat-nieuw.auth", JSON.stringify(auth)); setTab("vandaag"); };
  const logout = () => { setAuth(null); setData(null); openWorkout(null); lsSet("gymmaat-nieuw.auth", "uit"); };
  const deleteAccount = () => { backend.clear(); logout(); toast("Je account en al je gegevens zijn verwijderd."); };

  return <C.Provider value={{ data, auth, tab, setTab, update, workout, openWorkout, toast, toastMsg, toastUndo, undoable, login, logout, deleteAccount, startFresh, theme, setTheme, backend, accent, setAccent, nav, setNav, page, setPage, back, celebrate, setCelebrate, streakPop, setStreakPop, unread, markRead, chatOpen, setChatOpen, typing }}>{children}</C.Provider>;
}
