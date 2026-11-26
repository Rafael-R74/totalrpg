import { useEffect, useState } from 'react';
import {
  CharacterAbility,
  OrdemRitualCastForm,
  SAH_MILAGRE_IONIZANTE_CONDITIONS,
  SAH_PRONUNCIAR_SIGILO_OPTIONS,
} from '@totalrpg/shared';
import { Dialog } from '../ui/Dialog';
import { Icon } from '../ui/Icon';

/**
 * Rituais do Sobrevivendo ao Horror que pedem uma escolha ou confirmação antes de conjurar:
 * - Pronunciar Sigilo: Esquecer, Cegar ou Inexistir;
 * - Milagre Ionizante: qual condição curar (e se o alvo é você);
 * - Martírio de Sangue: aviso de que o personagem se perde ao fim da cena.
 */
export const SAH_RITUALS_WITH_CAST_DIALOG = new Set([
  'sah-rit-pronunciar-sigilo',
  'sah-rit-milagre-ionizante',
  'sah-rit-martirio-sangue',
]);

export interface PendingSahCast {
  ritualId: string;
  ab: CharacterAbility;
  form: OrdemRitualCastForm;
}

export function SahRitualCastDialog({
  pending,
  ownConditions,
  onCancel,
  onConfirm,
}: {
  pending: PendingSahCast | null;
  /** Condições ativas do conjurador (para o Milagre Ionizante em si mesmo) */
  ownConditions: Array<{ id: string; name: string }>;
  onCancel: () => void;
  onConfirm: (choice: string, removeOwnConditionId?: string) => void;
}) {
  const [choice, setChoice] = useState('');
  const [onSelf, setOnSelf] = useState(false);
  useEffect(() => {
    setChoice('');
    setOnSelf(false);
  }, [pending?.ritualId, pending?.form.mode]);

  if (!pending) return null;
  const { ritualId, ab, form } = pending;
  const title = `${ab.name.replace(/\s*\(.*\)\s*$/, '')} — ${form.label}`;

  if (ritualId === 'sah-rit-martirio-sangue') {
    return (
      <Dialog
        open
        onClose={onCancel}
        size="sm"
        title={title}
        description="Este ritual não tem fim."
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="trpg-btn trpg-btn-secondary" onClick={onCancel}>
              Cancelar
            </button>
            <button
              type="button"
              className="trpg-btn trpg-btn-danger"
              onClick={() => onConfirm('confirmado')}
            >
              Conjurar mesmo assim
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-2 text-sm text-zinc-300">
          <p className="p-3 rounded-lg border border-red-700/70 bg-red-950/30 text-red-200">
            <Icon name="warning" /> Quando a cena terminar, o personagem se torna permanentemente uma criatura de Sangue e
            deixa de ser jogável.
          </p>
          <p>
            Até lá: +{form.mode === 'discente' ? 20 : 10} em ataque e dano corpo a corpo e na Defesa,{' '}
            {form.tempHpFlat} PV temporários, faro, visão no escuro, cura acelerada 10, ataques desarmados mais fortes e
            -3d20 em perícias sociais. Não pode mais conjurar rituais.
          </p>
        </div>
      </Dialog>
    );
  }

  const isSigilo = ritualId === 'sah-rit-pronunciar-sigilo';
  const options = isSigilo
    ? SAH_PRONUNCIAR_SIGILO_OPTIONS.map((o) => ({ id: o.id, label: o.label, summary: o.summary }))
    : SAH_MILAGRE_IONIZANTE_CONDITIONS.map((c) => ({ id: c, label: c, summary: '' }));
  const ownMatch = !isSigilo && choice
    ? ownConditions.find((c) => c.name.toLowerCase().startsWith(choice.toLowerCase()))
    : undefined;

  return (
    <Dialog
      open
      onClose={onCancel}
      size="md"
      title={title}
      description={isSigilo ? 'Escolha o efeito do sigilo.' : 'Escolha a condição a curar (ou cure uma doença ou veneno).'}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="trpg-btn trpg-btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="trpg-btn trpg-btn-primary"
            disabled={!choice}
            onClick={() => onConfirm(choice, onSelf && ownMatch ? ownMatch.id : undefined)}
          >
            Conjurar (-{form.totalCost} PE)
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="Escolha" className={`grid gap-1.5 ${isSigilo ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {[...options, ...(isSigilo ? [] : [{ id: 'Doença ou veneno', label: 'Doença ou veneno', summary: '' }])].map((o) => {
            const on = choice === o.id;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setChoice(o.id)}
                className={`text-left px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                  on ? 'bg-purple-700/40 border-purple-400 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-200 hover:border-zinc-500'
                }`}
              >
                <span className="font-semibold">{o.label}</span>
                {o.summary && <span className="block text-xs text-zinc-400 mt-0.5">{o.summary}</span>}
              </button>
            );
          })}
        </div>
        {!isSigilo && (
          <>
            <label className={`flex items-center gap-2 text-sm ${ownMatch ? 'text-zinc-200' : 'text-zinc-500'}`}>
              <input type="checkbox" disabled={!ownMatch} checked={onSelf && Boolean(ownMatch)} onChange={(e) => setOnSelf(e.target.checked)} />
              O alvo sou eu (remover {ownMatch ? ownMatch.name : 'a condição'} da minha ficha)
            </label>
            <p className="text-xs text-zinc-400">
              Não afeta efeitos de Energia nem condições permanentes. Depois, o alvo faz Fortitude DT 30 ou é incubado pelo
              infecticídio.
            </p>
          </>
        )}
      </div>
    </Dialog>
  );
}
