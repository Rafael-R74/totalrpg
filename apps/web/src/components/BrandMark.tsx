import { SystemId } from '@totalrpg/shared';

interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
  /** Esconde o nome em telas estreitas (só o d20 fica) */
  compactOnMobile?: boolean;
}

/** Marca: um d20 visto de frente (hexágono + face triangular) e o nome em serifa de display. */
export function D20Mark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M16 3.5 27 9.75v12.5L16 28.5 5 22.25V9.75Z"
        stroke="var(--trpg-accent)"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M16 8.5 22.75 20.25H9.25Z" stroke="var(--trpg-ink)" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M16 3.5v5M27 22.25l-4.25-2M5 22.25l4.25-2M9.25 20.25 5 9.75M22.75 20.25 27 9.75M16 28.5l-6.75-8.25M16 28.5l6.75-8.25"
        stroke="var(--trpg-ink)"
        strokeOpacity="0.4"
        strokeWidth="1.1"
      />
    </svg>
  );
}

export function BrandMark({
  size = 'md',
  showSubtitle = false,
  subtitle = 'Fichas, escudo do mestre e rolagens da mesa',
  compactOnMobile = false,
}: BrandMarkProps) {
  const mark = size === 'lg' ? 'w-9 h-9' : size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';
  const word = size === 'lg' ? 'text-[1.75rem]' : size === 'sm' ? 'text-lg' : 'text-[1.375rem]';

  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <D20Mark className={`${mark} shrink-0`} />
      <span className={`leading-none ${compactOnMobile ? 'hidden sm:block' : ''}`}>
        <span className={`${word} trpg-display block`} style={{ letterSpacing: '-0.01em' }}>
          TotalRPG
        </span>
        {showSubtitle && <span className="text-xs text-zinc-400 block mt-1">{subtitle}</span>}
      </span>
    </span>
  );
}

export const SYSTEM_META: Record<string, { label: string; shortLabel: string; color: string }> = {
  'ordem-paranormal': { label: 'Ordem Paranormal', shortLabel: 'Ordem', color: '#d9423f' },
  tormenta20: { label: 'Tormenta 20', shortLabel: 'T20', color: '#d19e3e' },
  duna: { label: 'Duna', shortLabel: 'Duna', color: '#d4893a' },
};

export function SystemSigilBadge({ system, compact = false }: { system: SystemId | string; compact?: boolean }) {
  const meta = SYSTEM_META[system] || SYSTEM_META.duna;
  return (
    <span className="trpg-badge">
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: meta.color }} aria-hidden="true" />
      <span>{compact ? meta.shortLabel : meta.label}</span>
    </span>
  );
}
