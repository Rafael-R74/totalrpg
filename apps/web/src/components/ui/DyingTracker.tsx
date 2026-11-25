import { DYING_TURNS_TO_DIE } from '@totalrpg/shared';
import { Icon } from './Icon';

interface DyingTrackerProps {
  /** Turnos iniciados morrendo nesta cena (0–3) */
  turns: number;
  dead?: boolean;
  /** Mestre: clicar numa marca define o contador (corrigir um turno contado a mais ou a menos) */
  onSetTurns?: (turns: number) => void;
  className?: string;
}

/**
 * Três marcas que se preenchem a cada turno iniciado morrendo (Ordem, p. 311).
 * Escala com o font-size do contexto (em), então serve na ficha, no escudo e na TV.
 */
export function DyingTracker({ turns, dead = false, onSetTurns, className = '' }: DyingTrackerProps) {
  const filled = dead ? DYING_TURNS_TO_DIE : Math.max(0, Math.min(DYING_TURNS_TO_DIE, turns));
  const label = dead
    ? 'Morto'
    : `Morrendo: ${filled} de ${DYING_TURNS_TO_DIE} turnos`;

  return (
    <div
      className={`trpg-dying ${dead ? 'is-dead' : ''} ${filled === DYING_TURNS_TO_DIE - 1 && !dead ? 'is-last' : ''} ${className}`}
      role="group"
      aria-label={label}
    >
      <span className="trpg-dying-label">
        <Icon name="skull" /> {dead ? 'Morto' : 'Morrendo'}
      </span>
      <span className="trpg-dying-pips">
        {Array.from({ length: DYING_TURNS_TO_DIE }, (_, i) => {
          const isFilled = i < filled;
          const pip = <span key={i} className={`trpg-dying-pip ${isFilled ? 'is-filled' : ''}`} aria-hidden="true" />;
          if (!onSetTurns || dead) return pip;
          // Clicar na última marca preenchida a esvazia; nas outras, preenche até ela.
          const target = isFilled && i === filled - 1 ? i : i + 1;
          return (
            <button
              key={i}
              type="button"
              className={`trpg-dying-pip is-button ${isFilled ? 'is-filled' : ''}`}
              onClick={() => onSetTurns(target)}
              aria-label={`Definir ${target} de ${DYING_TURNS_TO_DIE} turnos morrendo`}
              title={`Definir ${target} de ${DYING_TURNS_TO_DIE}`}
            />
          );
        })}
      </span>
      {!dead && <span className="trpg-dying-count">{filled}/{DYING_TURNS_TO_DIE}</span>}
    </div>
  );
}
