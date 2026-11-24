import { ReactNode, useEffect, useId, useRef } from 'react';
import { Icon } from './Icon';

type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

const SIZE_CLASS: Record<DialogSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-3xl',
  xl: 'sm:max-w-5xl',
  full: 'sm:max-w-[min(96rem,calc(100vw-3rem))]',
};

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  /** Conteúdo à direita do título (selos, contadores) */
  headerAside?: ReactNode;
  size?: DialogSize;
  footer?: ReactNode;
  children: ReactNode;
  /** Classe extra no painel (ex.: borda de destaque) */
  panelClassName?: string;
  bodyClassName?: string;
  closeLabel?: string;
}

/**
 * Diálogo do sistema: folha inferior no celular, cartão central a partir de 640px.
 * Fecha com Esc e clique no fundo, move o foco para dentro e devolve ao sair.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  headerAside,
  size = 'md',
  footer,
  children,
  panelClassName = '',
  bodyClassName = '',
  closeLabel = 'Fechar',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() => panelRef.current?.focus());
    function onKey(ev: KeyboardEvent) {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        onCloseRef.current();
      }
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="trpg-dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`trpg-dialog relative ${SIZE_CLASS[size]} focus:outline-none ${panelClassName}`}
      >
        {(title || headerAside) && (
          <div className="flex items-start gap-3 px-5 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-zinc-800">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 id={titleId} className="text-xl sm:text-2xl leading-tight">
                  {title}
                </h2>
              )}
              {description && <p className="text-sm text-zinc-400 mt-1">{description}</p>}
            </div>
            {headerAside}
            <button type="button" onClick={onClose} className="trpg-icon-btn -mr-2 -mt-1" aria-label={closeLabel}>
              <Icon name="x" size={20} />
            </button>
          </div>
        )}
        {!title && !headerAside && (
          <button
            type="button"
            onClick={onClose}
            className="trpg-icon-btn absolute right-2 top-2 z-10"
            aria-label={closeLabel}
          >
            <Icon name="x" size={20} />
          </button>
        )}
        <div className={`flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5 ${bodyClassName}`}>{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 px-5 sm:px-6 py-3 border-t border-zinc-800 bg-zinc-950/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
