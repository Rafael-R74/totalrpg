import { useState } from 'react';
import { CharacterAbility, ORDEM_SKILLS_METADATA, getOrdemPeLimit } from '@totalrpg/shared';
import { Icon } from '../ui/Icon';
import {
  SAH_BTN_ACTIVE,
  SAH_BTN_AMBER,
  SAH_BTN_NEUTRAL,
  SahPowerProps,
  attrValue,
  hasSceneEffect,
  matchSahPower,
  rollSkill,
  skillRollParts,
} from './sahPowerKit';

/**
 * Poderes paranormais do Sobrevivendo ao Horror (p. 47-48).
 * Automáticos em outro lugar (sem botão aqui):
 * - Espreitar da Besta: +5 em Furtividade pelo compêndio (+10 com Afinidade, na evolução de NEX);
 * - Instintos Sanguinários: visão no escuro e faro (descritivo).
 */
const PREFIX = 'sah-para-';
const CONTROLLED = [
  { slug: 'mort-antecipar-vitalidade', name: 'antecipar vitalidade' },
  { slug: 'mort-aura-pavor', name: 'aura de pavor' },
  { slug: 'conh-absorver-conhecimento', name: 'absorver conhecimento' },
  { slug: 'conh-apatia-herege', name: 'apatia herege' },
  { slug: 'ener-conexao-empatica', name: 'conexão empática' },
  { slug: 'ener-valer-se-caos', name: 'valer-se do caos' },
];

export function isSahParanormalControlled(ab: CharacterAbility): boolean {
  return matchSahPower(ab, PREFIX, CONTROLLED) !== null;
}

type Props = SahPowerProps;

export function SahParanormalPowerControls(props: Props) {
  switch (matchSahPower(props.ab, PREFIX, CONTROLLED)) {
    case 'mort-antecipar-vitalidade':
      return <AnteciparVitalidade {...props} />;
    case 'mort-aura-pavor':
      return <AuraDePavor {...props} />;
    case 'conh-absorver-conhecimento':
      return <AbsorverConhecimento {...props} />;
    case 'conh-apatia-herege':
      return <ApatiaHerege {...props} />;
    case 'ener-conexao-empatica':
      return <ConexaoEmpatica {...props} />;
    case 'ener-valer-se-caos':
      return <ValerSeDoCaos {...props} />;
    default:
      return null;
  }
}

const hasAffinity = (ab: CharacterAbility) => Boolean(ab.hasAffinityUpgrade || /\(afinidade\)/i.test(ab.name));

/** DT de habilidade de Ordem: 10 + limite de PE + atributo. */
function powerDt(p: Props, attr: 'pre' | 'int' | 'vig' | 'agi' | 'for'): number {
  return 10 + getOrdemPeLimit(p.sheet.nex, p.sheet.origin, p.abilities) + attrValue(p, attr);
}

// ---------------------------------------------------------------------------

/** Antecipar Vitalidade: cargas (máx. Vigor, +2 com Afinidade) dão +1d20; cada "dormir" consome cargas. */
function AnteciparVitalidade(p: Props) {
  const aff = hasAffinity(p.ab);
  const max = Math.max(0, attrValue(p, 'vig')) + (aff ? 2 : 0);
  const charges = Number(p.ab.trackedCount || 0);
  const perSleep = aff ? 2 : 1;
  const setCharges = (n: number) =>
    p.onUpdateAbilities(p.abilities.map((a) => (a.id === p.ab.id ? { ...a, trackedCount: n } : a)));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="trpg-badge" title="Cargas de antecipação acumuladas">
        Cargas {charges}/{max}
      </span>
      <button
        type="button"
        className={SAH_BTN_AMBER}
        disabled={charges >= max}
        title={charges >= max ? 'Limite de cargas atingido (Vigor)' : 'Some +1d20 ao teste que está fazendo'}
        onClick={() => {
          setCharges(charges + 1);
          p.onFeedback(`Antecipar Vitalidade: +1d20 neste teste (cargas ${charges + 1}/${max}).`);
        }}
      >
        <Icon name="d20" /> Antecipar (+1d20)
      </button>
      {charges > 0 && (
        <button
          type="button"
          className={SAH_BTN_NEUTRAL}
          title="Na ação de interlúdio dormir, em vez de recuperar PV você perde cargas"
          onClick={() => {
            const next = Math.max(0, charges - perSleep);
            setCharges(next);
            p.onFeedback(
              `Dormir: em vez de recuperar PV, você perdeu ${charges - next} carga(s) de antecipação (restam ${next}).`
            );
          }}
        >
          <Icon name="moon" /> Dormir (-{perSleep} carga{perSleep > 1 ? 's' : ''}, sem curar PV)
        </button>
      )}
    </div>
  );
}

/** Aura de Pavor: 2 PE e ação de movimento; alvo fica apavorado (Vontade reduz para abalado). */
function AuraDePavor(p: Props) {
  const aff = hasAffinity(p.ab);
  const dt = powerDt(p, 'pre') + (aff ? 5 : 0);
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Ação de movimento. Uma vez por dia por pessoa ou animal. Termina no fim da cena, se o alvo sair do alcance médio ou se usar em outro alvo."
      onClick={() => {
        if (!p.onSpendResource(2)) return;
        p.onFeedback(
          `Aura de Pavor (-2 PE): ${aff ? 'pessoas ou animais escolhidos' : 'uma pessoa ou animal'} em alcance médio ficam apavorados (Vontade DT ${dt} reduz para abalado).`
        );
      }}
    >
      <Icon name="skull" /> Apavorar{aff ? ' alvos' : ''} (-2 PE • Vontade DT {dt})
    </button>
  );
}

/** Absorver Conhecimento: 1 PE e ação completa para perguntar a uma fonte escrita empunhada. */
function AbsorverConhecimento(p: Props) {
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Empunhando uma fonte escrita. Se a resposta estiver nela, você a obtém. Com a ação de interlúdio ler, o dado de bônus sobe um passo."
      onClick={() => {
        if (!p.onSpendResource(1)) return;
        p.onFeedback('Absorver Conhecimento (-1 PE, ação completa): faça sua pergunta à fonte que está empunhando.');
      }}
    >
      <Icon name="book" /> Perguntar à fonte (-1 PE)
    </button>
  );
}

/** Apatia Herege: 2 PE para rolar novamente um teste contra condição de medo. */
function ApatiaHerege(p: Props) {
  const aff = hasAffinity(p.ab);
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title={
        aff
          ? 'Afinidade: pode usar depois de saber o resultado e fica com a melhor rolagem.'
          : 'Use antes de saber se passou. Vale a segunda rolagem, mesmo que menor.'
      }
      onClick={() => {
        if (!p.onSpendResource(2)) return;
        rollSkill(p, 'vontade', `Apatia Herege: Vontade novamente contra medo${aff ? ' (fique com a melhor)' : ''}`);
      }}
    >
      <Icon name="d20" /> Rolar de novo contra medo (-2 PE)
    </button>
  );
}

/** Conexão Empática: 2 PE e ação completa para conversar com um objeto elétrico ligado até o fim da cena. */
function ConexaoEmpatica(p: Props) {
  const aff = hasAffinity(p.ab);
  const effectId = 'sah-conexao-empatica';
  const active = hasSceneEffect(p, effectId);
  if (active) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={SAH_BTN_ACTIVE}>Conectado a um objeto</span>
        <button
          type="button"
          className={SAH_BTN_AMBER}
          onClick={() => rollSkill(p, 'diplomacia', `Conexão Empática: Diplomacia com o objeto${aff ? ' (+5)' : ''}`, { extraMod: aff ? 5 : 0 })}
        >
          <Icon name="d20" /> Persuadir (Diplomacia{aff ? ' +5' : ''})
        </button>
        <button
          type="button"
          className={SAH_BTN_NEUTRAL}
          onClick={() => {
            p.onUpdateSceneEffects?.((p.sheet.sceneEffects || []).filter((e) => e.id !== effectId));
            p.onFeedback('Conexão encerrada: o objeto lamenta e ficará hostil se você tentar de novo.');
          }}
        >
          Encerrar
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      className={SAH_BTN_AMBER}
      title="Ação completa tocando um objeto elétrico ligado. Atitude inicial indiferente; Vontade 1 a 3."
      onClick={() => {
        if (
          !p.onSpendResource(2, {
            id: effectId,
            name: 'Conexão Empática',
            source: 'Poder paranormal',
            description: `Conversando com um objeto elétrico enquanto o tocar.${aff ? ' +5 em testes de INT/PRE com ele.' : ''}`,
          })
        )
          return;
        p.onFeedback('Conexão Empática (-2 PE): você pode conversar com o objeto até o fim da cena ou até soltá-lo.');
      }}
    >
      <Icon name="zap" /> Conectar a objeto (-2 PE)
    </button>
  );
}

/** Valer-se do Caos: +1d20 no teste; perde 1d4 SAN se falhar ou se o d20 do caos for baixo. */
function ValerSeDoCaos(p: Props) {
  const aff = hasAffinity(p.ab);
  const threshold = aff ? 2 : 5;
  const [skill, setSkill] = useState('');
  const [last, setLast] = useState<{ chaos: number; lost: boolean } | null>(null);
  const loseSan = (why: string) => {
    const amount = Math.floor(Math.random() * 4) + 1;
    p.onLoseSanity?.(amount, `Valer-se do Caos (${why})`);
    p.onFeedback(`Valer-se do Caos: o caos cobrou ${amount} de Sanidade (${why}).`);
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        className="trpg-input text-xs!"
        style={{ height: '2rem', width: 'auto' }}
        value={skill}
        aria-label="Perícia do teste"
        onChange={(e) => setSkill(e.target.value)}
      >
        <option value="">Perícia do teste</option>
        {ORDEM_SKILLS_METADATA.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={SAH_BTN_AMBER}
        disabled={!skill}
        title={`O d20 do caos conta como mais um dado do teste. Perde 1d4 SAN se falhar ou se o d20 do caos for ${threshold} ou menos.`}
        onClick={() => {
          const chaos = Math.floor(Math.random() * 20) + 1;
          const name = ORDEM_SKILLS_METADATA.find((m) => m.id === skill)?.name || skill;
          const { dice, mod } = skillRollParts(p, skill);
          p.onRoll(`Valer-se do Caos: ${name} + d20 do caos (${chaos}) — use o maior`, dice, 20, mod);
          const lost = chaos <= threshold;
          setLast({ chaos, lost });
          if (lost) loseSan(`d20 do caos = ${chaos}`);
          else p.onFeedback(`d20 do caos = ${chaos}. Se o teste falhar, use "Falhei" para perder 1d4 SAN.`);
        }}
      >
        <Icon name="d20" /> Controlar o caos (+1d20)
      </button>
      {last && !last.lost && (
        <button
          type="button"
          className={SAH_BTN_NEUTRAL}
          onClick={() => {
            setLast({ ...last, lost: true });
            loseSan('teste falhou');
          }}
        >
          Falhei (-1d4 SAN)
        </button>
      )}
    </div>
  );
}
