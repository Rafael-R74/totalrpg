interface PortraitProps {
  name: string;
  url?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-14 h-14 text-base',
  lg: 'w-20 h-20 text-xl',
  xl: 'w-28 h-28 text-3xl',
};

/** Retrato do personagem; sem imagem, mostra as iniciais na serifa de display. */
export function Portrait({ name, url, size = 'md', className = '' }: PortraitProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${SIZES[size]} rounded-lg object-cover border border-zinc-700 bg-zinc-950 shrink-0 ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${SIZES[size]} rounded-lg bg-zinc-950 border border-zinc-800 grid place-items-center shrink-0 trpg-display text-zinc-300 ${className}`}
    >
      {initials || '?'}
    </span>
  );
}
