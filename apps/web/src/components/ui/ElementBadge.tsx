import type { ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Elementos do Outro Lado (Ordem Paranormal) com cores fixas, iguais em todas as paletas:
 * Sangue vermelho, Morte preto, Conhecimento amarelo, Energia roxo, Medo branco.
 */
export type OrdemElementKey = 'sangue' | 'morte' | 'conhecimento' | 'energia' | 'medo';

const ALIASES: Record<string, OrdemElementKey> = {
  sangue: 'sangue',
  morte: 'morte',
  conhecimento: 'conhecimento',
  energia: 'energia',
  medo: 'medo',
};

/** Normaliza "Sangue", "sangue", "SANGUE (Afinidade)" etc. Retorna null para Realidade, Varia, vazio. */
export function elementKey(raw?: string | null): OrdemElementKey | null {
  if (!raw) return null;
  const k = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
  for (const name of Object.keys(ALIASES)) {
    if (k === name || k.startsWith(name)) return ALIASES[name];
  }
  return null;
}

/** Classes de selo (fundo + texto + borda) para um elemento; cai num selo neutro se não for elemento. */
export function elementClasses(raw?: string | null): string {
  const k = elementKey(raw);
  return k ? `trpg-el trpg-el-${k}` : 'trpg-el trpg-el-neutral';
}

/** Classes para botões de escolha de elemento (estado selecionado vs. não selecionado). */
export function elementChoiceClasses(raw: string, selected: boolean): string {
  const k = elementKey(raw);
  if (!k) return selected ? 'trpg-el-choice trpg-el-neutral is-selected' : 'trpg-el-choice';
  return `trpg-el-choice trpg-el-choice-${k}${selected ? ' is-selected' : ''}`;
}

interface ElementBadgeProps {
  element?: string | null;
  /** Texto exibido; padrão = nome do elemento */
  children?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  showIcon?: boolean;
}

export function ElementBadge({ element, children, size = 'sm', className = '', showIcon = true }: ElementBadgeProps) {
  // "Conhecimento / Energia / Morte / Sangue" → um selo por elemento
  const parts = !children && element ? element.split(/\s*[/,]\s*|\s+ou\s+/i).filter(Boolean) : [];
  if (parts.length > 1) {
    return (
      <span className={`inline-flex flex-wrap items-center gap-1 ${className}`}>
        {parts.map((p) => (
          <ElementBadge key={p} element={p} size={size} showIcon={showIcon} />
        ))}
      </span>
    );
  }
  const k = elementKey(element);
  return (
    <span className={`${elementClasses(element)} ${size === 'md' ? 'trpg-el-md' : ''} ${className}`}>
      {showIcon && k && <Icon name={k} size={size === 'md' ? 14 : 12} />}
      {children ?? element}
    </span>
  );
}
