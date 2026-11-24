interface DieFace2DProps {
  sides: number;
  value: number | string;
  size?: number;
  tone?: 'base' | 'gold' | 'danger' | 'muted';
  className?: string;
}

/** Silhueta 2D do dado com o valor — usada no modo leve, em listas e no histórico. */
export function DieFace2D({ sides, value, size = 40, tone = 'base', className = '' }: DieFace2DProps) {
  const shape =
    sides === 4 || sides === 3
      ? 'M50 8 94 86H6Z'
      : sides === 6 || sides === 2
      ? 'M14 14h72v72H14Z'
      : sides === 8
      ? 'M50 4 94 50 50 96 6 50Z'
      : sides === 10 || sides === 100
      ? 'M50 4 94 44 50 96 6 44Z'
      : sides === 12
      ? 'M50 5 93 36 77 88H23L7 36Z'
      : 'M50 3 92 27v46L50 97 8 73V27Z';
  const stroke =
    tone === 'gold'
      ? 'var(--color-yellow-400)'
      : tone === 'danger'
      ? 'var(--color-red-400)'
      : tone === 'muted'
      ? 'var(--trpg-border-strong)'
      : 'var(--trpg-accent-muted)';
  const fill =
    tone === 'gold'
      ? 'color-mix(in oklab, var(--color-yellow-900) 80%, var(--trpg-bg))'
      : tone === 'danger'
      ? 'color-mix(in oklab, var(--color-red-900) 80%, var(--trpg-bg))'
      : 'var(--trpg-accent-deep)';
  const text = tone === 'gold' ? 'var(--color-yellow-200)' : tone === 'danger' ? 'var(--color-red-200)' : 'var(--trpg-ink)';
  const fontSize = String(value).length > 2 ? 26 : sides === 4 || sides === 8 ? 30 : 34;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} role="img" aria-label={`d${sides}: ${value}`}>
      <path d={shape} fill={fill} stroke={stroke} strokeWidth={4} strokeLinejoin="round" />
      {sides === 20 && <path d="M50 22 76 66H24Z" fill="none" stroke={stroke} strokeOpacity={0.35} strokeWidth={2} />}
      <text
        x="50"
        y={sides === 4 ? 64 : 52}
        textAnchor="middle"
        dominantBaseline="central"
        fill={text}
        style={{ font: `650 ${fontSize}px Archivo, system-ui, sans-serif`, fontStretch: '88%' }}
      >
        {value}
      </text>
    </svg>
  );
}
