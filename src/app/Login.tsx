import { useEffect, useRef, useState } from "react";
import { useApp, DEMO_EMAIL } from "@/lib/store";
import { Btn, Field, inputCls } from "./ui";
import { Logo } from "./Logo";

export function Login() {
  const { login } = useApp();
  const [step, setStep] = useState<"mail" | "code">("mail");
  const [email, setEmail] = useState(DEMO_EMAIL), [code, setCode] = useState(""), [wait, setWait] = useState(0), [err, setErr] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (!wait) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  const send = () => { if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) { setErr("Vul een geldig e-mailadres in."); return; } setErr(""); setStep("code"); setWait(60); setTimeout(() => codeRef.current?.focus(), 50); };
  const verify = (c = code) => { if (c.replace(/\D/g, "").length !== 6) { setErr("De code heeft 6 cijfers."); return; } login(email); };
  return <main className="min-h-full flex flex-col max-w-[480px] mx-auto gutter" style={{ paddingBlock: "28px" }}>
    <div className="flex items-center justify-between"><Logo /><span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-sunk text-mute">Voorbeeld</span></div>
    <div className="mt-12 mb-8">
      <p className="label mb-2">Trainen met z'n tweeën</p>
      <h1 className="display text-[44px] leading-[0.95] font-extrabold uppercase">Elke set telt.<br /><span className="text-accent">Samen</span> nog meer.</h1>
      <p className="text-mute mt-4 max-w-[34ch]">Je schema, je gewichten en je voortgang op één plek. Zie wanneer je maat traint en moedig elkaar aan.</p>
    </div>
    {step === "mail" ? <form className="grid gap-3" onSubmit={e => { e.preventDefault(); send(); }}>
      <Field label="E-mailadres"><input id="login-email" type="email" autoComplete="email" inputMode="email" className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="naam@voorbeeld.be" /></Field>
      {err && <p className="text-[13px] text-[var(--plate-25)]" role="alert">{err}</p>}
      <Btn size="lg" type="submit">Stuur inlogcode</Btn>
      <p className="text-[12px] text-mute">Geen wachtwoord nodig. Je krijgt een mail met een code van 6 cijfers. Nieuw e-mailadres? Dan maken we meteen een account.</p>
    </form> : <form className="grid gap-3" onSubmit={e => { e.preventDefault(); verify(); }}>
      <p className="text-[14px]">We stuurden een code naar <b>{email}</b>.</p>
      <Field label="Code uit de mail"><input id="login-code" ref={codeRef} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className={inputCls + " display text-[30px] tracking-[.4em] text-center font-bold"} value={code}
        onChange={e => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); if (v.length === 6) verify(v); }} placeholder="······" /></Field>
      {err && <p className="text-[13px] text-[var(--plate-25)]" role="alert">{err}</p>}
      <Btn size="lg" type="submit">Inloggen</Btn>
      <div className="flex justify-between text-[13px]"><button type="button" className="text-accent font-semibold" onClick={() => { setStep("mail"); setCode(""); }}>Ander e-mailadres</button>
        <button type="button" disabled={wait > 0} className="text-accent font-semibold disabled:text-mute" onClick={() => setWait(60)}>{wait ? `Opnieuw sturen (${wait})` : "Opnieuw sturen"}</button></div>
      <p className="text-[12px] text-mute rounded-[12px] bg-sunk p-3">In dit voorbeeld wordt geen mail verstuurd: elke code van 6 cijfers werkt. Met {DEMO_EMAIL} zie je het voorbeeldaccount, met een ander adres doorloop je de start als nieuwe gebruiker.</p>
    </form>}
    <p className="text-[11px] text-mute mt-auto pt-10">Je trainingen ziet alleen jij en je trainingsmaat. Je lichaamsgewicht ziet alleen jij.</p>
  </main>;
}
