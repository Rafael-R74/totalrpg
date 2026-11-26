// Armas, acessórios, explosivos, itens operacionais/medicamentos e itens paranormais gerais
// do suplemento Sobrevivendo ao Horror v1.3 (Cap. 1, p. 37-45).
// Só metadados mecânicos: os textos completos vêm do Content Pack local (chave "compendium", mesmo id).
import type { CompendiumEntryData, OrdemItemKind } from './index';

const SAH = 'sobrevivendo-ao-horror';
const DESC = 'Consulte o suplemento Sobrevivendo ao Horror v1.3 para a descrição completa.';

function weapon(
  id: string,
  name: string,
  categoryLevel: number,
  slots: number,
  damageFormula: string,
  critRange: string,
  damageType: string,
  itemSubtype: 'weapon_melee' | 'weapon_ranged' | 'weapon_firearm',
  range?: string,
  ammoCapacity?: number
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
      damageFormula,
      critRange,
      element: damageType,
      ...(range ? { range } : {}),
      ...(ammoCapacity !== undefined ? { ammoCapacity } : {}),
      itemSubtype,
      isWeapon: true,
      sourceId: SAH,
    },
  };
}

function item(
  id: string,
  name: string,
  categoryLevel: number,
  slots: number,
  itemSubtype: OrdemItemKind,
  extra: Record<string, unknown> = {}
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
      itemSubtype,
      isWeapon: false,
      ...(itemSubtype === 'paranormal' ? { isParanormal: true } : {}),
      ...extra,
      sourceId: SAH,
    },
  };
}

/** 11 Novas Armas (Tabela 1.4, p. 38) */
export const SAH_WEAPON_ENTRIES: CompendiumEntryData[] = [
  // Armas Simples
  weapon(
    'sah-item-pregador-pneumatico',
    'Pregador Pneumático (Disparo Simples / Uma Mão)',
    0,
    1,
    '1d4',
    '20/x4',
    'Perfuração',
    'weapon_ranged',
    'Curto',
    300
  ),
  weapon(
    'sah-item-estilingue',
    'Estilingue (Disparo Simples / Duas Mãos)',
    0,
    1,
    '1d4',
    '20/x2',
    'Impacto',
    'weapon_ranged',
    'Curto'
  ),
  weapon(
    'sah-item-revolver-compacto',
    'Revólver Compacto (Arma de Fogo Simples / Leve)',
    1,
    1,
    '2d4',
    '19/x3',
    'Perfuração',
    'weapon_firearm',
    'Curto',
    5
  ),
  // Armas Táticas
  weapon(
    'sah-item-baioneta',
    'Baioneta (Tática / Leve)',
    0,
    1,
    '1d4',
    '19/x2',
    'Perfuração',
    'weapon_melee'
  ),
  weapon(
    'sah-item-faca-tatica',
    'Faca Tática (Tática / Leve / Ágil)',
    1,
    1,
    '1d6',
    '19/x2',
    'Corte',
    'weapon_melee',
    'Curto'
  ),
  weapon(
    'sah-item-gancho-carne',
    'Gancho de Carne (Tática / Leve)',
    0,
    1,
    '1d4',
    '20/x4',
    'Perfuração',
    'weapon_melee'
  ),
  weapon(
    'sah-item-bastao-policial',
    'Bastão Policial (Tática / Uma Mão / Ágil)',
    1,
    1,
    '1d6',
    '20/x2',
    'Impacto',
    'weapon_melee',
    'Curto'
  ),
  weapon(
    'sah-item-picareta',
    'Picareta (Tática / Uma Mão)',
    0,
    1,
    '1d6',
    '20/x4',
    'Perfuração',
    'weapon_melee'
  ),
  weapon(
    'sah-item-shuriken',
    'Shuriken (Tática de Arremesso)',
    1,
    0.5,
    '1d4',
    '20/x2',
    'Perfuração',
    'weapon_ranged',
    'Curto',
    10
  ),
  weapon(
    'sah-item-pistola-pesada',
    'Pistola Pesada (Arma de Fogo Tática / Uma Mão)',
    1,
    1,
    '2d8',
    '18/x2',
    'Balístico',
    'weapon_firearm',
    'Curto',
    10
  ),
  weapon(
    'sah-item-espingarda-cano-duplo',
    'Espingarda de Cano Duplo (Arma de Fogo Tática / Duas Mãos)',
    2,
    2,
    '4d6',
    '20/x3',
    'Balístico',
    'weapon_firearm',
    'Curto',
    2
  ),
];

/** 7 Acessórios + 5 Explosivos + 24 Operacionais/Medicamentos (Tabela 1.5, p. 40-44) */
export const SAH_GENERAL_ITEM_ENTRIES: CompendiumEntryData[] = [
  // Acessórios (7)
  item('sah-item-amuleto-sagrado', 'Amuleto Sagrado', 0, 1, 'accessory'),
  item('sah-item-celular', 'Celular', 0, 1, 'accessory'),
  item('sah-item-chave-fenda-universal', 'Chave de Fenda Universal', 0, 1, 'accessory'),
  item('sah-item-chaves', 'Chaves', 0, 1, 'accessory'),
  item('sah-item-documentos-falsos', 'Documentos Falsos', 1, 1, 'accessory'),
  item('sah-item-manual-operacional', 'Manual Operacional', 1, 1, 'accessory'),
  item('sah-item-notebook', 'Notebook', 0, 2, 'accessory'),

  // Explosivos (5)
  item('sah-item-dinamite', 'Dinamite', 1, 1, 'explosive', { damageFormula: '4d6+4d6' }),
  item('sah-item-explosivo-plastico', 'Explosivo Plástico', 1, 1, 'explosive', { damageFormula: '16d6' }),
  item('sah-item-galao-vermelho', 'Galão Vermelho', 0, 2, 'explosive', { damageFormula: '12d6' }),
  item('sah-item-granada-gas-sonifero', 'Granada de Gás Sonífero', 1, 1, 'explosive'),
  item('sah-item-granada-pem', 'Granada de PEM', 1, 1, 'explosive', { damageFormula: '6d6' }),

  // Itens Operacionais (16) + Medicamentos (8)
  item('sah-item-alarme-movimento', 'Alarme de Movimento', 0, 1, 'operational'),
  item('sah-item-alimento-energetico', 'Alimento Energético', 2, 1, 'operational'),
  item('sah-item-aplicador-medicamentos', 'Aplicador de Medicamentos', 1, 1, 'operational'),
  item('sah-item-bracadeira-reforcada', 'Braçadeira Reforçada', 1, 1, 'operational'),
  item('sah-item-cao-adestrado', 'Cão Adestrado', 1, 0, 'operational'),
  item('sah-item-coldre-saque-rapido', 'Coldre Saque Rápido', 1, 1, 'operational'),
  item('sah-item-equipamento-escuta', 'Equipamento de Escuta', 1, 1, 'operational'),
  item('sah-item-estrepes', 'Estrepes (Saco)', 0, 1, 'operational', { damageFormula: '1d4' }),
  item('sah-item-faixa-pregos', 'Faixa de Pregos', 1, 2, 'operational', { damageFormula: '1d4' }),
  item('sah-item-isqueiro', 'Isqueiro', 0, 0.5, 'operational'),
  item('sah-item-med-antibiotico', 'Antibiótico (Medicamento)', 1, 0.5, 'operational'),
  item('sah-item-med-antidoto', 'Antídoto (Medicamento)', 1, 0.5, 'operational'),
  item('sah-item-med-antiemetico', 'Antiemético (Medicamento)', 1, 0.5, 'operational'),
  item('sah-item-med-antihistaminico', 'Antihistamínico (Medicamento)', 1, 0.5, 'operational'),
  item('sah-item-med-anti-inflamatorio', 'Anti-inflamatório (Medicamento)', 1, 0.5, 'operational'),
  item('sah-item-med-antitermico', 'Antitérmico (Medicamento)', 1, 0.5, 'operational'),
  item('sah-item-med-broncodilatador', 'Broncodilatador (Medicamento)', 1, 0.5, 'operational'),
  item('sah-item-med-coagulante', 'Coagulante (Medicamento)', 1, 0.5, 'operational'),
  item('sah-item-oculos-visao-noturna', 'Óculos de Visão Noturna', 1, 1, 'operational'),
  item('sah-item-oculos-escuros', 'Óculos Escuros', 0, 1, 'operational'),
  item('sah-item-pa', 'Pá', 0, 2, 'operational'),
  item('sah-item-paraquedas', 'Paraquedas', 1, 2, 'operational'),
  item('sah-item-traje-mergulho', 'Traje de Mergulho', 1, 2, 'operational'),
  item('sah-item-traje-espacial', 'Traje Espacial', 2, 5, 'operational'),
];

/** 5 Itens Paranormais Gerais (Tabela 1.5, p. 40, 44-45 — Catalisadores e Ingrediente ficam em ordemCompendiumData.ts) */
export const SAH_PARANORMAL_ITEM_ENTRIES: CompendiumEntryData[] = [
  item('sah-item-para-ligacao-direta-infernal', 'Ligação Direta Infernal', 2, 1, 'paranormal'),
  item('sah-item-para-medidor-condicao-vertebral', 'Medidor de Condição Vertebral', 2, 1, 'paranormal'),
  item('sah-item-para-pe-de-morto', 'Pé de Morto', 2, 1, 'paranormal'),
  item('sah-item-para-pendrive-selado', 'Pen Drive Selado', 2, 0.5, 'paranormal'),
  item('sah-item-para-valete-salvacao', 'Valete da Salvação', 1, 0.5, 'paranormal'),
];

/** Chaves minúsculas para reconhecer itens paranormais gerais do SaH mesmo se renomeados */
export const SAH_PARANORMAL_ITEM_NAME_KEYS = [
  'ligação direta infernal',
  'ligacao direta infernal',
  'medidor de condição vertebral',
  'medidor de condicao vertebral',
  'pé de morto',
  'pe de morto',
  'pen drive selado',
  'pendrive selado',
  'valete da salvação',
  'valete da salvacao',
];
