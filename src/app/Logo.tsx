/** woordmerk: een stang met twee schijven */
export function Logo({ small }: { small?: boolean }) {
  return <span className="inline-flex items-center gap-2" aria-label="Gymmaat">
    <svg width={small ? 26 : 32} height={small ? 14 : 18} viewBox="0 0 32 18" aria-hidden="true">
      <rect x="0" y="8" width="32" height="2" rx="1" fill="var(--mute)" /><rect x="5" y="1" width="4" height="16" rx="1" fill="var(--plate-20)" /><rect x="10" y="4" width="3" height="10" rx="1" fill="var(--plate-25)" />
      <rect x="19" y="4" width="3" height="10" rx="1" fill="var(--plate-25)" /><rect x="23" y="1" width="4" height="16" rx="1" fill="var(--plate-20)" /></svg>
    <span className={`display font-extrabold uppercase tracking-[.06em] ${small ? "text-[18px]" : "text-[22px]"}`}>Gymmaat</span></span>;
}
