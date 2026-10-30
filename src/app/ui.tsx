import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Minus, Plus, X, ChevronLeft } from "lucide-react";
import { useSwipeBack } from "./swipe";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";
import { platesPerSide, fmtKg } from "@/lib/logic";

export const COLORS: Record<Profile["color"], string> = { blauw: "var(--plate-20)", rood: "var(--plate-25)", groen: "var(--plate-10)", geel: "var(--plate-15)" };

export function Btn({ variant = "primary", size = "md", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "line" | "danger" | "soft"; size?: "sm" | "md" | "lg" }) {
  return <button {...p} className={cn("inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[.98] disabled:opacity-45 disabled:pointer-events-none select-none",
    size === "sm" ? "h-10 px-3.5 text-[13px] rounded-[10px]" : size === "lg" ? "h-14 px-6 text-[16px] rounded-[14px]" : "h-11 px-4 text-[14px] rounded-[12px]",
    variant === "primary" && "bg-accent text-accent-ink shadow-[0_6px_16px_-8px_var(--accent)]",
    variant === "soft" && "bg-accent-soft text-accent",
    variant === "ghost" && "bg-sunk text-ink",
    variant === "line" && "border border-line text-ink bg-surface",
    variant === "danger" && "bg-[var(--plate-25)] text-white", className)} />;
}

export function Avatar({ p, size = 36 }: { p?: Profile; size?: number }) {
  const c = p ? COLORS[p.color] : "var(--mute)";
  if (p?.photo) return <img src={p.photo} alt="" width={size} height={size} className="rounded-full object-cover shrink-0" style={{ width: size, height: size, boxShadow: `0 0 0 2px ${c}` }} />;
  return <span className="inline-grid place-items-center rounded-full font-display font-bold shrink-0" style={{ width: size, height: size, background: c, color: p?.color === "geel" ? "#1a1a1a" : "#fff", fontSize: size * 0.46 }} aria-hidden="true">{p?.name.slice(0, 1).toUpperCase() || "?"}</span>;
}

export function Stepper({ value, onChange, step, min = 0, unit, label, id, compact }: { value: number; onChange: (v: number) => void; step: number; min?: number; unit?: string; label: string; id: string; compact?: boolean }) {
  const s = step || 1;
  return <div data-noswipe className="flex items-center rounded-[12px] bg-sunk h-12 min-w-0" role="group" aria-label={label}>
    <button className={cn("h-12 shrink-0 grid place-items-center text-mute active:text-ink", compact ? "w-9" : "w-11")} onClick={() => onChange(Math.max(min, Math.round((value - s) * 100) / 100))} aria-label={`${label} minder`}><Minus size={16} /></button>
    <input id={id} inputMode="decimal" className={cn("w-full min-w-0 bg-transparent text-center font-display font-bold num outline-none focus-visible:underline", compact ? "text-[20px]" : "text-[22px]")} value={fmtKg(value)}
      onChange={e => { const v = parseFloat(e.target.value.replace(",", ".")); if (!isNaN(v)) onChange(Math.max(min, v)); else if (e.target.value === "") onChange(0); }} aria-label={label} />
    {unit && <span className="text-[11px] text-mute -ml-1 mr-1">{unit}</span>}
    <button className={cn("h-12 shrink-0 grid place-items-center text-mute active:text-ink", compact ? "w-9" : "w-11")} onClick={() => onChange(Math.round((value + s) * 100) / 100)} aria-label={`${label} meer`}><Plus size={16} /></button>
  </div>;
}

export function Sheet({ open, onClose, title, children, sub }: { open: boolean; onClose: () => void; title: string; sub?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null), y0 = useRef(-1); const [drag, setDragS] = useState(0); const dragR = useRef(0); const setDrag = (v: number) => { dragR.current = v; setDragS(v); };
  useEffect(() => { if (!open) return; const before = document.activeElement as HTMLElement | null;
    const q = () => [...(box.current?.querySelectorAll<HTMLElement>("button,input,select,textarea,summary,[tabindex]:not([tabindex='-1'])") || [])].filter(e => !(e as HTMLButtonElement).disabled);
    setTimeout(() => { const f = q(); (f[1] || f[0])?.focus(); }, 0);
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); return; }
      if (e.key === "Tab") { const f = q(); if (!f.length) return; const i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } else if (i < 0) { e.preventDefault(); f[0].focus(); } } };
    window.addEventListener("keydown", k, true); return () => { window.removeEventListener("keydown", k, true); before?.focus?.(); }; }, [open, onClose]);
  if (!open) return null;
  /* altijd bovenaan de pagina tekenen, ook als het venster vanuit een pagina of de training opent */
  return createPortal(<div ref={box} className="fixed inset-0 z-[60] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
    <div className="absolute inset-0 bg-black/45 anim-fade" onClick={onClose} />
    <div ref={panel} className="relative w-full max-w-[480px] max-h-[88%] overflow-y-auto bg-surface rounded-t-[22px] anim-sheet gutter pt-4 transition-transform" style={{ paddingBottom: "calc(20px + env(safe-area-inset-bottom, 0px))", transform: drag > 0 ? `translateY(${drag}px)` : undefined, transitionDuration: drag > 0 ? "0ms" : undefined }}
      onTouchStart={e => { if ((panel.current?.scrollTop || 0) <= 0) y0.current = e.touches[0].clientY; else y0.current = -1; }}
      onTouchMove={e => { if (y0.current < 0) return; const dy = e.touches[0].clientY - y0.current; setDrag(dy > 0 ? dy : 0); }}
      onTouchEnd={() => { if (dragR.current > 90) onClose(); setDrag(0); y0.current = -1; }}>
      <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
      <div className="flex items-start gap-3 mb-4"><div className="grow min-w-0"><h2 className="display text-[26px] font-bold leading-none uppercase">{title}</h2>{sub && <p className="text-mute text-[13px] mt-1.5">{sub}</p>}</div>
        <button onClick={onClose} className="h-11 w-11 grid place-items-center rounded-full bg-sunk" aria-label="Sluiten"><X size={18} /></button></div>
      {children}
    </div>
  </div>, document.body);
}

export function Card({ className, children, ...p }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cn("bg-surface rounded-[18px] p-4", className)}>{children}</div>;
}
export function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return <div className="flex p-1 rounded-[12px] bg-sunk" role="radiogroup" aria-label={label}>
    {options.map(([v, n]) => <button key={v} role="radio" aria-checked={value === v} onClick={() => onChange(v)} className={cn("flex-1 min-h-10 px-2 rounded-[10px] text-[13px] font-semibold transition", value === v ? "bg-ink text-bg" : "text-mute")}>{n}</button>)}
  </div>;
}

const PLATE_STYLE: Record<number, [string, number]> = { 25: ["var(--plate-25)", 44], 20: ["var(--plate-20)", 44], 15: ["var(--plate-15)", 38], 10: ["var(--plate-10)", 32], 5: ["var(--plate-5)", 26], 2.5: ["var(--plate-s)", 21], 1.25: ["var(--plate-s)", 17] };
/** schijven per kant op de stang, in wedstrijdkleuren */
export function PlateBar({ total, bar = 20 }: { total: number; bar?: number }) {
  const { out, rest } = platesPerSide(total, bar);
  if (total < bar) return <p className="text-[12px] text-mute">Lichter dan de lege stang ({bar} kg)</p>;
  return <div className="flex items-center gap-2" aria-label={`Per kant: ${out.length ? out.map(fmtKg).join(" + ") : "geen schijven"} kg`}>
    <div className="flex items-center h-11">
      <span className="h-[5px] w-6 rounded-l bg-[var(--plate-s)]" />
      <span className="h-4 w-1.5 rounded-sm bg-[var(--plate-s)]" />
      {out.map((p, i) => { const [c, h] = PLATE_STYLE[p]; return <span key={i} className="rounded-[2px] border border-black/10" style={{ background: c, height: h, width: p >= 10 ? 9 : 6, marginLeft: 1 }} />; })}
      <span className="h-[5px] w-3 rounded-r bg-[var(--plate-s)]" />
    </div>
    <span className="text-[12px] text-mute num">per kant {out.length ? out.map(fmtKg).join(" + ") : "niets"}{rest > 0 ? ` (+${fmtKg(rest)} past niet)` : ""}</span>
  </div>;
}

export function Ring({ value, size = 44, stroke = 5, color = "var(--accent)", children }: { value: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = Math.max(0, Math.min(1, value));
  return <span className="relative inline-grid place-items-center shrink-0" style={{ width: size, height: size }}>
    <svg width={size} height={size} className="-rotate-90" aria-hidden="true"><circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunk)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * v} ${c}`} /></svg>
    <span className="absolute inset-0 grid place-items-center">{children}</span></span>;
}
export const Field = ({ label, children }: { label: string; children: ReactNode }) => <label className="grid gap-1.5"><span className="label">{label}</span>{children}</label>;
export const inputCls = "h-12 w-full rounded-[12px] bg-sunk px-3.5 text-[16px] outline-none focus:ring-2 focus:ring-[var(--accent)]";

/** volledige pagina boven de tabs, met terugknop en terugvegen */
export function Page({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  useSwipeBack(onBack);
  const head = useRef<HTMLHeadingElement>(null); useEffect(() => { head.current?.focus(); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape" && !document.querySelector("[aria-modal=true]")) onBack(); }; window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k); }, [onBack]);
  return <div className="fixed inset-0 z-[35] bg-bg overflow-y-auto anim-page" role="region" aria-label={title}>
    <div className="max-w-[480px] mx-auto gutter" style={{ paddingBottom: "calc(110px + env(safe-area-inset-bottom, 0px))" }}>
      <header className="sticky z-10 bg-bg flex items-center gap-3 py-3" style={{ top: "env(safe-area-inset-top, 0px)" }}>
        <button onClick={onBack} className="h-11 w-11 grid place-items-center rounded-full bg-surface" aria-label="Terug"><ChevronLeft size={20} /></button>
        <h1 ref={head} tabIndex={-1} className="display text-[30px] font-bold uppercase leading-none outline-none">{title}</h1></header>
      <div className="grid gap-3.5 grid-1">{children}</div>
    </div></div>;
}

/** schakelaar zoals in iOS */
export function Toggle({ on, onChange, label, id }: { on: boolean; onChange: (v: boolean) => void; label: string; id: string }) {
  return <button id={id} role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
    className={cn("relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors", on ? "bg-accent" : "bg-line")}>
    <span className="absolute top-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.25)] transition-[left]" style={{ left: on ? 22 : 2 }} /></button>;
}
