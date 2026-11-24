import { useEffect, useRef, useState } from 'react';

interface TempVitalBarProps {
  current: number;
  max?: number;
  barId: string;
  size?: 'xs' | 'sm' | 'md';
}

export function TempVitalBar({ current, max, barId, size = 'sm' }: TempVitalBarProps) {
  const safeCurrent = Math.max(0, Number(current || 0));
  const lastPeakMaxRef = useRef<number>(Math.max(safeCurrent, Number(max || 0)));
  const [isDrainingOut, setIsDrainingOut] = useState(false);

  if (safeCurrent > 0) {
    const candidateMax = Math.max(safeCurrent, Number(max || 0), lastPeakMaxRef.current);
    // Se começou um novo buff após ter zerado ou subiu além do pico anterior, atualiza o teto
    if (lastPeakMaxRef.current <= 0 || Number(max || 0) > 0) {
      lastPeakMaxRef.current = Math.max(safeCurrent, Number(max || 0));
    } else {
      lastPeakMaxRef.current = candidateMax;
    }
  }

  useEffect(() => {
    if (safeCurrent > 0) {
      setIsDrainingOut(false);
      return;
    }
    if (lastPeakMaxRef.current > 0) {
      setIsDrainingOut(true);
      const timer = setTimeout(() => {
        lastPeakMaxRef.current = 0;
        setIsDrainingOut(false);
      }, 320);
      return () => clearTimeout(timer);
    }
  }, [safeCurrent]);

  if (safeCurrent <= 0 && !isDrainingOut) {
    return null;
  }

  const effectiveMax = Math.max(1, safeCurrent, Number(max || 0), lastPeakMaxRef.current);
  const pct =
    safeCurrent <= 0
      ? 0
      : Math.max(0, Math.min(100, (safeCurrent / effectiveMax) * 100));

  const heightClass =
    size === 'md' ? 'h-5' : size === 'sm' ? 'h-4' : 'h-3.5';
  const textClass =
    size === 'md' ? 'text-[10px]' : size === 'sm' ? 'text-[9px]' : 'text-[8px]';
  const isPv = barId === 'pv';
  const borderClass = isPv ? 'border-cyan-500/70' : 'border-amber-500/70';
  const fillColor = isPv ? '#0891b2' : '#d97706';

  return (
    <div
      className={`w-full ${heightClass} bg-zinc-900 rounded-full overflow-hidden border ${borderClass} relative shadow-inner transition-opacity duration-300 ${
        safeCurrent <= 0 ? 'opacity-0' : 'opacity-100'
      }`}
      title="Quantia temporária (absorve dano/gasto antes da barra principal)"
    >
      <div
        className="h-full transition-all duration-300 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: fillColor,
        }}
      />
      <span
        className={`absolute inset-0 flex items-center justify-center ${textClass} font-mono font-extrabold uppercase tracking-wider text-white drop-shadow pointer-events-none`}
      >
        Temporário ({safeCurrent}/{effectiveMax})
      </span>
    </div>
  );
}
