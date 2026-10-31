export type DayKey = "ma" | "di" | "wo" | "do" | "vr" | "za" | "zo";
export const DAYS: DayKey[] = ["ma", "di", "wo", "do", "vr", "za", "zo"];
export const DAY_NAME: Record<DayKey, string> = { ma: "Maandag", di: "Dinsdag", wo: "Woensdag", do: "Donderdag", vr: "Vrijdag", za: "Zaterdag", zo: "Zondag" };

export type Group = "Borst" | "Rug" | "Benen" | "Billen" | "Schouders" | "Armen" | "Core" | "Cardio";
/** gewicht: kg × herhalingen · lichaam: herhalingen met eigen gewicht · tijd: seconden vasthouden · cardio: minuten */
export type Kind = "gewicht" | "lichaam" | "tijd" | "cardio";

export interface Exercise { id: string; name: string; group: Group; kind: Kind; step: number; equip: string; bar?: number; custom?: boolean }
export interface PlanItem { id: string; exId: string; sets: number; target: number; weight: number; rest: number }
export interface PlanDay { title: string; items: PlanItem[] }
export type Plan = Partial<Record<DayKey, PlanDay>>;

export interface SetLog { w: number; r: number; done: boolean; at?: number }
export type Feel = "licht" | "goed" | "zwaar";
export interface ItemLog { pid: string; exId: string; target: number; sets: SetLog[]; note?: string; feel?: Feel; speed?: number; incline?: number }
export interface Session { id: string; uid: string; date: string; day: DayKey; title: string; startedAt: number; finishedAt?: number; items: ItemLog[]; rating?: number }

export type Goal = "spier" | "kracht" | "af" | "fit";
export type Level = "beg" | "mid" | "pro";
export interface Profile {
  uid: string; name: string; color: "blauw" | "rood" | "groen" | "geel"; goal: Goal; level: Level;
  days: DayKey[]; rest: number; prog: "op" | "gelijk"; place: "gym" | "thuis"; createdAt: number;
  photo?: string;                       // jpeg data-URL, vierkant
  sound?: boolean; vibrate?: boolean;   // standaard aan
  share?: Share;                        // wat je maat op je profiel ziet
}
export interface Share { live: boolean; trainingen: boolean; streak: boolean; badges: boolean; records: boolean; schema: boolean }
export const SHARE_DEFAULT: Share = { live: true, trainingen: true, streak: true, badges: true, records: true, schema: true };
export interface Msg { id: string; from: string; to: string; text: string; at: number }
export interface Live { uid: string; sessionId: string; title: string; exName: string; exIdx: number; exTotal: number; exKind?: Kind; exSince?: number; setsDone: number; setsTotal: number; startedAt: number; updatedAt: number }

export interface Data {
  me: string;
  mate: string | null;
  profiles: Record<string, Profile>;
  plans: Record<string, Plan>;
  sessions: Record<string, Session>;
  bw: Record<string, number>;          // alleen je eigen lichaamsgewicht
  bwGoal?: number;
  msgs: Msg[];
  live: Record<string, Live>;
  custom: Record<string, Exercise>;
  pauses?: Pause[];                    // ziek of rustweek: de streak loopt niet door, maar breekt ook niet
}
export interface Pause { from: string; to: string | null; reason: "ziek" | "rustweek" }
