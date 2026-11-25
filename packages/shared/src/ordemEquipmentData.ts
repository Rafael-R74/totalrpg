import {
  CharacterAbility,
  CompendiumEntryData,
  OrdemAttributes,
  OrdemElement,
  OrdemItemKind,
  OrdemSheetData,
  RPGItem,
  RuleModifier,
} from './index';

// ============================================================================
// 1. REGRAS DE ELEMENTOS E OPRESSÃO (Livro v1.3, p. 116, 127, 144-145)
// ============================================================================
// Sangue oprime Conhecimento; Conhecimento oprime Energia;
// Energia oprime Morte; Morte oprime Sangue.
const ELEMENT_OPPRESSES: Record<Exclude<OrdemElement, 'Medo'>, Exclude<OrdemElement, 'Medo'>> = {
  Sangue: 'Conhecimento',
  Conhecimento: 'Energia',
  Energia: 'Morte',
  Morte: 'Sangue',
};

export function areOrdemElementsOpposing(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const norm = (s: string): Exclude<OrdemElement, 'Medo'> | null => {
    const l = s.trim().toLowerCase();
    if (l.includes('sangue')) return 'Sangue';
    if (l.includes('morte')) return 'Morte';
    if (l.includes('conhecimento')) return 'Conhecimento';
    if (l.includes('energia')) return 'Energia';
    return null;
  };
  const ea = norm(a);
  const eb = norm(b);
  if (!ea || !eb || ea === eb) return false;
  return ELEMENT_OPPRESSES[ea] === eb || ELEMENT_OPPRESSES[eb] === ea;
}

export const ORDEM_ELEMENTS_FOUR: Exclude<OrdemElement, 'Medo'>[] = [
  'Sangue',
  'Morte',
  'Conhecimento',
  'Energia',
];

export const ORDEM_ACCESSORY_ELIGIBLE_SKILLS: Array<{ id: string; name: string }> = [
  { id: 'acrobacia', name: 'Acrobacia' },
  { id: 'adestramento', name: 'Adestramento' },
  { id: 'artes', name: 'Artes' },
  { id: 'atletismo', name: 'Atletismo' },
  { id: 'atualidades', name: 'Atualidades' },
  { id: 'ciencias', name: 'Ciências' },
  { id: 'crime', name: 'Crime' },
  { id: 'diplomacia', name: 'Diplomacia' },
  { id: 'enganacao', name: 'Enganação' },
  { id: 'fortitude', name: 'Fortitude' },
  { id: 'furtividade', name: 'Furtividade' },
  { id: 'iniciativa', name: 'Iniciativa' },
  { id: 'intimidacao', name: 'Intimidação' },
  { id: 'intuicao', name: 'Intuição' },
  { id: 'investigacao', name: 'Investigação' },
  { id: 'medicina', name: 'Medicina' },
  { id: 'ocultismo', name: 'Ocultismo' },
  { id: 'percepcao', name: 'Percepção' },
  { id: 'pilotagem', name: 'Pilotagem' },
  { id: 'profissao', name: 'Profissão' },
  { id: 'reflexos', name: 'Reflexos' },
  { id: 'religiao', name: 'Religião' },
  { id: 'sobrevivencia', name: 'Sobrevivência' },
  { id: 'tatica', name: 'Tática' },
  { id: 'tecnologia', name: 'Tecnologia' },
  { id: 'vontade', name: 'Vontade' },
];

export const ORDEM_KIT_REQUIRED_SKILLS: Array<{
  skillId: string;
  skillName: string;
  kitKeywords: string[];
}> = [
  { skillId: 'medicina', skillName: 'Medicina', kitKeywords: ['kit de medicina'] },
  { skillId: 'crime', skillName: 'Crime', kitKeywords: ['kit de crime', 'gazua'] },
  { skillId: 'tecnologia', skillName: 'Tecnologia', kitKeywords: ['kit de tecnologia'] },
];

// ============================================================================
// 2. CATÁLOGO OFICIAL DE MODIFICAÇÕES (Livro v1.3, Cap. 3, p. 60-64)
// ============================================================================
export interface OrdemEquipmentModificationDef {
  id: string;
  name: string;
  group: 'weapon_melee_ranged' | 'weapon_firearm' | 'ammo' | 'protection' | 'accessory';
  targetKinds: OrdemItemKind[];
  description: string;
  shortEffect: string;
  categoryIncrease: number; // Sempre +1 (+I)
  slotsDelta?: number;
  attackBonus?: number;
  damageBonus?: number;
  critThreatBonus?: number;
  critMultiplierBonus?: number;
  extraDamageDiceCount?: number; // Ex.: Calibre Grosso (+1 dado do mesmo tipo)
  extraDamageFormula?: { count: number; sides: number; label: string }; // Ex.: Explosiva (+2d6)
  defenseBonus?: number;
  rdPhysicalOverride?: number; // Blindada: RD física sobe de 2 para 5
  crimeHideBonus?: number;
  requiresAutomatic?: boolean; // Compensador
  makesAutomatic?: boolean;    // Ferrolho Automático
  onlyHeavyProtection?: boolean;
  onlyLightProtection?: boolean;
  onlyBulletsAmmo?: boolean;   // Dum Dum / Explosiva: apenas balas curtas e longas
  incompatibleWith?: string[];
}

export const ORDEM_EQUIPMENT_MODIFICATIONS: OrdemEquipmentModificationDef[] = [
  // --- Armas Corpo a Corpo e de Disparo (Tabela 3.5, p. 61) ---
  {
    id: 'mod-certeira',
    name: 'Certeira',
    group: 'weapon_melee_ranged',
    targetKinds: ['weapon_melee', 'weapon_ranged'],
    shortEffect: '+2 ataque',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    attackBonus: 2,
  },
  {
    id: 'mod-cruel',
    name: 'Cruel',
    group: 'weapon_melee_ranged',
    targetKinds: ['weapon_melee', 'weapon_ranged'],
    shortEffect: '+2 dano',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    damageBonus: 2,
  },
  {
    id: 'mod-perigosa',
    name: 'Perigosa',
    group: 'weapon_melee_ranged',
    targetKinds: ['weapon_melee', 'weapon_ranged'],
    shortEffect: '+2 margem de ameaça',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    critThreatBonus: 2,
  },
  {
    id: 'mod-discreta-arma',
    name: 'Discreta',
    group: 'weapon_melee_ranged',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: '-1 espaço, +5 Crime p/ ocultar',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    slotsDelta: -1,
    crimeHideBonus: 5,
  },
  {
    id: 'mod-tatica',
    name: 'Tática',
    group: 'weapon_melee_ranged',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: 'Saque como ação livre',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
  },

  // --- Armas de Fogo (Tabela 3.5, p. 61) ---
  {
    id: 'mod-alongada',
    name: 'Alongada',
    group: 'weapon_firearm',
    targetKinds: ['weapon_firearm'],
    shortEffect: '+2 ataque',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    attackBonus: 2,
  },
  {
    id: 'mod-calibre-grosso',
    name: 'Calibre Grosso',
    group: 'weapon_firearm',
    targetKinds: ['weapon_firearm'],
    shortEffect: '+1 dado de dano',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    extraDamageDiceCount: 1,
  },
  {
    id: 'mod-compensador',
    name: 'Compensador',
    group: 'weapon_firearm',
    targetKinds: ['weapon_firearm'],
    shortEffect: 'Anula -1d20 de rajadas',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    requiresAutomatic: true,
  },
  {
    id: 'mod-ferrolho-automatico',
    name: 'Ferrolho Automático',
    group: 'weapon_firearm',
    targetKinds: ['weapon_firearm'],
    shortEffect: 'Torna arma automática (Rajada)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    makesAutomatic: true,
  },
  {
    id: 'mod-mira-laser',
    name: 'Mira Laser',
    group: 'weapon_firearm',
    targetKinds: ['weapon_firearm'],
    shortEffect: '+2 margem de ameaça',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    critThreatBonus: 2,
  },
  {
    id: 'mod-mira-telescopica',
    name: 'Mira Telescópica',
    group: 'weapon_firearm',
    targetKinds: ['weapon_firearm'],
    shortEffect: '+1 alcance • Ataque Furtivo qualquer alcance',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
  },
  {
    id: 'mod-silenciador',
    name: 'Silenciador',
    group: 'weapon_firearm',
    targetKinds: ['weapon_firearm'],
    shortEffect: '-2d20 penalidade Furtividade ao atirar',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
  },
  {
    id: 'mod-visao-calor',
    name: 'Visão de Calor',
    group: 'weapon_firearm',
    targetKinds: ['weapon_firearm'],
    shortEffect: 'Ignora camuflagem',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
  },

  // --- Munições (Tabela 3.5, p. 61 — Balas Curtas e Longas) ---
  {
    id: 'mod-dum-dum',
    name: 'Dum Dum',
    group: 'ammo',
    targetKinds: ['ammo'],
    shortEffect: '+1x multiplicador de crítico',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    critMultiplierBonus: 1,
    onlyBulletsAmmo: true,
  },
  {
    id: 'mod-explosiva',
    name: 'Explosiva',
    group: 'ammo',
    targetKinds: ['ammo'],
    shortEffect: '+2d6 de dano',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    extraDamageFormula: { count: 2, sides: 6, label: 'Munição Explosiva' },
    onlyBulletsAmmo: true,
  },

  // --- Proteções (Tabela 3.7, p. 62) ---
  {
    id: 'mod-antibombas',
    name: 'Antibombas',
    group: 'protection',
    targetKinds: ['protection_heavy'],
    shortEffect: '+5 resistências contra efeitos de área',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    onlyHeavyProtection: true,
  },
  {
    id: 'mod-blindada',
    name: 'Blindada',
    group: 'protection',
    targetKinds: ['protection_heavy'],
    shortEffect: 'RD física 2 → 5, +1 espaço',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    slotsDelta: 1,
    rdPhysicalOverride: 5,
    onlyHeavyProtection: true,
  },
  {
    id: 'mod-discreta-prot',
    name: 'Discreta',
    group: 'protection',
    targetKinds: ['protection_light'],
    shortEffect: '-1 espaço, +5 Crime p/ ocultar',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    slotsDelta: -1,
    crimeHideBonus: 5,
    onlyLightProtection: true,
    incompatibleWith: ['mod-reforcada'],
  },
  {
    id: 'mod-reforcada',
    name: 'Reforçada',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: '+2 Defesa, +1 espaço',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    slotsDelta: 1,
    defenseBonus: 2,
    incompatibleWith: ['mod-discreta-prot'],
  },

  // --- Acessórios (Tabela 3.9, p. 64) ---
  {
    id: 'mod-aprimorado',
    name: 'Aprimorado',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: 'Bônus na perícia principal: +2 → +5',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
  },
  {
    id: 'mod-funcao-adicional',
    name: 'Função Adicional',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+2 em uma 2ª perícia',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
  },
  {
    id: 'mod-aprimorado-extra',
    name: 'Aprimorado (2ª Função)',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: 'Bônus da Função Adicional: +2 → +5',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
  },
  {
    id: 'mod-discreto-acess',
    name: 'Discreto',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '-1 espaço, +5 Crime p/ ocultar',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
    slotsDelta: -1,
    crimeHideBonus: 5,
  },
  {
    id: 'mod-instrumental',
    name: 'Instrumental',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: 'Funciona como Kit de Perícia',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    categoryIncrease: 1,
  },
];

// ============================================================================
// 3. CATÁLOGO OFICIAL DE MALDIÇÕES (Livro v1.3, Cap. 6, p. 145-147)
// ============================================================================
export interface OrdemEquipmentCurseDef {
  id: string;
  name: string;
  element: OrdemElement | 'Varia';
  group: 'weapon' | 'protection' | 'accessory';
  targetKinds: OrdemItemKind[];
  shortEffect: string;
  description: string;
  requiresChoice?: 'element' | 'ritual';
  onlyMeleeWeapon?: boolean;
  // Efeitos passivos de arma
  extraDamageDice?: { count: number; sides: number; label: string; multipliesOnCrit?: boolean };
  doublesCritThreat?: boolean; // Predadora
  weaponDefenseBonus?: number; // Repulsora (+2 Def)
  sanguinariaCritTempHp?: boolean;
  // Efeitos passivos de proteção / acessório
  defenseBonus?: number;
  rdEntries?: Array<{ type: string; value: number; heavyValue?: number }>;
  attributeBonus?: keyof OrdemAttributes;
  vitalBonus?: { key: 'pv' | 'pe'; value: number };
  skillBonus?: { skillId: string; value: number };
  displacementBonus?: number;
  ritualDtBonus?: number;
  ignoresLoadPenaltyOnSkill?: string; // Sombria (Furtividade)
  // Custo de uso ativo (quando houver botão)
  activePeCost?: number;
}

export const ORDEM_EQUIPMENT_CURSES: OrdemEquipmentCurseDef[] = [
  // ===================== MALDIÇÕES PARA ARMAS (p. 145-146) =====================
  {
    id: 'curse-arma-antielemento',
    name: 'Antielemento',
    element: 'Conhecimento',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: '-2 PE: +4d8 contra elemento escolhido',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    requiresChoice: 'element',
    activePeCost: 2,
  },
  {
    id: 'curse-arma-ritualistica',
    name: 'Ritualística',
    element: 'Conhecimento',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: 'Armazena ritual e descarrega no acerto',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    requiresChoice: 'ritual',
  },
  {
    id: 'curse-arma-senciente',
    name: 'Senciente',
    element: 'Conhecimento',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: '-2 PE (mov.): flutua e ataca sozinha (1 PE/turno)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    activePeCost: 2,
  },
  {
    id: 'curse-arma-empuxo',
    name: 'Empuxo',
    element: 'Energia',
    group: 'weapon',
    targetKinds: ['weapon_melee'],
    shortEffect: 'Arremesso curto (+1 dado) e retorna à mão',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    onlyMeleeWeapon: true,
  },
  {
    id: 'curse-arma-energetica',
    name: 'Energética',
    element: 'Energia',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: '-2 PE: +5 ataque, ignora RD, dano Energia',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    activePeCost: 2,
  },
  {
    id: 'curse-arma-vibrante',
    name: 'Vibrante',
    element: 'Energia',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: 'Concede Ataque Extra (-2 PE, ou -1 PE se já possui)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    activePeCost: 2,
  },
  {
    id: 'curse-arma-consumidora',
    name: 'Consumidora',
    element: 'Morte',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: 'Deixa alvo lento • -2 PE: imóvel 1 rod.',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    activePeCost: 2,
  },
  {
    id: 'curse-arma-erosiva',
    name: 'Erosiva',
    element: 'Morte',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: '+1d8 Morte • -2 PE: +2d4 Morte por 2 rodadas',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    extraDamageDice: { count: 1, sides: 8, label: 'Erosiva (Morte)', multipliesOnCrit: false },
    activePeCost: 2,
  },
  {
    id: 'curse-arma-repulsora',
    name: 'Repulsora',
    element: 'Morte',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: '+2 Defesa empunhada • Bloqueio -2 PE: +5 Def',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    weaponDefenseBonus: 2,
    activePeCost: 2,
  },
  {
    id: 'curse-arma-lancinante',
    name: 'Lancinante',
    element: 'Sangue',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: '+1d8 Sangue (multiplica no crítico!)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    extraDamageDice: { count: 1, sides: 8, label: 'Lancinante (Sangue)', multipliesOnCrit: true },
  },
  {
    id: 'curse-arma-predadora',
    name: 'Predadora',
    element: 'Sangue',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: 'Dobra margem de ameaça • +1 alcance • anula camuflagem/cobertura leve',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    doublesCritThreat: true,
  },
  {
    id: 'curse-arma-sanguinaria',
    name: 'Sanguinária',
    element: 'Sangue',
    group: 'weapon',
    targetKinds: ['weapon_melee', 'weapon_ranged', 'weapon_firearm'],
    shortEffect: 'Sangramento cumulativo • Crítico: alvo fraco + 2d10 PV temp',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    sanguinariaCritTempHp: true,
  },

  // ===================== MALDIÇÕES PARA PROTEÇÕES (p. 146-147) =====================
  {
    id: 'curse-prot-abascanta',
    name: 'Abascanta',
    element: 'Conhecimento',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: '+5 resistência vs rituais • 1x/cena refletir ritual',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
  },
  {
    id: 'curse-prot-profetica',
    name: 'Profética',
    element: 'Conhecimento',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: 'RD Conhecimento 10 • -2 PE: rerrolar resistência',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    rdEntries: [{ type: 'Conhecimento', value: 10 }],
    activePeCost: 2,
  },
  {
    id: 'curse-prot-sombria',
    name: 'Sombria',
    element: 'Conhecimento',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: '+5 Furtividade, ignora penalidade de carga • -1 PE disfarça roupa',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skillBonus: { skillId: 'furtividade', value: 5 },
    ignoresLoadPenaltyOnSkill: 'furtividade',
    activePeCost: 1,
  },
  {
    id: 'curse-prot-cinetica',
    name: 'Cinética',
    element: 'Energia',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: '+2 Defesa • RD 2 (leve/escudo) ou RD 5 (pesada)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    defenseBonus: 2,
    rdEntries: [{ type: 'Geral (Cinética)', value: 2, heavyValue: 5 }],
  },
  {
    id: 'curse-prot-lepida',
    name: 'Lépida',
    element: 'Energia',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: '+10 Atletismo, +3m Desloc. • -2 PE: escalada/ignora terreno difícil',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    skillBonus: { skillId: 'atletismo', value: 10 },
    displacementBonus: 3,
    activePeCost: 2,
  },
  {
    id: 'curse-prot-voltaica',
    name: 'Voltaica',
    element: 'Energia',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: 'RD Energia 10 • -2 PE: 2d6 Energia adjacentes/turno',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    rdEntries: [{ type: 'Energia', value: 10 }],
    activePeCost: 2,
  },
  {
    id: 'curse-prot-letargica',
    name: 'Letárgica',
    element: 'Morte',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: '+2 Defesa • 25% (leve) ou 50% (pesada) ignora crítico/furtivo',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    defenseBonus: 2,
  },
  {
    id: 'curse-prot-repulsiva',
    name: 'Repulsiva',
    element: 'Morte',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: 'RD Morte 10 • -2 PE: atacantes CaC sofrem 2d8 Morte',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    rdEntries: [{ type: 'Morte', value: 10 }],
    activePeCost: 2,
  },
  {
    id: 'curse-prot-regenerativa',
    name: 'Regenerativa',
    element: 'Sangue',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: 'RD Sangue 10 • -1 PE (mov.): recupera 1d12 PV',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    rdEntries: [{ type: 'Sangue', value: 10 }],
    activePeCost: 1,
  },
  {
    id: 'curse-prot-sadica',
    name: 'Sádica',
    element: 'Sangue',
    group: 'protection',
    targetKinds: ['protection_light', 'protection_heavy', 'shield'],
    shortEffect: '+1 ataque e dano por cada 10 PV sofridos no turno anterior',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
  },

  // ===================== MALDIÇÕES PARA ACESSÓRIOS (p. 147) =====================
  {
    id: 'curse-acess-carisma',
    name: 'Carisma',
    element: 'Conhecimento',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+1 Presença (não dá PE extra)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    attributeBonus: 'pre',
  },
  {
    id: 'curse-acess-conjuracao',
    name: 'Conjuração',
    element: 'Conhecimento',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: 'Permite conjurar 1 ritual de 1º círculo (-1 PE se já conhece)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    requiresChoice: 'ritual',
  },
  {
    id: 'curse-acess-escudo-mental',
    name: 'Escudo Mental',
    element: 'Conhecimento',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: 'RD Mental 10',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    rdEntries: [{ type: 'Mental', value: 10 }],
  },
  {
    id: 'curse-acess-reflexao',
    name: 'Reflexão',
    element: 'Conhecimento',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '1x/rodada: pagar PE do ritual para refleti-lo',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
  },
  {
    id: 'curse-acess-sagacidade',
    name: 'Sagacidade',
    element: 'Conhecimento',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+1 Intelecto (não dá perícias extras)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    attributeBonus: 'int',
  },
  {
    id: 'curse-acess-defesa',
    name: 'Defesa',
    element: 'Energia',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+5 Defesa',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    defenseBonus: 5,
  },
  {
    id: 'curse-acess-destreza',
    name: 'Destreza',
    element: 'Energia',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+1 Agilidade',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    attributeBonus: 'agi',
  },
  {
    id: 'curse-acess-potencia',
    name: 'Potência',
    element: 'Energia',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+1 DT de habilidades, poderes e rituais',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    ritualDtBonus: 1,
  },
  {
    id: 'curse-acess-esforco-adicional',
    name: 'Esforço Adicional',
    element: 'Morte',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+5 PE Máximos (após 1 dia de uso)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    vitalBonus: { key: 'pe', value: 5 },
  },
  {
    id: 'curse-acess-disposicao',
    name: 'Disposição',
    element: 'Sangue',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+1 Vigor',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    attributeBonus: 'vig',
  },
  {
    id: 'curse-acess-pujanca',
    name: 'Pujança',
    element: 'Sangue',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+1 Força',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    attributeBonus: 'for',
  },
  {
    id: 'curse-acess-vitalidade',
    name: 'Vitalidade',
    element: 'Sangue',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: '+15 PV Máximos (após 1 dia de uso)',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    vitalBonus: { key: 'pv', value: 15 },
  },
  {
    id: 'curse-acess-protecao-elemental',
    name: 'Proteção Elemental',
    element: 'Varia',
    group: 'accessory',
    targetKinds: ['accessory'],
    shortEffect: 'RD 10 contra 1 elemento escolhido',
    description: 'Consulte o Livro de Regras v1.3 para a descrição completa.',
    requiresChoice: 'element',
  },
];

// ============================================================================
// 4. CLASSIFICAÇÃO E HELPERS DE EQUIPAMENTOS
// ============================================================================
export function findOrdemModificationDef(id: string): OrdemEquipmentModificationDef | undefined {
  return ORDEM_EQUIPMENT_MODIFICATIONS.find((m) => m.id === id);
}

export function findOrdemCurseDef(id: string): OrdemEquipmentCurseDef | undefined {
  return ORDEM_EQUIPMENT_CURSES.find((c) => c.id === id);
}

export function isOrdemCompendiumItemParanormal(entry: CompendiumEntryData): boolean {
  if (entry.metadata?.isParanormal) return true;
  if (entry.metadata?.isCursedSpecial) return true;
  if (
    entry.metadata?.itemSubtype === 'paranormal' ||
    entry.metadata?.itemSubtype === 'cursed_special'
  ) {
    return true;
  }
  const ln = entry.name.toLowerCase();
  return (
    ln.includes('componentes ritualístico') ||
    ln.includes('componentes ritualistico') ||
    ln.includes('amarras de ') ||
    ln.includes('câmera de aura') ||
    ln.includes('camera de aura') ||
    ln.includes('emissor de pulsos') ||
    ln.includes('escuta de ruídos') ||
    ln.includes('escuta de ruidos') ||
    ln.includes('medidor de estabilidade') ||
    ln.includes('scanner de manifestação') ||
    ln.includes('scanner de manifestacao') ||
    ln.includes('ingrediente paranormal') ||
    ln.includes('selo paranormal') ||
    ln.includes('amaldiçoado') ||
    ln.includes('paranormal')
  );
}

export function isOrdemItemParanormal(item: RPGItem): boolean {
  if (item.isParanormal || item.isCursedSpecial) return true;
  if (Array.isArray(item.curses) && item.curses.length > 0) return true;
  if (item.itemKind === 'paranormal' || item.itemKind === 'cursed_special') return true;
  const ln = item.name.toLowerCase();
  return (
    ln.includes('selo paranormal') ||
    ln.includes('componentes ritual') ||
    ln.includes('amarras de ') ||
    ln.includes('câmera de aura') ||
    ln.includes('emissor de pulsos') ||
    ln.includes('escuta de ruídos') ||
    ln.includes('medidor de estabilidade') ||
    ln.includes('scanner de manifestação') ||
    ln.includes('coração pulsante') ||
    ln.includes('coroa de espinhos') ||
    ln.includes('frasco de vitalidade') ||
    ln.includes('pérola de sangue') ||
    ln.includes('punhos enraivecidos') ||
    ln.includes('seringa de transfiguração') ||
    ln.includes('amarras mortais') ||
    ln.includes('casaco de lodo') ||
    ln.includes('coletora') ||
    ln.includes('crânio espiral') ||
    ln.includes('frasco de lodo') ||
    ln.includes('vislumbre do fim') ||
    ln.includes('anéis do elo mental') ||
    ln.includes('lanterna reveladora') ||
    ln.includes('máscara das pessoas nas sombras') ||
    ln.includes('munição jurada') ||
    ln.includes('pergaminho da pertinácia') ||
    ln.includes('arcabuz dos moretti') ||
    ln.includes('bateria reversa') ||
    ln.includes('peitoral da segunda chance') ||
    ln.includes('relógio de arnaldo') ||
    ln.includes('talismã da sorte') ||
    ln.includes('teclado de conexão neural') ||
    ln.includes('tela do pesadelo') ||
    ln.includes('veículo energizado') ||
    ln.includes('jaqueta de veríssimo') ||
    ln.includes('dedo decepado')
  );
}

/**
 * Decide se um item do compêndio deve gerar um PreparedAttack na aba de Combate.
 * Evita que Cicatrizante, Granadas, Mina, Taser, Spray de Pimenta e Frasco de Lodo apareçam como ataques!
 */
export function isOrdemItemWeaponEntry(entry: CompendiumEntryData): boolean {
  if (typeof entry.metadata?.isWeapon === 'boolean') return entry.metadata.isWeapon;
  const sub = entry.metadata?.itemSubtype;
  if (sub === 'weapon_melee' || sub === 'weapon_ranged' || sub === 'weapon_firearm') return true;
  if (
    sub === 'explosive' ||
    sub === 'operational' ||
    sub === 'accessory' ||
    sub === 'ammo' ||
    sub === 'protection_light' ||
    sub === 'protection_heavy' ||
    sub === 'shield' ||
    sub === 'paranormal'
  ) {
    // Exceções oficiais operacionais que funcionam como armas de disparo / ataque:
    const ln = entry.name.toLowerCase();
    if (ln.includes('pistola sinalizadora') || ln.includes('pistola de dardos')) return true;
    return false;
  }
  if (sub === 'cursed_special') {
    const ln = entry.name.toLowerCase();
    if (ln.includes('arcabuz dos moretti') || ln.includes('coletora')) return true;
    return false;
  }
  if (!entry.metadata?.damageFormula) return false;
  const ln = entry.name.toLowerCase();
  if (
    ln.includes('cicatrizante') ||
    ln.includes('spray') ||
    ln.includes('granada') ||
    ln.includes('mina antipessoal') ||
    ln.includes('taser') ||
    ln.includes('frasco de lodo')
  ) {
    return false;
  }
  return true;
}

export function inferOrdemItemKind(item: Pick<RPGItem, 'name' | 'description' | 'itemKind' | 'isCursedSpecial' | 'isParanormal'>): OrdemItemKind {
  if (item.itemKind) return item.itemKind;
  if (item.isCursedSpecial) return 'cursed_special';
  const ln = (item.name || '').toLowerCase();
  const ld = (item.description || '').toLowerCase();

  if (ln.includes('escudo')) return 'shield';
  if (ln.includes('proteção pesada') || ln.includes('protecao pesada')) return 'protection_heavy';
  if (ln.includes('proteção leve') || ln.includes('protecao leve') || ln.includes('colete kevlar')) {
    return 'protection_light';
  }
  if (ln.includes('utensílio') || ln.includes('utensilio') || ln.includes('vestimenta')) {
    return 'accessory';
  }
  if (
    ln.includes('balas curtas') ||
    ln.includes('balas longas') ||
    ln.includes('cartuchos') ||
    ln.includes('flechas') ||
    ln.includes('combustível') ||
    ln.includes('combustivel') ||
    ln.includes('foguete')
  ) {
    return 'ammo';
  }
  if (ln.includes('granada') || ln.includes('mina antipessoal')) return 'explosive';
  if (
    ln.includes('soqueira') ||
    ln.includes('faca') ||
    ln.includes('martelo') ||
    ln.includes('punhal') ||
    ln.includes('bastão') ||
    ln.includes('bastao') ||
    ln.includes('machete') ||
    ln.includes('lança') ||
    ln.includes('cajado') ||
    ln.includes('machadinha') ||
    ln.includes('nunchaku') ||
    ln.includes('corrente') ||
    ln.includes('espada') ||
    ln.includes('florete') ||
    ln.includes('machado') ||
    ln.includes('maça') ||
    ln.includes('acha') ||
    ln.includes('gadanho') ||
    ln.includes('katana') ||
    ln.includes('marreta') ||
    ln.includes('montante') ||
    ln.includes('motosserra') ||
    ln.includes('pé de cabra') ||
    ln.includes('pe de cabra')
  ) {
    return 'weapon_melee';
  }
  if (
    ln.includes('pistola de dardos') ||
    ln.includes('pistola sinalizadora')
  ) {
    return 'operational';
  }
  if (
    ln.includes('pistola') ||
    ln.includes('revólver') ||
    ln.includes('revolver') ||
    ln.includes('fuzil') ||
    ln.includes('submetralhadora') ||
    ln.includes('espingarda') ||
    ln.includes('escopeta') ||
    ln.includes('metralhadora') ||
    ln.includes('lança-chamas') ||
    ln.includes('lanca-chamas') ||
    ln.includes('bazuca') ||
    ln.includes('arcabuz') ||
    ld.includes('arma de fogo')
  ) {
    return 'weapon_firearm';
  }
  if (
    ln.includes('arco') ||
    ln.includes('besta') ||
    ln.includes('balestra') ||
    ld.includes('disparo')
  ) {
    return 'weapon_ranged';
  }
  if (item.isParanormal) return 'paranormal';
  return 'operational';
}

export function isWeaponNaturallyAutomatic(item: Pick<RPGItem, 'name' | 'description' | 'modifications'>): boolean {
  const ln = (item.name || '').toLowerCase();
  const ld = (item.description || '').toLowerCase();
  if ((item.modifications || []).includes('mod-ferrolho-automatico')) return true;
  return (
    ln.includes('submetralhadora') ||
    ln.includes('fuzil de assalto') ||
    ln.includes('metralhadora') ||
    ld.includes('arma automática') ||
    ld.includes('arma de fogo automática') ||
    ld.includes('automática')
  );
}

export function isBulletAmmo(item: Pick<RPGItem, 'name'>): boolean {
  const ln = (item.name || '').toLowerCase();
  return ln.includes('balas curtas') || ln.includes('balas longas');
}

export function canApplyModificationToItem(
  item: RPGItem,
  mod: OrdemEquipmentModificationDef
): { allowed: boolean; reason?: string } {
  const kind = inferOrdemItemKind(item);
  const existingMods = item.modifications || [];
  if (existingMods.includes(mod.id)) {
    return { allowed: false, reason: 'Modificação já aplicada' };
  }
  if (!mod.targetKinds.includes(kind)) {
    return { allowed: false, reason: 'Incompatível com este tipo de item' };
  }
  if (mod.id === 'mod-aprimorado-extra' && !existingMods.includes('mod-funcao-adicional')) {
    return { allowed: false, reason: 'Requer Função Adicional primeiro' };
  }
  if (mod.onlyBulletsAmmo && !isBulletAmmo(item)) {
    return { allowed: false, reason: 'Apenas para Balas Curtas e Balas Longas' };
  }
  if (mod.requiresAutomatic && !isWeaponNaturallyAutomatic(item)) {
    return { allowed: false, reason: 'Requer arma automática (ou Ferrolho Automático)' };
  }
  if (mod.makesAutomatic && isWeaponNaturallyAutomatic({ ...item, modifications: [] })) {
    return { allowed: false, reason: 'A arma já é automática naturalmente' };
  }
  if (mod.incompatibleWith?.some((inc) => existingMods.includes(inc))) {
    return { allowed: false, reason: 'Incompatível com outra modificação aplicada' };
  }
  return { allowed: true };
}

export function getOrdemEligibleModifications(item: RPGItem): OrdemEquipmentModificationDef[] {
  const kind = inferOrdemItemKind(item);
  return ORDEM_EQUIPMENT_MODIFICATIONS.filter((mod) => mod.targetKinds.includes(kind));
}

export function getItemAppliedCurseElements(item: RPGItem): OrdemElement[] {
  const els: OrdemElement[] = [];
  if (item.isCursedSpecial && item.element) {
    els.push(item.element);
  }
  for (const c of item.curses || []) {
    const def = findOrdemCurseDef(c.curseId);
    if (!def) continue;
    const el = def.element === 'Varia' ? c.chosenElement : def.element;
    if (el) els.push(el);
  }
  return els;
}

export function canApplyCurseToItem(
  item: RPGItem,
  curse: OrdemEquipmentCurseDef,
  chosenElement?: OrdemElement
): { allowed: boolean; reason?: string } {
  const kind = inferOrdemItemKind(item);
  const existingCurses = item.curses || [];
  if (existingCurses.some((c) => c.curseId === curse.id)) {
    return { allowed: false, reason: 'Maldição já aplicada' };
  }
  if (!curse.targetKinds.includes(kind)) {
    return { allowed: false, reason: 'Incompatível com este tipo de item' };
  }
  if (curse.onlyMeleeWeapon && kind !== 'weapon_melee') {
    return { allowed: false, reason: 'Apenas para armas corpo a corpo' };
  }
  const targetElement = curse.element === 'Varia' ? chosenElement : curse.element;
  if (targetElement && targetElement !== 'Medo') {
    const existingEls = getItemAppliedCurseElements(item);
    for (const ex of existingEls) {
      if (areOrdemElementsOpposing(ex, targetElement)) {
        return {
          allowed: false,
          reason: `Elemento opressor: ${targetElement} não pode ser combinado com ${ex} (p. 144)`,
        };
      }
    }
  }
  return { allowed: true };
}

export function getOrdemEligibleCurses(item: RPGItem): OrdemEquipmentCurseDef[] {
  const kind = inferOrdemItemKind(item);
  return ORDEM_EQUIPMENT_CURSES.filter((c) => c.targetKinds.includes(kind));
}

/**
 * Categoria efetiva oficial (Cap. 3 p. 60 + Cap. 6 p. 144):
 * - Base + 1 por cada modificação
 * - +2 para a 1ª maldição e +1 para cada maldição adicional
 */
export function getOrdemItemEffectiveCategory(item: RPGItem): number {
  const base = item.baseCategory ?? item.category ?? 0;
  const modCount = (item.modifications || []).length;
  const curseCount = (item.curses || []).length;
  const curseIncrease = curseCount > 0 ? 2 + Math.max(0, curseCount - 1) : 0;
  return base + modCount + curseIncrease;
}

/**
 * Espaços efetivos oficiais considerando Discreta (-1), Reforçada (+1), Blindada (+1).
 */
export function getOrdemItemEffectiveSlots(item: RPGItem): number {
  const base = item.baseSlots ?? item.slots ?? 1;
  let delta = 0;
  for (const modId of item.modifications || []) {
    const def = findOrdemModificationDef(modId);
    if (def?.slotsDelta) delta += def.slotsDelta;
  }
  return Math.max(0, base + delta);
}

// ============================================================================
// 5. CÁLCULO DE MODIFICADORES DE ARMA (ATAQUES)
// ============================================================================
export interface ComputedOrdemWeaponMods {
  attackBonus: number;
  damageBonus: number;
  extraDamageDiceCount: number; // Calibre Grosso
  critThreatBonus: number;      // Perigosa (+2), Mira Laser (+2)
  doublesCritThreat: boolean;   // Predadora (aplicar ANTES de somas!)
  isAutomatic: boolean;
  hasCompensador: boolean;
  hasMiraTelescopica: boolean;
  hasSilenciador: boolean;
  hasVisaoCalor: boolean;
  hasTatica: boolean;
  extraDamageDice: Array<{ count: number; sides: number; label: string; multipliesOnCrit?: boolean }>;
  activeCurses: Array<{ curseId: string; name: string; element: string; chosenElement?: OrdemElement; chosenRitualName?: string }>;
  sanguinariaCritTempHp: boolean;
  hasEmpuxo: boolean;
  hasEnergetica: boolean;
  hasVibrante: boolean;
  hasConsumidora: boolean;
  hasErosiva: boolean;
  hasRepulsora: boolean;
  hasSenciente: boolean;
  antielementoChosen?: OrdemElement;
  ritualisticaStored?: string;
  badges: string[];
}

export function computeOrdemWeaponBonusesFromItem(
  item?: RPGItem,
  soqueiraForUnarmed?: RPGItem
): ComputedOrdemWeaponMods {
  const res: ComputedOrdemWeaponMods = {
    attackBonus: 0,
    damageBonus: 0,
    extraDamageDiceCount: 0,
    critThreatBonus: 0,
    doublesCritThreat: false,
    isAutomatic: false,
    hasCompensador: false,
    hasMiraTelescopica: false,
    hasSilenciador: false,
    hasVisaoCalor: false,
    hasTatica: false,
    extraDamageDice: [],
    activeCurses: [],
    sanguinariaCritTempHp: false,
    hasEmpuxo: false,
    hasEnergetica: false,
    hasVibrante: false,
    hasConsumidora: false,
    hasErosiva: false,
    hasRepulsora: false,
    hasSenciente: false,
    badges: [],
  };

  const source = item || soqueiraForUnarmed;
  if (!source) return res;

  if (isWeaponNaturallyAutomatic(source)) {
    res.isAutomatic = true;
  }

  // Arcabuz dos Moretti (+2 ataque inato)
  if (source.name.toLowerCase().includes('arcabuz dos moretti')) {
    res.attackBonus += 2;
    res.badges.push('⚡ Arcabuz (+2 Atq, 1d6 define dado)');
  }

  // Punhos Enraivecidos (quando aplicado em ataque desarmado)
  if (soqueiraForUnarmed && soqueiraForUnarmed.name.toLowerCase().includes('punhos enraivecidos')) {
    res.extraDamageDice.push({
      count: 1,
      sides: 8,
      label: 'Punhos Enraivecidos (Sangue)',
      multipliesOnCrit: false,
    });
    res.badges.push('🩸 Punhos Enraivecidos (+1d8 Sangue)');
  }

  for (const modId of source.modifications || []) {
    const def = findOrdemModificationDef(modId);
    if (!def) continue;
    if (def.attackBonus) res.attackBonus += def.attackBonus;
    if (def.damageBonus) res.damageBonus += def.damageBonus;
    if (def.extraDamageDiceCount) res.extraDamageDiceCount += def.extraDamageDiceCount;
    if (def.critThreatBonus) res.critThreatBonus += def.critThreatBonus;
    if (def.makesAutomatic) res.isAutomatic = true;
    if (modId === 'mod-compensador') res.hasCompensador = true;
    if (modId === 'mod-mira-telescopica') res.hasMiraTelescopica = true;
    if (modId === 'mod-silenciador') res.hasSilenciador = true;
    if (modId === 'mod-visao-calor') res.hasVisaoCalor = true;
    if (modId === 'mod-tatica') res.hasTatica = true;
    res.badges.push(`🛠️ ${def.name}`);
  }

  for (const c of source.curses || []) {
    const def = findOrdemCurseDef(c.curseId);
    if (!def) continue;
    const el = def.element === 'Varia' ? c.chosenElement || 'Paranormal' : def.element;
    res.activeCurses.push({
      curseId: def.id,
      name: def.name,
      element: el,
      chosenElement: c.chosenElement,
      chosenRitualName: c.chosenRitualName,
    });
    if (def.doublesCritThreat) res.doublesCritThreat = true;
    if (def.extraDamageDice) res.extraDamageDice.push(def.extraDamageDice);
    if (def.sanguinariaCritTempHp) res.sanguinariaCritTempHp = true;
    if (def.id === 'curse-arma-empuxo') res.hasEmpuxo = true;
    if (def.id === 'curse-arma-energetica') res.hasEnergetica = true;
    if (def.id === 'curse-arma-vibrante') res.hasVibrante = true;
    if (def.id === 'curse-arma-consumidora') res.hasConsumidora = true;
    if (def.id === 'curse-arma-erosiva') res.hasErosiva = true;
    if (def.id === 'curse-arma-repulsora') res.hasRepulsora = true;
    if (def.id === 'curse-arma-senciente') res.hasSenciente = true;
    if (def.id === 'curse-arma-antielemento') res.antielementoChosen = c.chosenElement;
    if (def.id === 'curse-arma-ritualistica') {
      res.ritualisticaStored = source.storedRitualName || c.chosenRitualName;
    }
    res.badges.push(`👁️ ${def.name}`);
  }

  return res;
}

/**
 * Dobra a margem de ameaça conforme p. 146 (Predadora):
 * Ex.: 20 (largura 1) -> 19 (largura 2); 19 (largura 2) -> 17 (largura 4); 18 (largura 3) -> 15 (largura 6).
 * Deve ser aplicado ANTES de efeitos aditivos (+2 Perigosa / Mira Laser / Técnica Letal / Mirar).
 */
export function doubleCritThreatRange(critRange: string): string {
  const clean = (critRange || '20/x2').trim();
  const bothMatch = clean.match(/^(\d+)\s*\/\s*(x\d+)$/i);
  if (bothMatch) {
    const threat = Math.max(1, Math.min(20, Number(bothMatch[1])));
    const width = 21 - threat;
    const newThreat = Math.max(2, 21 - width * 2);
    return `${newThreat}/${bothMatch[2]}`;
  }
  const multOnly = clean.match(/^(x\d+)$/i);
  if (multOnly) {
    return `19/${multOnly[1]}`;
  }
  return clean;
}

// ============================================================================
// 6. CÁLCULO DE EFEITOS DERIVADOS DO INVENTÁRIO (Acessórios, RD, Kits, Preço da Maldição)
// ============================================================================
export interface OrdemCursePriceByAttr {
  attr: keyof OrdemAttributes;
  attrLabel: string;
  element: Exclude<OrdemElement, 'Medo'>;
  curseCount: number;
  sanLoss: number;
}

export interface OrdemInventoryDerivedEffects {
  dynamicModifiers: RuleModifier[];
  damageResistances: Array<{ type: string; value: number; source: string }>;
  displacementBonus: number;
  ritualDtBonus: number;
  ignoresLoadPenaltySkills: string[];
  equippedVestimentaCount: number;
  maxVestimentas: number;
  vestimentaLimitExceeded: boolean;
  missingSkillKits: Array<{ skillId: string; skillName: string }>;
  curseCountsByElement: Record<OrdemElement, number>;
  cursePriceByAttr: Record<keyof OrdemAttributes, OrdemCursePriceByAttr | null>;
  totalCursesCarried: number;
  hasFearCurse: boolean;
  effectiveProficiencies: string[];
  nonProficientProtections: Array<{ itemId: string; itemName: string; requiredLabel: string }>;
  hasProtectionProficiencyPenalty: boolean;
}

// ============================================================================
// 5B. PROFICIÊNCIAS OFICIAIS DE ORDEM PARANORMAL v1.3 (p. 54 e p. 62)
// ============================================================================
export const ORDEM_PROFICIENCY_OPTIONS = [
  { id: 'armas_simples', label: 'Armas simples' },
  { id: 'armas_taticas', label: 'Armas táticas' },
  { id: 'armas_taticas_corpo_disparo', label: 'Armas táticas corpo a corpo e de disparo' },
  { id: 'armas_taticas_fogo', label: 'Armas táticas de fogo' },
  { id: 'armas_balas_longas', label: 'Armas de fogo (balas longas)' },
  { id: 'armas_pesadas', label: 'Armas pesadas' },
  { id: 'protecoes_leves', label: 'Proteções leves' },
  { id: 'protecoes_pesadas', label: 'Proteções pesadas (e Escudos)' },
] as const;

export const ORDEM_FOR_AGI_SKILL_IDS = [
  'acrobacia',
  'atletismo',
  'crime',
  'furtividade',
  'iniciativa',
  'luta',
  'pilotagem',
  'pontaria',
  'reflexos',
] as const;

const DEFAULT_CLASS_PROFICIENCIES: Record<string, string[]> = {
  combatente: ['Armas simples', 'Armas táticas', 'Proteções leves'],
  especialista: ['Armas simples', 'Proteções leves'],
  ocultista: ['Armas simples'],
  mundano: ['Armas simples'],
};

function normalizeProfKey(p: string): string {
  const lp = p.trim().toLowerCase();
  if (lp.includes('proteções pesadas') || lp.includes('protecoes pesadas')) {
    return 'protecoes_pesadas';
  }
  if (lp.includes('proteções leves') || lp.includes('protecoes leves')) {
    return 'protecoes_leves';
  }
  return lp;
}

export function computeOrdemEffectiveProficiencies(
  sheetData?: Partial<OrdemSheetData>,
  abilities: CharacterAbility[] = []
): string[] {
  const baseList =
    Array.isArray(sheetData?.proficiencies) && sheetData.proficiencies.length > 0
      ? [...sheetData.proficiencies]
      : [...(DEFAULT_CLASS_PROFICIENCIES[sheetData?.characterClass || 'ocultista'] || ['Armas simples'])];

  const seen = new Set<string>();
  const result: string[] = [];

  const pushUnique = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = normalizeProfKey(trimmed);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(trimmed);
  };

  for (const item of baseList) {
    pushUnique(item);
  }
  if (result.length === 0) {
    pushUnique('Armas simples');
  }

  for (const ab of abilities) {
    const an = (ab.name || '').toLowerCase();
    const aid = (ab.id || '').toLowerCase();
    if (an.includes('armamento pesado') || aid.includes('armamento-pesado')) {
      pushUnique('Armas pesadas');
    }
    if (
      an.includes('proteção pesada') ||
      an.includes('protecao pesada') ||
      aid.includes('protecao-pesada')
    ) {
      pushUnique('Proteções pesadas (e Escudos)');
    }
    if (
      an.includes('balística avançada') ||
      an.includes('balistica avancada') ||
      aid.includes('balistica-avancada')
    ) {
      pushUnique('Armas táticas de fogo');
    }
    if (an.includes('ninja urbano') || aid.includes('ninja-urbano')) {
      pushUnique('Armas táticas corpo a corpo e de disparo');
    }
    if (an.includes('mira de elite') || aid.includes('mira-elite')) {
      pushUnique('Armas de fogo (balas longas)');
    }
  }

  return result;
}

export type OrdemWeaponProficiencyCategory =
  | 'simples'
  | 'tatica_corpo'
  | 'tatica_disparo'
  | 'tatica_fogo'
  | 'pesada';

export function classifyOrdemWeaponProficiency(
  weaponName: string,
  description = '',
  isUnarmed = false
): {
  category: OrdemWeaponProficiencyCategory;
  usesBalasLongas: boolean;
  requiredLabel: string;
} {
  const ln = (weaponName || '').toLowerCase();
  const ld = (description || '').toLowerCase();

  if (
    isUnarmed ||
    ln.includes('desarmado') ||
    ln.includes('soqueira') ||
    ln.includes('punhos enraivecidos') ||
    ln.includes('arcabuz dos moretti')
  ) {
    return { category: 'simples', usesBalasLongas: false, requiredLabel: 'Armas simples' };
  }

  // Armas Pesadas (checar antes de lança / metralhadora simples)
  if (
    (ln.includes('metralhadora') && !ln.includes('submetralhadora')) ||
    ln.includes('lança-chamas') ||
    ln.includes('lanca-chamas') ||
    ln.includes('bazuca') ||
    ln.includes('lança-foguetes') ||
    ln.includes('lanca-foguetes') ||
    ln.includes('(pesada')
  ) {
    return {
      category: 'pesada',
      usesBalasLongas: ln.includes('metralhadora') && !ln.includes('submetralhadora'),
      requiredLabel: 'Armas pesadas',
    };
  }

  // Armas Táticas de Fogo
  if (
    ln.includes('submetralhadora') ||
    ln.includes('espingarda') ||
    ln.includes('escopeta') ||
    ln.includes('fuzil de assalto') ||
    ln.includes('fuzil de precisão') ||
    ln.includes('fuzil de precisao') ||
    ln.includes('sniper') ||
    (ln.includes('(tática') && ln.includes('fogo')) ||
    (ln.includes('(tatica') && ln.includes('fogo'))
  ) {
    const usesLong =
      ln.includes('fuzil de assalto') ||
      ln.includes('fuzil de precisão') ||
      ln.includes('fuzil de precisao') ||
      ln.includes('sniper') ||
      ld.includes('balas longas');
    return {
      category: 'tatica_fogo',
      usesBalasLongas: usesLong,
      requiredLabel: 'Armas táticas de fogo',
    };
  }

  // Armas Táticas de Disparo (exceto fogo)
  if (ln.includes('arco composto') || ln.includes('balestra')) {
    return {
      category: 'tatica_disparo',
      usesBalasLongas: false,
      requiredLabel: 'Armas táticas de disparo',
    };
  }

  // Armas Táticas Corpo a Corpo
  if (
    ln.includes('machadinha') ||
    ln.includes('nunchaku') ||
    ln.includes('corrente') ||
    ln.includes('espada') ||
    ln.includes('florete') ||
    ln.includes('machado') ||
    ln.includes('maça') ||
    ln.includes('maca') ||
    ln.includes('acha') ||
    ln.includes('gadanho') ||
    ln.includes('foice') ||
    ln.includes('katana') ||
    ln.includes('marreta') ||
    ln.includes('montante') ||
    ln.includes('motosserra') ||
    ln.includes('(tática') ||
    ln.includes('(tatica')
  ) {
    return {
      category: 'tatica_corpo',
      usesBalasLongas: false,
      requiredLabel: 'Armas táticas corpo a corpo',
    };
  }

  // Armas Simples (faca, martelo, punhal, bastão, machete, lança, cajado, arco simples, besta, pistola, revólver, fuzil de caça...)
  const isFuzilCaca = ln.includes('fuzil de caça') || ln.includes('fuzil de caca');
  return {
    category: 'simples',
    usesBalasLongas: isFuzilCaca || ld.includes('balas longas'),
    requiredLabel: 'Armas simples',
  };
}

export function checkOrdemWeaponProficiency(
  weaponName: string,
  effectiveProficiencies: string[],
  description = '',
  isUnarmed = false
): { proficient: boolean; requiredLabel: string; penaltyDice: number } {
  const { category, usesBalasLongas, requiredLabel } = classifyOrdemWeaponProficiency(
    weaponName,
    description,
    isUnarmed
  );

  const lowerProfs = effectiveProficiencies.map((p) => p.trim().toLowerCase());
  const cleanWeaponName = weaponName.split('(')[0].trim().toLowerCase();

  if (cleanWeaponName && lowerProfs.some((p) => p === cleanWeaponName || (cleanWeaponName.length >= 4 && p.includes(cleanWeaponName)))) {
    return { proficient: true, requiredLabel, penaltyDice: 0 };
  }

  const hasGeneralTaticas = lowerProfs.some(
    (p) =>
      p === 'armas táticas' ||
      p === 'armas taticas' ||
      (p.includes('armas táticas') && !p.includes('de fogo') && !p.includes('corpo'))
  );
  const hasBalasLongas = lowerProfs.some((p) => p.includes('balas longas'));

  let proficient = false;
  switch (category) {
    case 'simples':
      proficient =
        lowerProfs.length === 0 ||
        lowerProfs.some((p) => p.includes('armas simples') || p === 'todas as armas');
      break;
    case 'tatica_corpo':
      proficient =
        hasGeneralTaticas ||
        lowerProfs.some(
          (p) =>
            p.includes('corpo a corpo') ||
            p.includes('armas táticas corpo') ||
            p.includes('armas taticas corpo') ||
            p === 'todas as armas'
        );
      break;
    case 'tatica_disparo':
      proficient =
        hasGeneralTaticas ||
        lowerProfs.some(
          (p) => p.includes('de disparo') || p === 'todas as armas'
        );
      break;
    case 'tatica_fogo':
      proficient =
        hasGeneralTaticas ||
        lowerProfs.some(
          (p) =>
            p.includes('armas táticas de fogo') ||
            p.includes('armas taticas de fogo') ||
            p === 'armas de fogo' ||
            p === 'todas as armas'
        ) ||
        (usesBalasLongas && hasBalasLongas);
      break;
    case 'pesada':
      proficient =
        lowerProfs.some((p) => p.includes('armas pesadas') || p === 'todas as armas') ||
        (usesBalasLongas && hasBalasLongas);
      break;
  }

  return {
    proficient,
    requiredLabel,
    penaltyDice: proficient ? 0 : -2,
  };
}

export function checkOrdemProtectionProficiency(
  item: Pick<RPGItem, 'name' | 'description' | 'itemKind' | 'isCursedSpecial' | 'isParanormal'>,
  effectiveProficiencies: string[]
): { isProtection: boolean; proficient: boolean; requiredLabel: string } {
  const kind = inferOrdemItemKind(item);
  const lowerProfs = effectiveProficiencies.map((p) => p.trim().toLowerCase());

  if (kind === 'protection_light') {
    const ok = lowerProfs.some(
      (p) =>
        p.includes('proteções leves') ||
        p.includes('protecoes leves') ||
        p.includes('todas as prote')
    );
    return { isProtection: true, proficient: ok, requiredLabel: 'Proteções leves' };
  }

  if (kind === 'protection_heavy' || kind === 'shield') {
    const ok = lowerProfs.some(
      (p) =>
        p.includes('proteções pesadas') ||
        p.includes('protecoes pesadas') ||
        (kind === 'shield' && p.includes('escudo')) ||
        p.includes('todas as prote')
    );
    return {
      isProtection: true,
      proficient: ok,
      requiredLabel: 'Proteções pesadas (e Escudos)',
    };
  }

  return { isProtection: false, proficient: true, requiredLabel: '' };
}

export function computeOrdemInventoryDerivedEffects(
  inventory: RPGItem[],
  abilities: CharacterAbility[] = [],
  sheetData?: Partial<OrdemSheetData>
): OrdemInventoryDerivedEffects {
  const dynamicModifiers: RuleModifier[] = [];
  const rdMap = new Map<string, { value: number; sources: string[] }>();
  let displacementBonus = 0;
  let ritualDtBonus = 0;
  const ignoresLoadPenaltySkills = new Set<string>();

  const addRd = (type: string, value: number, source: string) => {
    if (value <= 0) return;
    const prev = rdMap.get(type);
    if (!prev) {
      rdMap.set(type, { value, sources: [source] });
    } else {
      // Em Ordem, RDs de fontes distintas normalmente acumulam ou prevalece a maior;
      // para Proteção Pesada + Tanque de Guerra soma, para proteções elementais distintas soma/exibe maior.
      prev.value += value;
      prev.sources.push(source);
    }
  };

  // Controle de não-acúmulo de bônus de perícias por itens (p. 63) e atributos amaldiçoados (p. 145)
  const bestItemSkillBonus: Record<string, { value: number; source: string }> = {};
  const cursedAttrBonus: Partial<Record<keyof OrdemAttributes, number>> = {};
  let bestCursedDefenseBonus = 0; // Maldição Defesa (+5) de acessório não acumula entre acessórios amaldiçoados
  let bestCursedPvBonus = 0;
  let bestCursedPeBonus = 0;
  let equippedVestimentaCount = 0;

  const registerItemSkillBonus = (skillId: string, value: number, source: string) => {
    const k = skillId.toLowerCase().trim();
    if (!k) return;
    const curr = bestItemSkillBonus[k];
    if (!curr || value > curr.value) {
      bestItemSkillBonus[k] = { value, source };
    }
  };

  // Contagem de maldições em TODOS os itens carregados (Preço da Maldição, p. 145: vale para itens aceitos/carregados)
  const curseCountsByElement: Record<OrdemElement, number> = {
    Sangue: 0,
    Morte: 0,
    Conhecimento: 0,
    Energia: 0,
    Medo: 0,
  };

  const hasTanqueGuerra = abilities.some(
    (ab) =>
      ab.isActive !== false &&
      (ab.id.toLowerCase().includes('tanque-guerra') ||
        ab.name.toLowerCase().includes('tanque de guerra'))
  );
  const hasMochileiro = abilities.some(
    (ab) =>
      ab.isActive !== false &&
      (ab.id.toLowerCase().includes('mochileiro') ||
        ab.name.toLowerCase().includes('mochileiro'))
  );
  const maxVestimentas = hasMochileiro ? 3 : 2;
  const hasCorreriaDesesperada = abilities.some(
    (ab) =>
      ab.isActive !== false &&
      (ab.id.toLowerCase().includes('correria-desesperada') ||
        ab.name.toLowerCase().includes('correria desesperada'))
  );
  if (hasCorreriaDesesperada) {
    displacementBonus += 3;
  }

  // Kits presentes na mochila (não precisam estar equipados, basta possuir no inventário — ou acessório Instrumental)
  const ownedKitSkills = new Set<string>();

  // Proficiências efetivas e rastreamento de proteções/escudos equipados sem proficiência (p. 62)
  const effectiveProficiencies = computeOrdemEffectiveProficiencies(sheetData, abilities);
  const nonProficientProtections: Array<{
    itemId: string;
    itemName: string;
    requiredLabel: string;
  }> = [];

  for (const item of inventory) {
    const ln = (item.name || '').toLowerCase();
    const kind = inferOrdemItemKind(item);
    const mods = item.modifications || [];
    const curses = item.curses || [];

    // 1. Kits de Perícia na mochila
    for (const kReq of ORDEM_KIT_REQUIRED_SKILLS) {
      if (kReq.kitKeywords.some((kw) => ln.includes(kw))) {
        ownedKitSkills.add(kReq.skillId);
      }
    }
    if (mods.includes('mod-instrumental') && item.accessoryConfig?.instrumentalSkill) {
      ownedKitSkills.add(item.accessoryConfig.instrumentalSkill.toLowerCase());
    }

    // 2. Contabilizar maldições carregadas para O Preço da Maldição (p. 145)
    if (item.isCursedSpecial && item.element) {
      curseCountsByElement[item.element] = (curseCountsByElement[item.element] || 0) + 1;
    }
    for (const c of curses) {
      const cDef = findOrdemCurseDef(c.curseId);
      if (!cDef) continue;
      const el = cDef.element === 'Varia' ? c.chosenElement : cDef.element;
      if (el) {
        curseCountsByElement[el] = (curseCountsByElement[el] || 0) + 1;
      }
    }

    // Os bônus mecânicos de equipamento aplicam-se enquanto EQUIPADO / EM MÃOS
    if (!item.isEquipped) continue;

    // 2B. Checagem de Proficiência em Proteção / Escudo equipado (p. 62)
    const protCheck = checkOrdemProtectionProficiency(item, effectiveProficiencies);
    if (protCheck.isProtection && !protCheck.proficient) {
      nonProficientProtections.push({
        itemId: item.id,
        itemName: item.name,
        requiredLabel: protCheck.requiredLabel,
      });
    }

    // Vestimentas: limite de 2 simultâneas (p. 63) ou 3 com Mochileiro (SaH, p. 14)
    const isVestimenta =
      kind === 'accessory' &&
      (item.accessoryConfig?.accessoryType === 'vestimenta' || ln.includes('vestimenta'));
    let vestimentaAllowed = true;
    if (isVestimenta) {
      equippedVestimentaCount += 1;
      if (equippedVestimentaCount > maxVestimentas) {
        vestimentaAllowed = false;
      }
    }

    // 3. Proteções base + modificações (p. 62)
    if (kind === 'protection_heavy') {
      const hasBlindada = mods.includes('mod-blindada');
      const basePhysRd = hasBlindada ? 5 : 2;
      addRd('Física (B/C/I/P)', basePhysRd, hasBlindada ? `${item.name} [Blindada]` : item.name);
      if (hasTanqueGuerra) {
        addRd('Física (B/C/I/P)', 2, 'Tanque de Guerra');
      }
    }

    for (const modId of mods) {
      const mDef = findOrdemModificationDef(modId);
      if (!mDef) continue;
      if (mDef.defenseBonus) {
        dynamicModifiers.push({
          id: `dyn-mod-def-${item.id}-${modId}`,
          targetType: 'defense',
          targetKey: 'defense',
          value: mDef.defenseBonus,
        });
      }
    }

    // 4. Acessórios (Utensílio / Vestimenta) — +2 ou +5 Aprimorado + Função Adicional (p. 63-64)
    if (kind === 'accessory' && vestimentaAllowed && item.accessoryConfig) {
      const cfg = item.accessoryConfig;
      if (cfg.primarySkill) {
        const val = mods.includes('mod-aprimorado') || cfg.aprimoradoPrimary ? 5 : 2;
        registerItemSkillBonus(cfg.primarySkill, val, item.name);
      }
      if (mods.includes('mod-funcao-adicional') && cfg.secondarySkill) {
        const val = mods.includes('mod-aprimorado-extra') || cfg.aprimoradoSecondary ? 5 : 2;
        registerItemSkillBonus(cfg.secondarySkill, val, `${item.name} (Função Adicional)`);
      }
    }

    // 5. Itens Operacionais e Amaldiçoados Especiais equipados (RD / Bônus fixos)
    if (ln.includes('traje hazmat')) {
      addRd('Químico', 10, item.name);
    }
    if (ln.includes('casaco de lodo')) {
      addRd('Corte/Impacto/Perfuração/Morte', 5, item.name);
    }
    if (ln.includes('máscara das pessoas nas sombras') || ln.includes('mascara das pessoas nas sombras')) {
      addRd('Conhecimento', 10, item.name);
    }
    if (ln.includes('jaqueta de veríssimo') || ln.includes('jaqueta de verissimo')) {
      addRd('Paranormal (Todos)', 15, item.name);
    }
    if (ln.includes('dedo decepado')) {
      dynamicModifiers.push({
        id: `dyn-dedo-dip-${item.id}`,
        targetType: 'skill_bonus',
        targetKey: 'diplomacia',
        value: -10,
      });
    }

    // 6. Maldições aplicadas em Armas, Proteções e Acessórios
    for (const c of curses) {
      const cDef = findOrdemCurseDef(c.curseId);
      if (!cDef) continue;

      if (cDef.weaponDefenseBonus) {
        dynamicModifiers.push({
          id: `dyn-curse-wdef-${item.id}-${cDef.id}`,
          targetType: 'defense',
          targetKey: 'defense',
          value: cDef.weaponDefenseBonus,
        });
      }
      if (cDef.defenseBonus) {
        if (cDef.group === 'accessory') {
          bestCursedDefenseBonus = Math.max(bestCursedDefenseBonus, cDef.defenseBonus);
        } else {
          dynamicModifiers.push({
            id: `dyn-curse-def-${item.id}-${cDef.id}`,
            targetType: 'defense',
            targetKey: 'defense',
            value: cDef.defenseBonus,
          });
        }
      }
      if (cDef.attributeBonus && vestimentaAllowed) {
        cursedAttrBonus[cDef.attributeBonus] = Math.max(
          cursedAttrBonus[cDef.attributeBonus] || 0,
          1
        );
      }
      if (cDef.vitalBonus && vestimentaAllowed) {
        if (cDef.vitalBonus.key === 'pv') {
          bestCursedPvBonus = Math.max(bestCursedPvBonus, cDef.vitalBonus.value);
        } else if (cDef.vitalBonus.key === 'pe') {
          bestCursedPeBonus = Math.max(bestCursedPeBonus, cDef.vitalBonus.value);
        }
      }
      if (cDef.skillBonus) {
        dynamicModifiers.push({
          id: `dyn-curse-sk-${item.id}-${cDef.id}`,
          targetType: 'skill_bonus',
          targetKey: cDef.skillBonus.skillId,
          value: cDef.skillBonus.value,
        });
      }
      if (cDef.displacementBonus) {
        displacementBonus += cDef.displacementBonus;
      }
      if (cDef.ritualDtBonus && vestimentaAllowed) {
        ritualDtBonus = Math.max(ritualDtBonus, cDef.ritualDtBonus);
      }
      if (cDef.ignoresLoadPenaltyOnSkill) {
        ignoresLoadPenaltySkills.add(cDef.ignoresLoadPenaltyOnSkill);
      }
      if (cDef.rdEntries) {
        for (const rde of cDef.rdEntries) {
          const val = kind === 'protection_heavy' && rde.heavyValue ? rde.heavyValue : rde.value;
          addRd(rde.type, val, `${item.name} (${cDef.name})`);
        }
      }
      if (cDef.id === 'curse-acess-protecao-elemental' && c.chosenElement && vestimentaAllowed) {
        addRd(c.chosenElement, 10, `${item.name} (Proteção Elemental)`);
      }
    }
  }

  // Poderes que concedem RD (ex.: Eu Já Sabia — Teórico da Conspiração, Mutação — Experimento, Resistir a <Elemento>)
  const normOrig = (sheetData?.origin || '').trim().toLowerCase();
  if (
    normOrig.includes('teórico') ||
    normOrig === 'teorico_conspiracao' ||
    sheetData?.originMeta?.flashbackOriginId === 'teorico_conspiracao'
  ) {
    const intVal = Number(sheetData?.attributes?.int ?? 0);
    if (intVal > 0) addRd('Mental', intVal, 'Eu Já Sabia (INT)');
  }
  if (
    normOrig === 'experimento' ||
    abilities.some((ab) => ab.id === 'orig-experimento' && ab.isActive !== false)
  ) {
    addRd('Geral (Dano)', 2, 'Mutação (Experimento)');
  }
  for (const ab of abilities) {
    if (ab.isActive === false) continue;
    const al = ab.name.toLowerCase();
    if (al.includes('resistir a sangue')) addRd('Sangue', 10, ab.name);
    if (al.includes('resistir a morte')) addRd('Morte', 10, ab.name);
    if (al.includes('resistir a conhecimento')) addRd('Conhecimento', 10, ab.name);
    if (al.includes('resistir a energia')) addRd('Energia', 10, ab.name);
  }
  for (const se of sheetData?.sceneEffects || []) {
    const desc = `${se.name || ''} ${se.description || ''}`.toLowerCase();
    if (desc.includes('rd sangue 10')) addRd('Sangue', 10, se.name);
    if (desc.includes('rd morte 10')) addRd('Morte', 10, se.name);
    if (desc.includes('rd conhecimento 10')) addRd('Conhecimento', 10, se.name);
    if (desc.includes('rd energia 10')) addRd('Energia', 10, se.name);
  }

  // Aplica o MAIOR bônus de item por perícia (regra de não-acúmulo p. 63)
  for (const [skillId, info] of Object.entries(bestItemSkillBonus)) {
    dynamicModifiers.push({
      id: `dyn-item-skill-${skillId}`,
      targetType: 'skill_bonus',
      targetKey: skillId,
      value: info.value,
    });
  }

  // Aplica bônus amaldiçoados não-cumulativos (p. 145)
  for (const [attr, val] of Object.entries(cursedAttrBonus)) {
    if (val && val > 0) {
      dynamicModifiers.push({
        id: `dyn-cursed-attr-${attr}`,
        targetType: 'attribute',
        targetKey: attr,
        value: val,
      });
    }
  }
  if (bestCursedDefenseBonus > 0) {
    dynamicModifiers.push({
      id: 'dyn-cursed-acess-def',
      targetType: 'defense',
      targetKey: 'defense',
      value: bestCursedDefenseBonus,
    });
  }
  if (bestCursedPvBonus > 0) {
    dynamicModifiers.push({
      id: 'dyn-cursed-vitalidade',
      targetType: 'vital_max',
      targetKey: 'pv',
      value: bestCursedPvBonus,
    });
  }
  if (bestCursedPeBonus > 0) {
    dynamicModifiers.push({
      id: 'dyn-cursed-esforco',
      targetType: 'vital_max',
      targetKey: 'pe',
      value: bestCursedPeBonus,
    });
  }

  // Penalidade por Não Proficiência em Proteções / Escudos (p. 62):
  // -2d20 em testes baseados em Força e Agilidade (aplica 1 única vez mesmo se houver escudo + proteção)
  const hasProtectionProficiencyPenalty = nonProficientProtections.length > 0;
  if (hasProtectionProficiencyPenalty) {
    const targetKeys = new Set<string>(['for', 'agi', ...ORDEM_FOR_AGI_SKILL_IDS]);
    for (const sk of sheetData?.skills || []) {
      if (sk.attribute === 'for' || sk.attribute === 'agi') {
        targetKeys.add(sk.id.toLowerCase().trim());
      }
    }
    for (const key of targetKeys) {
      dynamicModifiers.push({
        id: `dyn-nonprof-prot-${key}`,
        targetType: 'skill_dice',
        targetKey: key,
        value: -2,
      });
    }
  }

  // Kits faltantes
  const missingSkillKits = ORDEM_KIT_REQUIRED_SKILLS.filter(
    (k) => !ownedKitSkills.has(k.skillId)
  ).map((k) => ({ skillId: k.skillId, skillName: k.skillName }));

  // Mapa de O Preço da Maldição por Atributo (p. 145):
  // Conhecimento -> INT | Energia -> AGI | Morte -> PRE | Sangue -> FOR e VIG
  const makePrice = (
    attr: keyof OrdemAttributes,
    attrLabel: string,
    element: Exclude<OrdemElement, 'Medo'>
  ): OrdemCursePriceByAttr | null => {
    const count = curseCountsByElement[element] || 0;
    if (count <= 0) return null;
    return { attr, attrLabel, element, curseCount: count, sanLoss: count * 2 };
  };

  const cursePriceByAttr: Record<keyof OrdemAttributes, OrdemCursePriceByAttr | null> = {
    int: makePrice('int', 'Intelecto', 'Conhecimento'),
    agi: makePrice('agi', 'Agilidade', 'Energia'),
    pre: makePrice('pre', 'Presença', 'Morte'),
    for: makePrice('for', 'Força', 'Sangue'),
    vig: makePrice('vig', 'Vigor', 'Sangue'),
  };

  const totalCursesCarried =
    curseCountsByElement.Sangue +
    curseCountsByElement.Morte +
    curseCountsByElement.Conhecimento +
    curseCountsByElement.Energia +
    curseCountsByElement.Medo;

  const damageResistances = Array.from(rdMap.entries()).map(([type, data]) => ({
    type,
    value: data.value,
    source: data.sources.join(' + '),
  }));

  return {
    dynamicModifiers,
    damageResistances,
    displacementBonus,
    ritualDtBonus,
    ignoresLoadPenaltySkills: Array.from(ignoresLoadPenaltySkills),
    equippedVestimentaCount,
    maxVestimentas,
    vestimentaLimitExceeded: equippedVestimentaCount > maxVestimentas,
    missingSkillKits,
    curseCountsByElement,
    cursePriceByAttr,
    totalCursesCarried,
    hasFearCurse: curseCountsByElement.Medo > 0,
    effectiveProficiencies,
    nonProficientProtections,
    hasProtectionProficiencyPenalty,
  };
}
