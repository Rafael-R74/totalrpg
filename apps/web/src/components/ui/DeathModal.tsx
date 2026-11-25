import { useEffect } from 'react';

interface DeathModalProps {
  name: string;
  portraitUrl?: string | null;
  /** Texto curto abaixo do nome */
  detail?: string;
  /** Na ficha: botão para fechar. Na TV: some sozinho depois de `autoCloseMs`. */
  onClose: () => void;
  autoCloseMs?: number;
  closeLabel?: string;
}

/** Aviso de morte (3º turno iniciado morrendo). Mesmo visual na ficha e na TV. */
export function DeathModal({ name, portraitUrl, detail, onClose, autoCloseMs, closeLabel = 'Fechar' }: DeathModalProps) {
  useEffect(() => {
    if (!autoCloseMs) return;
    const t = window.setTimeout(onClose, autoCloseMs);
    return () => window.clearTimeout(t);
  }, [autoCloseMs, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="trpg-death" role="alertdialog" aria-modal="true" aria-labelledby="trpg-death-name">
      <div className="trpg-death-inner">
        <div className="trpg-death-portrait">
          {portraitUrl ? <img src={portraitUrl} alt="" /> : <span>{initials}</span>}
        </div>
        <span className="trpg-death-line" aria-hidden="true" />
        <h2 id="trpg-death-name" className="trpg-death-name">
          {name}
        </h2>
        <p className="trpg-death-verdict">morreu</p>
        {detail && <p className="trpg-death-detail">{detail}</p>}
        {!autoCloseMs && (
          <button type="button" className="trpg-btn-secondary trpg-death-close" onClick={onClose} autoFocus>
            {closeLabel}
          </button>
        )}
      </div>
    </div>
  );
}
