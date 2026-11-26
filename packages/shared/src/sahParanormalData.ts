// Poderes paranormais (p. 47-48) e itens amaldiçoados (p. 58-62) do suplemento Sobrevivendo ao Horror v1.3.
// Só dados de jogo: o texto completo de cada entrada vem do Content Pack local (chave "compendium", mesmo id).
import type { CompendiumEntryData } from './index';

const SAH = 'sobrevivendo-ao-horror';
const DESC = 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.';

type Element = 'Sangue' | 'Morte' | 'Conhecimento' | 'Energia' | 'Medo';

function power(
  id: string,
  name: string,
  element: Element,
  cost: number,
  requirements: string,
  modifiers: CompendiumEntryData['modifiers'] = []
): CompendiumEntryData {
  return {
    id,
    system: 'ordem-paranormal',
    category: 'paranormal_power',
    name: `${name} (${element})`,
    description: DESC,
    cost,
    modifiers,
    metadata: { element, requirements, sourceId: SAH },
  };
}

function cursed(
  id: string,
  name: string,
  element: Element,
  categoryLevel: number,
  slots: number,
  weapon?: { damageFormula: string; critRange: string; range: string }
): CompendiumEntryData {
  return {
    id,
    system: 'ordem-paranormal',
    category: 'item',
    name,
    description: DESC,
    cost: categoryLevel,
    modifiers: [],
    metadata: {
      slots,
      categoryLevel,
      element,
      isParanormal: true,
      isCursedSpecial: true,
      itemSubtype: 'cursed_special',
      isWeapon: Boolean(weapon),
      ...(weapon || {}),
      sourceId: SAH,
    },
  };
}

export const SAH_PARANORMAL_POWER_ENTRIES: CompendiumEntryData[] = [
  // Sangue
  power('sah-para-sang-espreitar-besta', 'Espreitar da Besta', 'Sangue', 0, 'Transcender', [
    { id: 'm-sah-espreitar-fur', targetType: 'skill_bonus', targetKey: 'furtividade', value: 5 },
  ]),
  power('sah-para-sang-instintos-sanguinarios', 'Instintos Sanguinários', 'Sangue', 0, 'Transcender'),
  // Morte
  power('sah-para-mort-antecipar-vitalidade', 'Antecipar Vitalidade', 'Morte', 0, 'Transcender'),
  power('sah-para-mort-aura-pavor', 'Aura de Pavor', 'Morte', 2, 'Transcender'),
  // Conhecimento
  power('sah-para-conh-absorver-conhecimento', 'Absorver Conhecimento', 'Conhecimento', 1, 'Transcender'),
  power('sah-para-conh-apatia-herege', 'Apatia Herege', 'Conhecimento', 2, 'Conhecimento 1'),
  // Energia
  power('sah-para-ener-conexao-empatica', 'Conexão Empática', 'Energia', 2, 'Energia 1'),
  power('sah-para-ener-valer-se-caos', 'Valer-se do Caos', 'Energia', 0, 'Transcender'),
];

export const SAH_CURSED_ITEM_ENTRIES: CompendiumEntryData[] = [
  // Sangue
  cursed('sah-item-cursed-conector-membros', 'Conector de Membros', 'Sangue', 3, 1),
  cursed('sah-item-cursed-dose-praga', "Dose d'A Praga", 'Sangue', 3, 1),
  cursed('sah-item-cursed-mandibula-agonizante', 'Mandíbula Agonizante', 'Sangue', 2, 1),
  cursed('sah-item-cursed-retalho-tenebroso', 'Retalho Tenebroso', 'Sangue', 2, 1),
  // Morte
  cursed('sah-item-cursed-ampulheta-tempo-sofrido', 'Ampulheta do Tempo Sofrido', 'Morte', 2, 1),
  cursed('sah-item-cursed-injecao-lodo', 'Injeção de Lodo', 'Morte', 2, 0.5),
  cursed('sah-item-cursed-instantaneo-mortal', 'Instantâneo Mortal', 'Morte', 2, 0.5),
  cursed('sah-item-cursed-projetil-lodo-curto', 'Projétil de Lodo (Curto)', 'Morte', 1, 1),
  cursed('sah-item-cursed-projetil-lodo-longo', 'Projétil de Lodo (Longo)', 'Morte', 2, 1),
  cursed('sah-item-cursed-radio-chiador', 'Rádio Chiador', 'Morte', 2, 1),
  // Conhecimento
  cursed('sah-item-cursed-camera-obscura', 'Câmera Obscura', 'Conhecimento', 3, 1),
  cursed('sah-item-cursed-enxame-fantasmagorico', 'Enxame Fantasmagórico', 'Conhecimento', 3, 1),
  cursed('sah-item-cursed-repositorio-fracasso', 'Repositório do Fracasso', 'Conhecimento', 2, 1),
  cursed('sah-item-cursed-tabula-saber-custoso', 'Tábula do Saber Custoso', 'Conhecimento', 2, 1),
  // Energia
  cursed('sah-item-cursed-arreio-neural', 'Arreio Neural', 'Energia', 2, 1),
  cursed('sah-item-cursed-centrifugador-existencial', 'Centrifugador Existencial', 'Energia', 3, 1),
  cursed('sah-item-cursed-espelho-refletor', 'Espelho Refletor', 'Energia', 2, 1),
  // Fuzil de precisão com mira telescópica (+1 alcance) e mira laser (+2 margem), dano de Energia, sem munição
  cursed('sah-item-cursed-fuzil-alheio', 'Fuzil Alheio (Arma de Fogo Amaldiçoada)', 'Energia', 4, 2, {
    damageFormula: '2d10',
    critRange: '17/x3',
    range: 'Extremo',
  }),
  // Medo — lâmina de pedra primitiva (estatísticas de punhal)
  cursed('sah-item-cursed-primeira-adaga', 'A Primeira Adaga (Arma Amaldiçoada)', 'Medo', 3, 1, {
    damageFormula: '1d4',
    critRange: '20/x3',
    range: 'Corpo a corpo',
  }),
];

/** Nomes (minúsculos, sem acento opcional) usados para reconhecer os itens mesmo se renomeados à mão. */
export const SAH_CURSED_ITEM_NAME_KEYS = [
  'conector de membros',
  "dose d'a praga",
  'dose d’a praga',
  'mandíbula agonizante',
  'retalho tenebroso',
  'ampulheta do tempo sofrido',
  'injeção de lodo',
  'instantâneo mortal',
  'projétil de lodo',
  'rádio chiador',
  'câmera obscura',
  'enxame fantasmagórico',
  'repositório do fracasso',
  'tábula do saber custoso',
  'arreio neural',
  'centrifugador existencial',
  'espelho refletor',
  'fuzil alheio',
  'primeira adaga',
];
