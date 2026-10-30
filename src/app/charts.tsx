import { useMemo, useRef, useState } from "react";
import { fmtKg } from "@/lib/logic";

export interface Pt { x: string; y: number; label?: string }
function nice(min: number, max: number, n = 4) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}
const W = 340, H = 168, L = 36, R = 10, T = 12, B = 24;

/** één reeks over tijd, met hairline + tooltip; optioneel een doellijn */
export function LineChart({ pts, unit, color = "var(--chart-me)", goal, goalLabel, title }: { pts: Pt[]; unit: string; color?: string; goal?: number; goalLabel?: string; title: string }) {
  const [hi, setHi] = useState<number | null>(null); const ref = useRef<SVGSVGElement>(null);
  const sc = useMemo(() => { const ys = pts.map(p => p.y).concat(goal !== undefined ? [goal] : []); const n = nice(Math.min(...ys), Math.max(...ys));
    const X = (i: number) => L + (pts.length < 2 ? (W - L - R) / 2 : (i * (W - L - R)) / (pts.length - 1)), Y = (v: number) => T + (1 - (v - n.lo) / (n.hi - n.lo)) * (H - T - B); return { ...n, X, Y }; }, [pts, goal]);
  if (!pts.length) return <p className="text-mute text-[13px] py-8 text-center">Nog geen gegevens.</p>;
  const path = pts.map((p, i) => `${i ? "L" : "M"}${sc.X(i).toFixed(1)},${sc.Y(p.y).toFixed(1)}`).join("");
  const area = `${path}L${sc.X(pts.length - 1)},${H - B}L${sc.X(0)},${H - B}Z`;
  const move = (cx: number) => { const r = ref.current?.getBoundingClientRect(); if (!r) return; const x = ((cx - r.left) / r.width) * W; let b = 0, bd = 1e9; pts.forEach((_, i) => { const d = Math.abs(sc.X(i) - x); if (d < bd) { bd = d; b = i; } }); setHi(b); };
  const last = pts.length - 1, hp = hi !== null ? pts[hi] : null;
  const lbl = [0, Math.floor(last / 2), last].filter((v, i, a) => a.indexOf(v) === i);
  return <figure className="relative m-0" data-noswipe>
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-pan-y" role="img" aria-label={`${title}: van ${fmtKg(pts[0].y)} naar ${fmtKg(pts[last].y)} ${unit}`}
      onPointerMove={e => move(e.clientX)} onPointerDown={e => move(e.clientX)} onPointerLeave={() => setHi(null)} tabIndex={0}
      onKeyDown={e => { if (e.key === "ArrowRight") setHi(h => Math.min(last, (h ?? -1) + 1)); if (e.key === "ArrowLeft") setHi(h => Math.max(0, (h ?? last + 1) - 1)); }} onBlur={() => setHi(null)}>
      <defs><linearGradient id={`g-${title.length}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".16" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {sc.ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={sc.Y(t)} y2={sc.Y(t)} stroke="var(--grid)" strokeWidth="1" />
        <text x={L - 6} y={sc.Y(t) + 3.5} textAnchor="end" fontSize="11" fill="var(--mute)" className="num">{fmtKg(t)}</text></g>)}
      {lbl.map(i => <text key={i} x={sc.X(i)} y={H - 6} textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"} fontSize="11" fill="var(--mute)">{pts[i].x}</text>)}
      {goal !== undefined && <g><line x1={L} x2={W - R} y1={sc.Y(goal)} y2={sc.Y(goal)} stroke="var(--good)" strokeWidth="1.5" strokeDasharray="4 4" />
        <text x={W - R} y={sc.Y(goal) - 5} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--good)">{goalLabel}</text></g>}
      <path d={area} fill={`url(#g-${title.length})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={sc.X(last)} cy={sc.Y(pts[last].y)} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" />
      {hp && hi !== null && <g><line x1={sc.X(hi)} x2={sc.X(hi)} y1={T} y2={H - B} stroke="var(--mute)" strokeWidth="1" opacity=".5" />
        <circle cx={sc.X(hi)} cy={sc.Y(hp.y)} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" /></g>}
    </svg>
    {hp && hi !== null && <div className="absolute top-0 pointer-events-none rounded-[10px] bg-ink text-bg px-2.5 py-1.5 text-[12px] shadow-lg" style={{ left: `clamp(0px, calc(${(sc.X(hi) / W) * 100}% - 50px), calc(100% - 110px))` }}>
      <b className="num text-[14px]">{fmtKg(hp.y)} {unit}</b><div className="opacity-75">{hp.label || hp.x}</div></div>}
  </figure>;
}

/** twee reeksen per week (jij en je maat), gegroepeerde staven met legenda */
export function PairBars({ weeks, a, b, aName, bName }: { weeks: string[]; a: number[]; b: number[]; aName: string; bName: string }) {
  const [hi, setHi] = useState<number | null>(null);
  const max = Math.max(1, ...a, ...b), H2 = 120, bw = 9, gap = 2, slot = (W - L - R) / weeks.length, Y = (v: number) => 8 + (1 - v / max) * (H2 - 30);
  const ticks = Array.from({ length: max + 1 }, (_, i) => i).filter(t => max <= 4 || t % 2 === 0);
  return <figure className="m-0 relative" data-noswipe>
    <div className="flex gap-4 text-[12px] text-mute mb-2" aria-hidden="true"><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[2px] bg-[var(--chart-me)]" />{aName}</span><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-[2px] bg-[var(--chart-mate)]" />{bName}</span></div>
    <svg viewBox={`0 0 ${W} ${H2}`} className="w-full h-auto" role="img" aria-label={`Trainingen per week, ${aName} en ${bName}`} onPointerLeave={() => setHi(null)}>
      {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="var(--grid)" /><text x={L - 6} y={Y(t) + 3.5} textAnchor="end" fontSize="11" fill="var(--mute)">{t}</text></g>)}
      {weeks.map((w, i) => { const cx = L + slot * i + slot / 2;
        const bar = (v: number, x: number, c: string) => v > 0 ? <path d={`M${x},${Y(0)}V${Y(v) + 3}q0,-3 3,-3h${bw - 6}q3,0 3,3V${Y(0)}Z`} fill={c} /> : null;
        return <g key={w} onPointerEnter={() => setHi(i)} onPointerDown={() => setHi(i)} tabIndex={0} onFocus={() => setHi(i)} onBlur={() => setHi(null)} aria-label={`${w}: ${aName} ${a[i]}, ${bName} ${b[i]}`}>
          <rect x={cx - slot / 2} y={0} width={slot} height={H2} fill={hi === i ? "var(--sunk)" : "transparent"} />
          {bar(a[i], cx - bw - gap / 2, "var(--chart-me)")}{bar(b[i], cx + gap / 2, "var(--chart-mate)")}
          <text x={cx} y={H2 - 6} textAnchor="middle" fontSize="11" fill="var(--mute)">{w}</text></g>; })}
    </svg>
    {hi !== null && <div className="absolute right-0 top-0 pointer-events-none rounded-[10px] bg-ink text-bg px-2.5 py-1.5 text-[12px] shadow-lg"><div className="opacity-75">{weeks[hi]}</div>
      <div className="flex items-center gap-1.5"><i className="w-3 h-0.5 bg-[var(--chart-me)]" /><b>{a[hi]}</b> {aName}</div><div className="flex items-center gap-1.5"><i className="w-3 h-0.5 bg-[var(--chart-mate)]" /><b>{b[hi]}</b> {bName}</div></div>}
  </figure>;
}
