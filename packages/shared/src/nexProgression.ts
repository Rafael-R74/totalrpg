import type { RuleModifier } from './index';

/**
 * Progressão de NEX (Sobrevivendo ao Horror, p. 98-102): alterações por elemento em NEX 60/75/90%.
 * Regra opcional para todos; obrigatória para a trilha Monstruoso (com o elemento escolhido no 10%).
 * Os textos completos vêm do pacote local (chave "nexProgression"); aqui só resumos neutros.
 */
export type NexProgressionElement = 'Sangue' | 'Morte' | 'Conhecimento' | 'Energia';

export interface NexAlteration {
  nex: 60 | 75 | 90;
  /** Resumo curto do efeito mecânico (mostrado no painel) */
  summary: string;
  /** Ritual que passa a poder conjurar (custo -1 PE se já o conhecia) */
  grantsRitual?: string;
  /** Texto completo (preenchido pelo pacote local) */
  fullText?: string;
}

const PRE_SKILLS_EXCEPT_WILL = ['adestramento', 'artes', 'diplomacia', 'enganacao', 'intimidacao', 'intuicao', 'percepcao', 'religiao'];

export const ORDEM_NEX_ALTERATIONS: Record<NexProgressionElement, NexAlteration[]> = {
  Sangue: [
    { nex: 60, summary: '+1d20 em Sobrevivência; imune a calor e frio extremos; não pode escolher 10.' },
    { nex: 75, summary: 'Conjura Aprimorar Físico (só em si); -1d20 em Ciências, Medicina e Tecnologia.', grantsRitual: 'Aprimorar Físico' },
    { nex: 90, summary: 'Penalidade do 75% vira -2d20; conjura Forma Monstruosa (+2 PE remove as penalidades de Sangue durante o ritual).', grantsRitual: 'Forma Monstruosa' },
  ],
  Morte: [
    { nex: 60, summary: '+1d20 em Iniciativa e Reflexos; -1d20 em Diplomacia e Intuição.' },
    { nex: 75, summary: 'Conjura Velocidade Mortal; penalidade do 60% vira -2d20 e vale também para Enganação e Intimidação; não precisa dormir, comer ou beber.', grantsRitual: 'Velocidade Mortal' },
    { nex: 90, summary: 'Não pode ser surpreendido; age depois de ver as ações de quem tem Iniciativa menor; perde 3 PE na 1ª interação social com cada pessoa na cena.' },
  ],
  Conhecimento: [
    { nex: 60, summary: 'Vê auras (efeito básico permanente de Terceiro Olho); fica ofuscado permanentemente.', grantsRitual: 'Terceiro Olho' },
    { nex: 75, summary: 'Efeito básico permanente de Detecção de Ameaças; penalidades de ofuscado viram -2d20.', grantsRitual: 'Detecção de Ameaças' },
    { nex: 90, summary: 'Cego quando não está na escuridão (em vez de ofuscado); conjura Vidência sem superfície reflexiva.', grantsRitual: 'Vidência' },
  ],
  Energia: [
    { nex: 60, summary: 'Conjura Coincidência Forçada; no início de cada cena, role 1d6 na tabela de caos.', grantsRitual: 'Coincidência Forçada' },
    { nex: 75, summary: 'Conjura Tela de Ruído; os efeitos do caos ficam mais fortes.', grantsRitual: 'Tela de Ruído' },
    { nex: 90, summary: 'Conjura Salto Fantasma; não precisa falar para conjurar; digitando o ritual num dispositivo, DT +2.', grantsRitual: 'Salto Fantasma' },
  ],
};

/**
 * Alterações gerais (SaH p. 100), valem para qualquer elemento:
 * 25%: Ocultismo sem treino (+2 se treinado); -5 em Diplomacia, Enganação ou Intimidação (à escolha).
 * 35%: soma um atributo (exceto Presença) nos PE; -5 em Atletismo, Fortitude ou Reflexos (à escolha).
 * 50%: afinidade com um elemento na próxima vez que Transcender.
 */
export interface NexGeneralAlteration {
  nex: 25 | 35 | 50;
  summary: string;
  fullText?: string;
}

export const ORDEM_NEX_GENERAL_ALTERATIONS: NexGeneralAlteration[] = [
  { nex: 25, summary: 'Pode testar Ocultismo sem treino (se treinado, +2 em Ocultismo); -5 em uma perícia: Diplomacia, Enganação ou Intimidação.' },
  { nex: 35, summary: 'Soma um atributo à sua escolha (exceto Presença) no total de PE; -5 em uma perícia: Atletismo, Fortitude ou Reflexos.' },
  { nex: 50, summary: 'Na próxima vez que Transcender, ganha afinidade com um elemento (no Monstruoso, o elemento da trilha).' },
];

export const NEX_PROG_PEN25_OPTIONS = [
  { id: 'diplomacia', label: 'Diplomacia' },
  { id: 'enganacao', label: 'Enganação' },
  { id: 'intimidacao', label: 'Intimidação' },
];
export const NEX_PROG_PEN35_OPTIONS = [
  { id: 'atletismo', label: 'Atletismo' },
  { id: 'fortitude', label: 'Fortitude' },
  { id: 'reflexos', label: 'Reflexos' },
];
export const NEX_PROG_ATTR35_OPTIONS = [
  { id: 'agi', label: 'Agilidade' },
  { id: 'for', label: 'Força' },
  { id: 'int', label: 'Intelecto' },
  { id: 'vig', label: 'Vigor' },
];

/** Escolhas que ainda faltam para as alterações gerais até o NEX dado. */
export function getMissingNexGeneralChoices(
  nex: number,
  choices?: { pen25?: string; attr35?: string; pen35?: string }
): Array<'pen25' | 'attr35' | 'pen35'> {
  const missing: Array<'pen25' | 'attr35' | 'pen35'> = [];
  if (nex >= 25 && !choices?.pen25) missing.push('pen25');
  if (nex >= 35 && !choices?.attr35) missing.push('attr35');
  if (nex >= 35 && !choices?.pen35) missing.push('pen35');
  return missing;
}

/**
 * Modificadores das alterações gerais. `ocultismoTrained`: já treinado (o Monstruoso 10% treina Ocultismo).
 * `attrValues`: valores atuais dos atributos, para somar o escolhido aos PE.
 */
export function getNexGeneralModifiers(
  nex: number,
  choices: { pen25?: string; attr35?: string; pen35?: string } | undefined,
  ocultismoTrained: boolean,
  attrValues: Record<string, number>
): RuleModifier[] {
  const mods: RuleModifier[] = [];
  if (nex >= 25) {
    if (ocultismoTrained) mods.push({ id: 'nexprog-25-ocultismo', targetType: 'skill_bonus', targetKey: 'ocultismo', value: 2 });
    if (choices?.pen25) mods.push({ id: 'nexprog-25-pen', targetType: 'skill_bonus', targetKey: choices.pen25, value: -5 });
  }
  if (nex >= 35) {
    const v = choices?.attr35 ? Number(attrValues[choices.attr35] ?? 0) : 0;
    if (v) mods.push({ id: 'nexprog-35-pe', targetType: 'vital_max', targetKey: 'pe', value: v });
    if (choices?.pen35) mods.push({ id: 'nexprog-35-pen', targetType: 'skill_bonus', targetKey: choices.pen35, value: -5 });
  }
  return mods;
}

/** Texto de abertura da regra (preenchido pelo pacote local) */
export const ORDEM_NEX_ALTERATIONS_INTRO = { text: '' };

/** Grau de intensidade do caos de Energia: 1 (60%), 2 (75%), 3 (90%) */
function energyTier(nex: number): number {
  return nex >= 90 ? 3 : nex >= 75 ? 2 : 1;
}

/** Tabela de caos de Energia (1d6 no início de cada cena), já com a intensidade do NEX. */
export function getEnergyChaosEffect(roll: number, nex: number): { title: string; text: string; modifiers?: RuleModifier[] } {
  const t = energyTier(nex);
  switch (roll) {
    case 1:
      return {
        title: 'Ruído ensurdecedor',
        text: `-${t}d20 em testes de Presença e perícias de Presença (exceto Vontade) até o fim da cena.`,
        modifiers: PRE_SKILLS_EXCEPT_WILL.map((sk) => ({ id: `nexprog-caos-${sk}`, targetType: 'skill_dice' as const, targetKey: sk, value: -t })),
      };
    case 2:
      return { title: 'Alvo trocado', text: `${t}x na cena, o mestre pode disputar par ou ímpar ao você agir e, se vencer, troca o alvo da ação.` };
    case 3:
      return { title: 'Tique', text: `O mestre define um "tique". Ao descrever uma ação sem fazê-lo, você perde ${t} SAN.` };
    case 4:
      return { title: 'Surto de Energia', text: `Confuso por ${t} rodada${t > 1 ? 's' : ''} (não é efeito mental).` };
    case 5:
      return { title: 'Número marcado', text: `O mestre rola ${t}d20 e anota. Quando um d20 seu sair com um desses valores, você e todos em alcance curto sofrem 1d6 de dano de Energia.` };
    default:
      return { title: 'Sorte', text: 'Nenhum efeito colateral... por enquanto.' };
  }
}

/** Modificadores permanentes da progressão (perícias) para o elemento e NEX. */
export function getNexProgressionModifiers(element: string, nex: number): RuleModifier[] {
  const mods: RuleModifier[] = [];
  const add = (sk: string, v: number) => mods.push({ id: `nexprog-${sk}`, targetType: 'skill_dice', targetKey: sk, value: v });
  const el = element.toLowerCase();
  if (el === 'sangue') {
    if (nex >= 60) add('sobrevivencia', 1);
    if (nex >= 75) for (const sk of ['ciencias', 'medicina', 'tecnologia']) add(sk, nex >= 90 ? -2 : -1);
  } else if (el === 'morte') {
    if (nex >= 60) {
      add('iniciativa', 1);
      add('reflexos', 1);
      for (const sk of ['diplomacia', 'intuicao']) add(sk, nex >= 75 ? -2 : -1);
    }
    if (nex >= 75) for (const sk of ['enganacao', 'intimidacao']) add(sk, -2);
  } else if (el === 'conhecimento') {
    // Ofuscado (permanente): -1d20 em ataques e Percepção (-2d20 a partir de 75%). Em 90% fica cego fora da escuridão.
    if (nex >= 60 && nex < 90) {
      const v = nex >= 75 ? -2 : -1;
      add('percepcao', v);
      mods.push({ id: 'nexprog-ofuscado-atk', targetType: 'skill_dice', targetKey: 'attack_all', value: v });
    }
  }
  return mods;
}
