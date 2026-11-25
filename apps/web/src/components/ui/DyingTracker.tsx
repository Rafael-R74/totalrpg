import { DYING_TURNS_TO_DIE } from '@totalrpg/shared';
import { Icon } from './Icon';

interface DyingTrackerProps {
  /** Turnos iniciados morrendo nesta cena (0–3) */
  turns: number;
  /** Turnos até a morte (3; 4 para Monstruoso de Morte 40%+) */
  max?: number;
  dead?: boolean;
  /** Mestre: clicar numa marca define o contador (corrigir um turno contado a mais ou a menos) */
  onSetTurns?: (turns: number) => void;
  className?: string;
}

/**
 * Três marcas que se preenchem a cada turno iniciado morrendo (Ordem, p. 311).
 * Escala com o font-size do contexto (em), então serve na ficha, no escudo e na TV.
 */
export function DyingTracker({ max = DYING_TURNS_TO_DIE, turns, dead = false, onSetTurns, className = '' }: DyingTrackerProps) {
  const filled = dead ? max : Math.max(0, Math.min(max, turns));
  const label = dead
    ? 'Morto'
    : `Morrendo: ${filled} de ${max} turnos`;

  return (
    <div
      className={`trpg-dying ${dead ? 'is-dead' : ''} ${filled === max - 1 && !dead ? 'is-last' : ''} ${className}`}
      role="group"
      aria-label={label}
    >
      <span className="trpg-dying-label">
        <Icon name="skull" /> {dead ? 'Morto' : 'Morrendo'}
      </span>
      <span className="trpg-dying-pips">
        {Array.from({ length: max }, (_, i) => {
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
              aria-label={`Definir ${target} de ${max} turnos morrendo`}
              title={`Definir ${target} de ${max}`}
            />
          );
        })}
      </span>
      {!dead && <span className="trpg-dying-count">{filled}/{max}</span>}
    </div>
  );
}
