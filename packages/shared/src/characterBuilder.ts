import {
  CharacterAbility,
  CompendiumEntryData,
  OrdemAttributes,
  OrdemOriginMeta,
  OrdemSheetData,
  PreparedAttack,
  RPGItem,
  RuleModifier,
  SceneEffect,
  T20Attributes,
  T20SheetData,
  VitalBar,
  calculateActiveBonuses,
  createDefaultOrdemSheet,
  createDefaultT20Sheet,
} from './index';
import {
  ORDEM_CLASSES,
  ORDEM_ORIGINS,
  ORDEM_PATENTS,
  ORDEM_TRAILS,
  OrdemOriginDefinition,
  T20_CLASSES,
  T20_ORIGINS,
  T20_RACES,
} from './wizardData';
import {
  findOrdemRitualDef,
  getOrdemCircleBaseCost,
  ORDEM_RITUAL_MECHANICS,
} from './ordemRituals';
import { ORDEM_COMPENDIUM_ENTRIES } from './ordemCompendiumData';
import { applyGeneralPowerSkillGrants } from './sahRules';
import {
  isOrdemCompendiumItemParanormal,
  isOrdemItemWeaponEntry,
  inferOrdemItemKind,
} from './ordemEquipmentData';

export interface OrdemVitalsCalcInput {
  characterClass: OrdemSheetData['characterClass'];
  attributes: OrdemAttributes;
  nex: number;
  originIdOrName?: string;
  transcendedCount?: number;
}

export function calculateOrdemBaseVitals(input: OrdemVitalsCalcInput): {
  pvMax: number;
  peMax: number;
  sanMax: number;
} {
  const cls =
    ORDEM_CLASSES.find((c) => c.id === input.characterClass) || ORDEM_CLASSES[0];
  const normOrigin = (input.originIdOrName || '').trim().toLowerCase();
  const origin = ORDEM_ORIGINS.find(
    (o) => o.id === normOrigin || o.name.toLowerCase() === normOrigin
  );

  const totalSteps =
    input.nex <= 5 ? 1 : input.nex === 99 ? 20 : Math.max(1, Math.floor(input.nex / 5));
  const nexStepsAfterFirst = Math.max(0, totalSteps - 1);

  const pvBase =
    cls.basePv +
    input.attributes.vig +
    nexStepsAfterFirst * (cls.pvPerNex + input.attributes.vig);

  const oddNexThresholds = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 99];
  const universitarioBonusPe = origin?.extraPeOddNex
    ? oddNexThresholds.filter((t) => input.nex >= t).length
    : 0;

  const peBase =
    cls.basePe +
    input.attributes.pre +
    nexStepsAfterFirst * (cls.pePerNex + input.attributes.pre) +
    universitarioBonusPe;

  const initialSan = origin?.halvesInitialSanity
    ? Math.floor(cls.baseSan / 2)
    : cls.baseSan;
  const effectiveSanSteps = Math.max(
    0,
    nexStepsAfterFirst - (input.transcendedCount || 0)
  );
  const sanBase = initialSan + effectiveSanSteps * cls.sanPerNex;

  return {
    pvMax: Math.max(1, pvBase),
    peMax: Math.max(1, peBase),
    sanMax: Math.max(1, sanBase),
  };
}

export function getOrdemPeLimit(
  nex: number,
  originIdOrName?: string,
  abilities?: CharacterAbility[]
): number {
  const baseLimit =
    nex <= 0 ? 1 : nex === 99 ? 20 : Math.max(1, Math.floor(nex / 5));
  const normOrigin = (originIdOrName || '').trim().toLowerCase();
  const origin = ORDEM_ORIGINS.find(
    (o) => o.id === normOrigin || o.name.toLowerCase() === normOrigin
  );
  const originBonus = origin?.extraPeLimit ? 1 : 0;
  const encararAb = (abilities || []).find(
    (a) =>
      a.isActive !== false &&
      a.name.toLowerCase().includes('encarar a morte')
  );
  const encararMorteBonus = encararAb
    ? encararAb.hasAffinityUpgrade || encararAb.name.toLowerCase().includes('afinidade')
      ? 3
      : 1
    : 0;

  return baseLimit + originBonus + encararMorteBonus;
}

export function getOrdemRitualPeLimit(
  nex: number,
  originIdOrName?: string,
  abilities?: CharacterAbility[],
  effectivePre = 0,
  trailId?: string
): number {
  const base = getOrdemPeLimit(nex, originIdOrName, abilities);
  const hasPresencaPoderosa =
    (trailId === 'intuitivo' && nex >= 40) ||
    (abilities || []).some(
      (a) =>
        a.isActive !== false &&
        (a.id === 'trail-intuitivo-40' ||
          a.name.toLowerCase().includes('presença poderosa') ||
          a.name.toLowerCase().includes('presenca poderosa'))
    );
  return hasPresencaPoderosa ? base + Math.max(0, effectivePre) : base;
}

export function getOrdemRitualDT(
  nex: number,
  effectivePre: number,
  trailId?: string,
  abilities?: CharacterAbility[],
  _originIdOrName?: string,
  ritualElement?: string,
  sceneEffects?: SceneEffect[]
): number {
  // Livro v1.3, p. 21 e p. 115: Universitário (Dedicação), Encarar a Morte e Presença Poderosa NÃO afetam a DT!
  const peLimitForDt =
    nex <= 0 ? 1 : nex === 99 ? 20 : Math.max(1, Math.floor(nex / 5));
  const graduadoBonus =
    (trailId === 'graduado' && nex >= 65) ||
    (abilities || []).some(
      (a) =>
        a.isActive !== false &&
        a.name.toLowerCase().includes('rituais eficientes')
    )
      ? 5
      : 0;
  const especialistaBonus = (abilities || []).some((a) => {
    if (a.isActive === false) return false;
    if (!a.name.toLowerCase().includes('especialista em elemento')) return false;
    if (!ritualElement || !a.chosenElement) return true;
    return ritualElement.toLowerCase().includes(a.chosenElement.toLowerCase());
  })
    ? 2
    : 0;
  const cinerariaBonus = (sceneEffects || []).some(
    (ef) =>
      (ef.name || '').toLowerCase().includes('cinerária') ||
      (ef.name || '').toLowerCase().includes('cineraria')
  )
    ? 5
    : 0;
  return 10 + peLimitForDt + effectivePre + graduadoBonus + especialistaBonus + cinerariaBonus;
}

export function getOrdemEffectiveCredit(
  patentName: string,
  _originIdOrName?: string
): string {
  const pat = ORDEM_PATENTS.find(
    (p) => p.name.toLowerCase() === (patentName || '').toLowerCase()
  );
  return pat?.creditLimit || (patentName === 'Mundano' ? 'Baixo' : 'Baixo');
}

export function boostCritRangeBySteps(critRange: string, steps: number): string {
  if (!steps || steps <= 0) return critRange;
  const clean = (critRange || '20/x2').trim();
  const match = clean.match(/^(\d+)\s*\/\s*(x\d+)$/i);
  if (match) {
    const newThreat = Math.max(2, Number(match[1]) - steps);
    return `${newThreat}/${match[2]}`;
  }
  const multOnly = clean.match(/^(x\d+)$/i);
  if (multOnly) {
    const newThreat = Math.max(2, 20 - steps);
    return `${newThreat}/${multOnly[1]}`;
  }
  return clean;
}

export function boostCritMultiplier(critRange: string, extraMult: number): string {
  if (!extraMult || extraMult <= 0) return critRange;
  const clean = (critRange || '20/x2').trim();
  const match = clean.match(/^(\d+)\s*\/\s*x(\d+)$/i);
  if (match) {
    return `${match[1]}/x${Number(match[2]) + extraMult}`;
  }
  const multOnly = clean.match(/^x(\d+)$/i);
  if (multOnly) {
    return `20/x${Number(multOnly[1]) + extraMult}`;
  }
  return clean;
}

export function parseCritRange(critRange: string): {
  threatMin: number;
  multiplier: number;
} {
  const clean = (critRange || '20/x2').trim();
  const bothMatch = clean.match(/^(\d+)\s*\/\s*x(\d+)$/i);
  if (bothMatch) {
    return {
      threatMin: Math.max(1, Math.min(20, Number(bothMatch[1]))),
      multiplier: Math.max(2, Number(bothMatch[2])),
    };
  }
  const multOnly = clean.match(/^x(\d+)$/i);
  if (multOnly) {
    return {
      threatMin: 20,
      multiplier: Math.max(2, Number(multOnly[1])),
    };
  }
  const threatOnly = clean.match(/^(\d+)$/);
  if (threatOnly) {
    return {
      threatMin: Math.max(1, Math.min(20, Number(threatOnly[1]))),
      multiplier: 2,
    };
  }
  return { threatMin: 20, multiplier: 2 };
}

export interface AtaqueEspecialTier {
  peCost: number;
  totalBonus: number; // 5, 10, 15 ou 20
  minNex: number;
}

export function getOrdemAtaqueEspecialTiers(nex: number): AtaqueEspecialTier[] {
  const all: AtaqueEspecialTier[] = [
    { peCost: 2, totalBonus: 5, minNex: 5 },
    { peCost: 3, totalBonus: 10, minNex: 25 },
    { peCost: 4, totalBonus: 15, minNex: 55 },
    { peCost: 5, totalBonus: 20, minNex: 85 },
  ];
  return all.filter((t) => nex >= t.minNex);
}

export function getOrdemAtaqueEspecialMaxTier(nex: number): AtaqueEspecialTier {
  const tiers = getOrdemAtaqueEspecialTiers(nex);
  return tiers[tiers.length - 1] || { peCost: 2, totalBonus: 5, minNex: 5 };
}

export function getOrdemMaxLoad(
  effectiveFor: number,
  effectiveInt: number,
  trailId?: string,
  nex?: number,
  bonusSlots = 0,
  abilities?: CharacterAbility[]
): number {
  const hasInventarioOtimizado =
    (trailId === 'tecnico' && (nex ?? 5) >= 10) ||
    Boolean(
      abilities?.some(
        (ab) =>
          ab.id === 'trail-tecnico-10' ||
          ab.id === 'versatility-tecnico-10' ||
          ab.name.toLowerCase().includes('inventário otimizado') ||
          ab.name.toLowerCase().includes('inventario otimizado')
      )
    );
  const attrTotal = hasInventarioOtimizado ? effectiveFor + effectiveInt : effectiveFor;
  const baseSlots = attrTotal <= 0 ? 2 : attrTotal * 5;
  return Math.max(2, baseSlots + bonusSlots);
}

export function checkOrdemPowerRequirements(
  entry: CompendiumEntryData,
  sheetData: OrdemSheetData,
  abilities: CharacterAbility[],
  opts?: { ignoreClass?: boolean }
): { met: boolean; missing: string[] } {
  const reqText = entry.metadata?.requirements?.trim();
  if (!reqText) return { met: true, missing: [] };

  const missing: string[] = [];
  const lowerReq = reqText.toLowerCase();

  // 1. Classe (Especialista Diletante aprende poderes de outra classe ignorando este item)
  if (opts?.ignoreClass) {
    // nada
  } else if (lowerReq.includes('combatente ou especialista')) {
    if (
      sheetData.characterClass !== 'combatente' &&
      sheetData.characterClass !== 'especialista'
    ) {
      missing.push('Classe: Combatente ou Especialista');
    }
  } else {
    if (lowerReq.includes('combatente') && sheetData.characterClass !== 'combatente') {
      missing.push('Classe: Combatente');
    }
    if (lowerReq.includes('especialista') && sheetData.characterClass !== 'especialista') {
      missing.push('Classe: Especialista');
    }
    if (lowerReq.includes('ocultista') && sheetData.characterClass !== 'ocultista') {
      missing.push('Classe: Ocultista');
    }
  }

  // 2. NEX mínimo (ex: "NEX 30%", "NEX 45%", "NEX 60%")
  const nexMatch = reqText.match(/NEX\s*(\d+)%/i);
  if (nexMatch) {
    const requiredNex = Number(nexMatch[1]);
    if ((sheetData.nex || 5) < requiredNex) {
      missing.push(`NEX ${requiredNex}%`);
    }
  }

  // 3. Atributos (For 2, Agi 3, Int 2, Pre 2, Vig 2)
  const attrChecks: Array<{ regex: RegExp; key: keyof OrdemAttributes; label: string }> = [
    { regex: /\bFor\s*(\d+)/i, key: 'for', label: 'FOR' },
    { regex: /\bAgi\s*(\d+)/i, key: 'agi', label: 'AGI' },
    { regex: /\bInt\s*(\d+)/i, key: 'int', label: 'INT' },
    { regex: /\bPre\s*(\d+)/i, key: 'pre', label: 'PRE' },
    { regex: /\bVig\s*(\d+)/i, key: 'vig', label: 'VIG' },
  ];
  for (const check of attrChecks) {
    const match = reqText.match(check.regex);
    if (match) {
      const reqVal = Number(match[1]);
      if ((sheetData.attributes[check.key] || 0) < reqVal) {
        missing.push(`${check.label} ${reqVal}`);
      }
    }
  }

  // 4. Perícias treinadas
  const skillChecks: Array<{ token: string; skillId: string; label: string }> = [
    { token: 'luta', skillId: 'luta', label: 'Treinado em Luta' },
    { token: 'pontaria', skillId: 'pontaria', label: 'Treinado em Pontaria' },
    { token: 'iniciativa', skillId: 'iniciativa', label: 'Treinado em Iniciativa' },
    { token: 'crime', skillId: 'crime', label: 'Treinado em Crime' },
    { token: 'tecnologia', skillId: 'tecnologia', label: 'Treinado em Tecnologia' },
    { token: 'atletismo', skillId: 'atletismo', label: 'Treinado em Atletismo' },
    { token: 'percepção', skillId: 'percepcao', label: 'Treinado em Percepção' },
    { token: 'tática', skillId: 'tatica', label: 'Treinado em Tática' },
    { token: 'furtividade', skillId: 'furtividade', label: 'Treinado em Furtividade' },
    { token: 'pilotagem', skillId: 'pilotagem', label: 'Treinado em Pilotagem' },
    { token: 'intimidação', skillId: 'intimidacao', label: 'Treinado em Intimidação' },
    { token: 'intuição', skillId: 'intuicao', label: 'Treinado em Intuição' },
    { token: 'intuicao', skillId: 'intuicao', label: 'Treinado em Intuição' },
    { token: 'ocultismo', skillId: 'ocultismo', label: 'Treinado em Ocultismo' },
    { token: 'enganação', skillId: 'enganacao', label: 'Treinado em Enganação' },
    { token: 'investigação', skillId: 'investigacao', label: 'Treinado em Investigação' },
    { token: 'vontade', skillId: 'vontade', label: 'Treinado em Vontade' },
    { token: 'diplomacia', skillId: 'diplomacia', label: 'Treinado em Diplomacia' },
  ];
  if (lowerReq.includes('treinado')) {
    if (lowerReq.includes('luta ou pontaria')) {
      const lutaSk = sheetData.skills.find((s) => s.id === 'luta');
      const pontSk = sheetData.skills.find((s) => s.id === 'pontaria');
      if ((!lutaSk || lutaSk.trainingDegree < 5) && (!pontSk || pontSk.trainingDegree < 5)) {
        missing.push('Treinado em Luta ou Pontaria');
      }
    }
    for (const sc of skillChecks) {
      if (lowerReq.includes('luta ou pontaria') && (sc.skillId === 'luta' || sc.skillId === 'pontaria')) {
        continue;
      }
      if (lowerReq.includes(sc.token)) {
        const sk = sheetData.skills.find((s) => s.id === sc.skillId);
        if (!sk || sk.trainingDegree < 5) {
          missing.push(sc.label);
        }
      }
    }
  }

  // 5. Poderes prévios
  const powerPrereqs = [
    'Proteção Pesada',
    'Armamento Pesado',
    'Especialista em Elemento',
    'Camuflar Ocultismo',
  ];
  for (const pName of powerPrereqs) {
    if (lowerReq.includes(pName.toLowerCase())) {
      const hasIt = abilities.some((a) =>
        a.name.toLowerCase().includes(pName.toLowerCase())
      );
      if (!hasIt) {
        missing.push(`Poder: ${pName}`);
      }
    }
  }

  // 6. Pré-requisitos de Elemento Paranormal (ex: "Sangue 1", "Morte 2", "Conhecimento 1", "Energia 1")
  const elementChecks: Array<{ regex: RegExp; element: string }> = [
    { regex: /\bSangue\s*(\d+)/i, element: 'Sangue' },
    { regex: /\bMorte\s*(\d+)/i, element: 'Morte' },
    { regex: /\bConhecimento\s*(\d+)/i, element: 'Conhecimento' },
    { regex: /\bEnergia\s*(\d+)/i, element: 'Energia' },
  ];
  for (const elCheck of elementChecks) {
    const match = reqText.match(elCheck.regex);
    if (match) {
      const requiredCount = Number(match[1]);
      // Conta poderes paranormais (incluindo Aprender Ritual / Resistir a Elemento) daquele elemento que o personagem já possui
      const ownedCount = abilities.filter((ab) => {
        const cleanAbName = ab.name.replace(/\s*\(afinidade\)$/i, '').trim().toLowerCase();
        const compMatch = ORDEM_COMPENDIUM_ENTRIES.find(
          (ce) => ce.name.toLowerCase() === cleanAbName || ce.name.toLowerCase() === ab.name.toLowerCase()
        );
        const isParanormal =
          ab.category === 'poder_paranormal' || compMatch?.category === 'paranormal_power';
        if (!isParanormal) return false;
        const abElement = ab.chosenElement || ab.element || compMatch?.metadata?.element || '';
        return abElement.toLowerCase().includes(elCheck.element.toLowerCase());
      }).length;
      if (ownedCount < requiredCount) {
        missing.push(`${elCheck.element} ${requiredCount} (possui ${ownedCount})`);
      }
    }
  }

  return {
    met: missing.length === 0,
    missing,
  };
}

export function getOrdemClassMilestoneSummary(
  characterClass: OrdemSheetData['characterClass'],
  nex: number,
  trailId?: string
): string {
  const trailObj = ORDEM_TRAILS.find((t) => t.id === trailId);
  const trailPowerAtNex = trailObj?.powers.find((p) => p.nex === nex);

  const classLabel =
    characterClass === 'combatente'
      ? 'Combatente'
      : characterClass === 'especialista'
      ? 'Especialista'
      : characterClass === 'ocultista'
      ? 'Ocultista'
      : 'Mundano';

  switch (nex) {
    case 5:
      if (characterClass === 'combatente')
        return 'Recruta Combatente • Habilidade inicial: Ataque Especial (2 PE, +5 no ataque ou dano)';
      if (characterClass === 'especialista')
        return 'Recruta Especialista • Habilidades iniciais: Eclético e Perito (2 PE, +1d6)';
      if (characterClass === 'ocultista')
        return 'Recruta Ocultista • Escolhido pelo Outro Lado (1º Círculo, 3 rituais iniciais)';
      return 'Agente Recruta da Ordo Realitas (NEX 5%)';
    case 10:
      return trailObj
        ? `Habilidade de Trilha (10% — ${trailObj.name}): ${trailPowerAtNex?.name || ''}`
        : `Escolha de Trilha de ${classLabel} + 1º Poder da Trilha (10%)`;
    case 15:
    case 30:
    case 45:
    case 60:
    case 90:
      return `Poder de ${classLabel} (ou Transcender para Poder Paranormal)${
        characterClass === 'ocultista' ? ' + 1 Novo Ritual' : ''
      }`;
    case 20:
    case 80:
    case 95:
      return `Aumento de Atributo (+1 ponto, máx. 5)${
        characterClass === 'ocultista' ? ' + 1 Novo Ritual' : ''
      }`;
    case 25:
      if (characterClass === 'combatente')
        return 'Aprimoramento de Ataque Especial (3 PE para +10 no ataque ou dano)';
      if (characterClass === 'especialista')
        return 'Aprimoramento de Perito (3 PE para somar +1d8 nas perícias escolhidas)';
      if (characterClass === 'ocultista')
        return 'Escolhido pelo Outro Lado: Desbloqueia Rituais de 2º Círculo + 1 Novo Ritual';
      return 'Evolução de Habilidade Principal da Classe (NEX 25%)';
    case 35: {
      const cls = ORDEM_CLASSES.find((c) => c.id === characterClass);
      const baseUp = cls?.trainingUpgradeBase ?? 2;
      return `Grau de Treinamento: Aprimore ${baseUp} + Intelecto perícias treinadas para Veterano (+10)${
        characterClass === 'ocultista' ? ' + 1 Novo Ritual' : ''
      }`;
    }
    case 40:
      if (characterClass === 'especialista') {
        return `2º Poder da Trilha (40%${trailPowerAtNex ? `: ${trailPowerAtNex.name}` : ''}) + Engenhosidade (Veterano no Eclético)`;
      }
      return `2º Poder da Trilha (40%${trailPowerAtNex ? `: ${trailPowerAtNex.name}` : ''})${
        characterClass === 'ocultista' ? ' + 1 Novo Ritual' : ''
      }`;
    case 50:
      return `Aumento de Atributo (+1) + Versatilidade (Poder de Trilha 10% ou Poder de ${classLabel}) + Afinidade Elemental${
        characterClass === 'ocultista' ? ' + 1 Novo Ritual' : ''
      }`;
    case 55:
      if (characterClass === 'combatente')
        return 'Aprimoramento de Ataque Especial (4 PE para +15 no ataque ou dano)';
      if (characterClass === 'especialista')
        return 'Aprimoramento de Perito (4 PE para somar +1d10 nas perícias escolhidas)';
      if (characterClass === 'ocultista')
        return 'Escolhido pelo Outro Lado: Desbloqueia Rituais de 3º Círculo + 1 Novo Ritual';
      return 'Evolução de Habilidade Principal da Classe (NEX 55%)';
    case 65:
      return `3º Poder da Trilha (65%${trailPowerAtNex ? `: ${trailPowerAtNex.name}` : ''})${
        characterClass === 'ocultista' ? ' + 1 Novo Ritual' : ''
      }`;
    case 70: {
      const cls = ORDEM_CLASSES.find((c) => c.id === characterClass);
      const baseUp = cls?.trainingUpgradeBase ?? 2;
      return `Grau de Treinamento: Aprimore ${baseUp} + Intelecto perícias veteranas para Expert (+15)${
        characterClass === 'ocultista' ? ' + 1 Novo Ritual' : ''
      }`;
    }
    case 75:
      if (characterClass === 'especialista') {
        return `Poder de Especialista (ou Transcender) + Engenhosidade (Expert no Eclético)`;
      }
      return `Poder de ${classLabel} (ou Transcender para Poder Paranormal)${
        characterClass === 'ocultista' ? ' + 1 Novo Ritual' : ''
      }`;
    case 85:
      if (characterClass === 'combatente')
        return 'Aprimoramento Supremo de Ataque Especial (5 PE para +20 no ataque ou dano)';
      if (characterClass === 'especialista')
        return 'Aprimoramento Supremo de Perito (5 PE para somar +1d12 nas perícias escolhidas)';
      if (characterClass === 'ocultista')
        return 'Escolhido pelo Outro Lado: Desbloqueia Rituais de 4º Círculo + 1 Novo Ritual';
      return 'Evolução de Habilidade Principal da Classe (NEX 85%)';
    case 99:
      return `4º Poder Supremo da Trilha (99%${trailPowerAtNex ? `: ${trailPowerAtNex.name}` : ''})${
        characterClass === 'ocultista' ? ' + 1 Novo Ritual' : ''
      }`;
    default:
      return `Evolução de Exposição Paranormal (NEX ${nex}%)`;
  }
}

export interface OrdemRitualCastForm {
  mode: 'normal' | 'discente' | 'verdadeiro';
  label: string;
  extraCost: number;
  totalCost: number;
  requiredCircle: number;
  requiresAffinity: boolean;
  description: string;
  damageFormula?: string;
  healingFormula?: string;
  tempHpFormula?: string;
  tempHpFlat?: number;
  sceneDefenseBonus?: number;
  sceneModifiers?: RuleModifier[];
  weaponExtraDice?: string;
  weaponCritThreatSteps?: number;
  weaponCritMultiplierBoost?: number;
  isPersonalSelf?: boolean;
  element?: string;
  execution?: string;
  range?: string;
  target?: string;
  duration?: string;
  resistance?: string;
}

export function parseOrdemRitualForms(
  ritualName: string,
  ritualDescription: string,
  baseCost: number,
  baseDamageFormula?: string,
  options?: {
    ritualId?: string;
    element?: string;
    isFavoriteRitual?: boolean;
    abilities?: CharacterAbility[];
    extraPeCost?: number;
    sceneEffects?: SceneEffect[];
  }
): OrdemRitualCastForm[] {
  const lowerName = ritualName.toLowerCase();
  const def = findOrdemRitualDef(options?.ritualId) || findOrdemRitualDef(ritualName);
  const mech = def ? ORDEM_RITUAL_MECHANICS[def.id] : undefined;
  const effectiveElement = (options?.element || def?.element || '').toLowerCase();
  const abList = options?.abilities || [];

  const hasPrediletoPower = abList.some(
    (a) =>
      a.isActive !== false &&
      (a.id.includes('ritual-predileto') ||
        a.name.toLowerCase().includes('ritual predileto'))
  );
  const hasMestreElemento = abList.some((a) => {
    if (a.isActive === false) return false;
    if (
      !a.id.includes('mestre-elemento') &&
      !a.name.toLowerCase().includes('mestre em elemento')
    ) {
      return false;
    }
    if (!a.chosenElement) return true;
    return effectiveElement.includes(a.chosenElement.toLowerCase());
  });
  const hasTatuagemRitualistica = abList.some(
    (a) =>
      a.isActive !== false &&
      (a.id.includes('tatuagem-ritualistica') ||
        a.name.toLowerCase().includes('tatuagem ritualística') ||
        a.name.toLowerCase().includes('tatuagem ritualistica'))
  );

  const hasCinerariaCostReduction = (options?.sceneEffects || []).some((ef) => {
    const nm = (ef.name || '').toLowerCase();
    if (!nm.includes('cinerária') && !nm.includes('cineraria')) return false;
    const txt = `${ef.source || ''} ${ef.description || ''}`.toLowerCase();
    return txt.includes('discente') || txt.includes('verdadeiro') || txt.includes('-2 pe') || txt.includes('–2 pe');
  });

  const sharedReduction =
    (options?.isFavoriteRitual && hasPrediletoPower ? 1 : 0) +
    (hasMestreElemento ? 1 : 0) +
    (hasCinerariaCostReduction ? 2 : 0);

  function computeFormTotalCost(rawCost: number, isPersonalSelf?: boolean): number {
    const tatRed = hasTatuagemRitualistica && isPersonalSelf ? 1 : 0;
    const reduced = Math.max(1, rawCost - sharedReduction - tatRed);
    return reduced + (options?.extraPeCost || 0);
  }

  function resolveVariantDuration(
    baseDuration: string,
    variantText?: string,
    inheritDuration?: string
  ): string {
    if (!variantText) return baseDuration;
    const durMatch = variantText.match(
      /muda\s+(?:[^.]*?\s+e\s+)?a\s+dura[çc][ãa]o\s+para\s+[“"']?([^.”"'\n,;]+)[”"']?/i
    );
    if (durMatch) {
      return durMatch[1].trim();
    }
    if (inheritDuration && /como\s+(?:em\s+|a\s+vers[ãa]o\s+)?discente/i.test(variantText)) {
      return inheritDuration;
    }
    return baseDuration;
  }

  if (def) {
    const rawBaseCost = getOrdemCircleBaseCost(def.circle);
    const defaultPersonal =
      def.range.toLowerCase() === 'pessoal' &&
      def.target.toLowerCase().includes('você');

    const normMech = mech?.normal;
    const normPersonal = normMech?.isPersonalSelf ?? defaultPersonal;

    const forms: OrdemRitualCastForm[] = [
      {
        mode: 'normal',
        label: 'Normal',
        extraCost: 0,
        totalCost: computeFormTotalCost(rawBaseCost, normPersonal),
        requiredCircle: def.circle,
        requiresAffinity: false,
        description: def.description,
        damageFormula: normMech?.damageFormula,
        healingFormula: normMech?.healingFormula,
        tempHpFormula: normMech?.tempHpFormula,
        tempHpFlat: normMech?.tempHpFlat,
        sceneDefenseBonus: normMech?.sceneDefenseBonus,
        sceneModifiers: normMech?.sceneModifiers,
        weaponExtraDice: normMech?.weaponExtraDice,
        weaponCritThreatSteps: normMech?.weaponCritThreatSteps,
        weaponCritMultiplierBoost: normMech?.weaponCritMultiplierBoost,
        isPersonalSelf: normPersonal,
        element: options?.element || def.element,
        execution: def.execution,
        range: def.range,
        target: `${def.targetLabel}: ${def.target}`,
        duration: def.duration,
        resistance: def.resistance,
      },
    ];

    const discenteDuration = def.discente
      ? resolveVariantDuration(def.duration, def.discente.text)
      : def.duration;

    if (def.discente) {
      const dm = mech?.discente;
      const dPersonal = dm?.isPersonalSelf ?? false;
      forms.push({
        mode: 'discente',
        label: 'Discente',
        extraCost: def.discente.extraCost,
        totalCost: computeFormTotalCost(
          rawBaseCost + def.discente.extraCost,
          dPersonal
        ),
        requiredCircle: def.discente.requiredCircle,
        requiresAffinity: def.discente.requiresAffinity,
        description: def.discente.text,
        damageFormula: dm?.damageFormula,
        healingFormula: dm?.healingFormula,
        tempHpFormula: dm?.tempHpFormula,
        tempHpFlat: dm?.tempHpFlat,
        sceneDefenseBonus: dm?.sceneDefenseBonus,
        sceneModifiers: dm?.sceneModifiers,
        weaponExtraDice: dm?.weaponExtraDice,
        weaponCritThreatSteps: dm?.weaponCritThreatSteps,
        weaponCritMultiplierBoost: dm?.weaponCritMultiplierBoost,
        isPersonalSelf: dPersonal,
        element: options?.element || def.element,
        execution: def.execution,
        range: def.range,
        target: `${def.targetLabel}: ${def.target}`,
        duration: discenteDuration,
        resistance: def.resistance,
      });
    }

    if (def.verdadeiro) {
      const vm = mech?.verdadeiro;
      const vPersonal = vm?.isPersonalSelf ?? false;
      const verdadeiroDuration = resolveVariantDuration(
        def.duration,
        def.verdadeiro.text,
        discenteDuration
      );
      forms.push({
        mode: 'verdadeiro',
        label: 'Verdadeiro',
        extraCost: def.verdadeiro.extraCost,
        totalCost: computeFormTotalCost(
          rawBaseCost + def.verdadeiro.extraCost,
          vPersonal
        ),
        requiredCircle: def.verdadeiro.requiredCircle,
        requiresAffinity: def.verdadeiro.requiresAffinity,
        description: def.verdadeiro.text,
        damageFormula: vm?.damageFormula,
        healingFormula: vm?.healingFormula,
        tempHpFormula: vm?.tempHpFormula,
        tempHpFlat: vm?.tempHpFlat,
        sceneDefenseBonus: vm?.sceneDefenseBonus,
        sceneModifiers: vm?.sceneModifiers,
        weaponExtraDice: vm?.weaponExtraDice,
        weaponCritThreatSteps: vm?.weaponCritThreatSteps,
        weaponCritMultiplierBoost: vm?.weaponCritMultiplierBoost,
        isPersonalSelf: vPersonal,
        element: options?.element || def.element,
        execution: def.execution,
        range: def.range,
        target: `${def.targetLabel}: ${def.target}`,
        duration: verdadeiroDuration,
        resistance: def.resistance,
      });
    }

    return forms;
  }

  // Fallback para rituais customizados criados manualmente pelo usuário
  const baseCircle =
    baseCost >= 10 ? 4 : baseCost >= 6 ? 3 : baseCost >= 3 ? 2 : 1;

  const discIdx = ritualDescription.search(/Discente\s*\(/i);
  const verdIdx = ritualDescription.search(/Verdadeiro\s*\(/i);

  const normalText =
    discIdx >= 0
      ? ritualDescription.slice(0, discIdx).trim()
      : verdIdx >= 0
      ? ritualDescription.slice(0, verdIdx).trim()
      : ritualDescription.trim();

  const discText =
    discIdx >= 0
      ? ritualDescription
          .slice(discIdx, verdIdx >= 0 ? verdIdx : ritualDescription.length)
          .trim()
      : '';

  const verdText =
    verdIdx >= 0 ? ritualDescription.slice(verdIdx).trim() : '';

  const isTempHpRitual =
    lowerName.includes('consumir manancial') ||
    lowerName.includes('tela de ruído');
  const isAmaldicoarArma = lowerName.includes('amaldiçoar arma');

  const forms: OrdemRitualCastForm[] = [
    {
      mode: 'normal',
      label: 'Normal',
      extraCost: 0,
      totalCost: computeFormTotalCost(Math.max(1, baseCost), false),
      requiredCircle: baseCircle,
      requiresAffinity: false,
      description: normalText,
      damageFormula: isTempHpRitual || isAmaldicoarArma ? undefined : baseDamageFormula,
      tempHpFormula: lowerName.includes('consumir manancial') ? '3d6' : undefined,
      tempHpFlat: lowerName.includes('tela de ruído') ? 30 : undefined,
      sceneDefenseBonus: lowerName.includes('armadura de sangue')
        ? 5
        : lowerName.includes('embaralhar')
        ? 6
        : undefined,
      element: options?.element,
    },
  ];

  function extractFormDetails(
    mode: 'discente' | 'verdadeiro',
    rawSegment: string
  ): OrdemRitualCastForm | null {
    if (!rawSegment) return null;
    const headerMatch = rawSegment.match(
      /^(?:Discente|Verdadeiro)\s*\(([^)]+)\)\s*:\s*(.*)$/i
    );
    const metaStr = headerMatch ? headerMatch[1] : '';
    const effectDesc = headerMatch ? headerMatch[2] : rawSegment;

    const costMatch = metaStr.match(/\+\s*(\d+)\s*PE/i);
    const extraCost = costMatch ? Number(costMatch[1]) : mode === 'discente' ? 2 : 5;

    const circleMatch =
      metaStr.match(/(\d+)º\s*círc/i) || effectDesc.match(/requer\s*(\d+)º\s*círc/i);
    let requiredCircle = circleMatch ? Number(circleMatch[1]) : baseCircle;

    if (!circleMatch) {
      if (lowerName.includes('armadura de sangue')) {
        requiredCircle = mode === 'discente' ? 3 : 4;
      } else if (lowerName.includes('cicatrização')) {
        requiredCircle = mode === 'discente' ? 2 : 4;
      } else if (baseCircle === 1) {
        if (extraCost >= 9) requiredCircle = 4;
        else if (extraCost >= 5) requiredCircle = 3;
        else if (extraCost >= 2 && mode === 'verdadeiro') requiredCircle = 3;
      }
    }

    const requiresAffinity =
      metaStr.toLowerCase().includes('afinidade') ||
      effectDesc.toLowerCase().includes('requer afinidade') ||
      (lowerName.includes('armadura de sangue') && mode === 'verdadeiro');

    const diceMatch = effectDesc.match(/(\d+d\d+(?:[+-]\d+)?)/i);
    const extractedFormula = diceMatch ? diceMatch[1] : baseDamageFormula;

    let tempHpFormula: string | undefined;
    let tempHpFlat: number | undefined;
    let sceneDefenseBonus: number | undefined;

    if (lowerName.includes('consumir manancial')) {
      tempHpFormula = extractedFormula || (mode === 'discente' ? '6d6' : '10d6');
    } else if (lowerName.includes('tela de ruído')) {
      tempHpFlat = mode === 'discente' ? 60 : undefined;
    }

    if (lowerName.includes('armadura de sangue')) {
      sceneDefenseBonus = mode === 'discente' ? 10 : 15;
    } else if (lowerName.includes('embaralhar')) {
      sceneDefenseBonus = mode === 'discente' ? 10 : 16;
    }

    return {
      mode,
      label: mode === 'discente' ? 'Discente' : 'Verdadeiro',
      extraCost,
      totalCost: computeFormTotalCost(Math.max(1, baseCost) + extraCost, false),
      requiredCircle,
      requiresAffinity,
      description: effectDesc,
      damageFormula: isTempHpRitual || isAmaldicoarArma ? undefined : extractedFormula,
      tempHpFormula,
      tempHpFlat,
      sceneDefenseBonus,
      element: options?.element,
    };
  }

  const discForm = extractFormDetails('discente', discText);
  if (discForm) forms.push(discForm);

  const verdForm = extractFormDetails('verdadeiro', verdText);
  if (verdForm) forms.push(verdForm);

  return forms;
}

export function buildOrdemOriginModifiers(
  origin: OrdemOriginDefinition,
  originMeta?: OrdemOriginMeta
): RuleModifier[] {
  const baseMods = [...(origin.modifiers || [])];

  if (origin.id === 'amigo_animais') {
    if (!originMeta?.amigoAnimaisDead && originMeta?.amigoAnimaisSkillId) {
      baseMods.push({
        id: 'orig-choice-amigo-animais',
        targetType: 'skill_bonus',
        targetKey: originMeta.amigoAnimaisSkillId,
        value: 2,
      });
    }
    return baseMods;
  }

  if (origin.id === 'experimento') {
    const chosenPhys = originMeta?.experimentoSkillId || 'atletismo';
    baseMods.push({
      id: 'orig-choice-experimento',
      targetType: 'skill_bonus',
      targetKey: chosenPhys,
      value: 2,
    });
    return baseMods;
  }

  if (origin.id === 'colegial') {
    if (originMeta?.bestFriendDead) {
      return [
        {
          id: 'orig-colegial-grief',
          targetType: 'vital_max',
          targetKey: 'pe',
          value: -1,
          scaleWithLevel: true,
        },
      ];
    }
    return baseMods;
  }

  return baseMods;
}

/** Habilidade do poder de uma origem (origem principal ou recebida por Flashback). */
export function buildOrdemOriginAbility(
  origin: OrdemOriginDefinition,
  originMeta?: OrdemOriginMeta,
  grantedBy?: string
): CharacterAbility {
  return {
    id: `orig-${origin.id}`,
    name: `${origin.powerName} (Poder de ${origin.name})`,
    category: 'origem',
    cost: origin.powerCost,
    description: origin.powerDescription,
    isActive: origin.powerCost === 0 && !origin.requiresManualActivation,
    sourceId: origin.sourceId || 'ordem-base',
    ...(grantedBy ? { grantedBy } : {}),
    modifiers: buildOrdemOriginModifiers(origin, originMeta),
  };
}

/** IDs das origens cujo poder o personagem possui: a sua e a do Flashback (Especialista, SaH). */
export function getOrdemOriginIds(sheetData?: { origin?: string; originMeta?: OrdemOriginMeta } | null): string[] {
  const norm = String(sheetData?.origin || '').trim().toLowerCase();
  const main = ORDEM_ORIGINS.find((o) => o.id === norm || o.name.toLowerCase() === norm)?.id;
  const fb = sheetData?.originMeta?.flashbackOriginId;
  return [main, fb].filter((id, i, arr): id is string => Boolean(id) && arr.indexOf(id) === i);
}

/** Invento Paranormal (Inventor Paranormal, SaH): item Cat. 0 que guarda um ritual de 1º círculo. */
export function buildParanormalInventionItem(ritualChoiceId?: string): RPGItem | null {
  const chosenRitId = ritualChoiceId || 'ord-rit-amaldicoar-tecnologia';
  const [rBaseId, rChosenEl] = chosenRitId.split(':');
  const rEntry =
    ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === rBaseId && e.category === 'spell') ||
    ORDEM_COMPENDIUM_ENTRIES.find((e) => e.category === 'spell' && e.metadata?.circle === 1);
  if (!rEntry) return null;
  const baseName = rEntry.name.replace(/\s*\(1º Círculo\)/i, '');
  const ritLabel = rChosenEl ? `${baseName} — ${rChosenEl}` : baseName;
  return {
    id: 'item-invento-paranormal',
    name: `Invento Paranormal (${ritLabel})`,
    slots: 1,
    baseSlots: 1,
    quantity: 1,
    category: 0,
    baseCategory: 0,
    isEquipped: true,
    isParanormal: true,
    isParanormalInvention: true,
    jammed: false,
    dailyUses: 0,
    sourceId: 'sobrevivendo-ao-horror',
    storedRitualName: ritLabel,
    storedRitualCircle: 1,
    storedRitualCost: rEntry.cost || 1,
    storedRitualElement: rChosenEl || rEntry.metadata?.element,
    storedRitualDescription: rEntry.description,
    description: `Invento Paranormal (Cat. 0, 1 espaço): ativa o efeito básico de ${ritLabel} com teste de Profissão (engenheiro) DT 15 (+5 por ativação na missão) sem custo de PE. Se falhar, enguiça até manutenção no interlúdio.`,
  };
}

export interface BuildOrdemCharacterInput {
  originId: string;
  characterClass: 'combatente' | 'especialista' | 'ocultista' | 'mundano';
  attributes: OrdemAttributes;
  trainedSkillIds: string[];
  peritoSkillIds?: string[];
  chosenRitualIds?: string[];
  chosenParanormalPowerId?: string;
  chosenItemIds?: string[];
  chosenItems?: Array<{ id: string; quantity: number }>;
  workToolWeaponName?: string;
  favoriteToolItemId?: string;   // Engenheiro — Ferramenta Favorita
  nex?: number;
  patent?: string;
  trailId?: string;
  affinity?: string;
  chosenClassPowerIds?: string[];
  versatilityTrailId?: string;
  skillTrainingDegrees?: Record<string, 5 | 10 | 15>;
  originMeta?: OrdemOriginMeta;
  /** Monstruoso (SaH): elemento escolhido no NEX 10% */
  monstruosoElement?: string;
}

export function buildOrdemCharacter(input: BuildOrdemCharacterInput): {
  vitals: VitalBar[];
  sheetData: OrdemSheetData;
  inventory: RPGItem[];
  attacks: PreparedAttack[];
} {
  const base = createDefaultOrdemSheet();
  const origin =
    ORDEM_ORIGINS.find((o) => o.id === input.originId) || ORDEM_ORIGINS[0];
  const cls =
    ORDEM_CLASSES.find((c) => c.id === input.characterClass) || ORDEM_CLASSES[0];
  const nex = input.nex ?? cls.initialNex;
  const patent = input.patent || (cls.id === 'mundano' ? 'Mundano' : 'Recruta');

  // 1. Marcar perícias treinadas (Origem + Escolhas + Graus Veterano/Expert)
  const allTrainedSet = new Set<string>([
    ...origin.skills,
    ...input.trainedSkillIds,
  ]);
  if (cls.id === 'ocultista') {
    allTrainedSet.add('ocultismo');
    allTrainedSet.add('vontade');
  }

  const skills = base.sheetData.skills.map((sk) => {
    const isTrained = allTrainedSet.has(sk.id);
    const customDeg = input.skillTrainingDegrees?.[sk.id];
    const validDeg: 0 | 5 | 10 | 15 = !isTrained
      ? 0
      : customDeg === 15 && nex >= 70
      ? 15
      : customDeg && customDeg >= 10 && nex >= 35
      ? 10
      : 5;
    return {
      ...sk,
      trainingDegree: validDeg,
    };
  });

  // 2. Montar lista de Habilidades (Origem + Classe + Trilha + Poderes + Rituais)
  const isOriginPassive =
    origin.powerCost === 0 && !origin.requiresManualActivation;
  const finalProficiencies = [...cls.proficiencies];
  let transcendedCount = 0;

  const abilities: CharacterAbility[] = [
    { ...buildOrdemOriginAbility(origin, input.originMeta), isActive: isOriginPassive },
    ...cls.initialAbilities.map((ab, idx) => ({
      id: `cls-${cls.id}-${idx}`,
      name: ab.name,
      category: 'classe' as const,
      cost: ab.cost,
      description: ab.description,
      isActive: ab.cost === 0,
      sourceId: cls.sourceId || 'ordem-base',
      modifiers: ab.modifiers || [],
    })),
  ];

  // Se Cultista Arrependido escolheu 1 Poder Paranormal inicial
  if (origin.grantsParanormalPower && input.chosenParanormalPowerId) {
    const pEntry = ORDEM_COMPENDIUM_ENTRIES.find(
      (e) => e.id === input.chosenParanormalPowerId
    );
    if (pEntry) {
      abilities.push({
        id: `cult-${pEntry.id}`,
        name: pEntry.name,
        category: 'poder_paranormal',
        cost: pEntry.cost,
        description: pEntry.description,
        element: pEntry.metadata?.element,
        isActive: pEntry.cost === 0,
        sourceId: pEntry.metadata?.sourceId || 'ordem-base',
        modifiers: pEntry.modifiers || [],
      });
    }
  }

  const extraInventoryFromGrants: RPGItem[] = [];
  const extraAttacksFromGrants: PreparedAttack[] = [];

  // Inventor Paranormal — cria Invento Paranormal (Cat. 0, 1 espaço) com o ritual de 1º círculo escolhido
  if (origin.grantsParanormalInvention) {
    const invento = buildParanormalInventionItem(input.originMeta?.inventorRitualId);
    if (invento) extraInventoryFromGrants.push(invento);
  }

  function applyBuildPowerAutoGrants(entry: CompendiumEntryData) {
    const lowerName = entry.name.toLowerCase();
    if (
      lowerName.includes('armamento pesado') &&
      !finalProficiencies.some((p) => p.toLowerCase().includes('armas pesadas'))
    ) {
      finalProficiencies.push('Armas pesadas');
    }
    if (
      (lowerName.includes('balística avançada') ||
        lowerName.includes('balistica avancada')) &&
      !finalProficiencies.some((p) => p.toLowerCase().includes('armas táticas de fogo'))
    ) {
      finalProficiencies.push('Armas táticas de fogo');
    }
    if (
      lowerName.includes('ninja urbano') &&
      !finalProficiencies.some((p) => p.toLowerCase().includes('corpo a corpo e de disparo'))
    ) {
      finalProficiencies.push('Armas táticas corpo a corpo e de disparo');
    }
    if (
      (lowerName.includes('proteção pesada') ||
        lowerName.includes('protecao pesada')) &&
      !finalProficiencies.some(
        (p) =>
          p.toLowerCase().includes('proteções pesadas') ||
          p.toLowerCase().includes('protecoes pesadas')
      )
    ) {
      finalProficiencies.push('Proteções pesadas (e Escudos)');
    }
    if (
      lowerName.includes('mira de elite') &&
      !finalProficiencies.some((p) => p.toLowerCase().includes('balas longas'))
    ) {
      finalProficiencies.push('Armas de fogo (balas longas)');
    }
    if (
      lowerName.includes('artista marcial') &&
      !extraAttacksFromGrants.some((a) => a.isUnarmed)
    ) {
      const lutaSk = skills.find((s) => s.id === 'luta');
      const dieSides = nex >= 70 ? 10 : nex >= 35 ? 8 : 6;
      extraAttacksFromGrants.push({
        id: `atk-unarmed-${Math.random().toString(36).slice(2, 7)}`,
        name: 'Ataque Desarmado (Artista Marcial)',
        diceCount: Math.max(1, input.attributes.for, input.attributes.agi),
        attackBonus: Number(lutaSk?.trainingDegree ?? 0),
        damageFormula: `1d${dieSides}`,
        critRange: '20/x2',
        damageType: 'Impacto',
        isMelee: true,
        isFirearm: false,
        isUnarmed: true,
      });
    }
  }

  // Se tiver trilha e NEX >= 10, adiciona poderes da trilha até o NEX
  if (input.trailId && nex >= 10) {
    const trail = ORDEM_TRAILS.find((t) => t.id === input.trailId);
    if (trail) {
      for (const tp of trail.powers) {
        if (nex >= tp.nex) {
          abilities.push({
            id: `trail-${trail.id}-${tp.nex}`,
            name: `Trilha ${
              trail.id === 'monstruoso' && input.monstruosoElement ? `${trail.name} de ${input.monstruosoElement}` : trail.name
            } (${tp.nex}%): ${tp.name}`,
            category: 'classe',
            cost: tp.cost,
            description: tp.description,
            isActive: tp.cost === 0 || (tp.modifiers || []).length > 0,
            // Monstruoso (SaH): elemento escolhido na criação
            ...(trail.id === 'monstruoso' && tp.nex === 10 && input.monstruosoElement
              ? { chosenElement: input.monstruosoElement }
              : {}),
            modifiers: tp.modifiers || [],
          });
        }
      }
      if (
        trail.id === 'atirador_elite' &&
        !finalProficiencies.some((p) => p.toLowerCase().includes('balas longas'))
      ) {
        finalProficiencies.push('Armas de fogo (balas longas)');
      }
      if (trail.id === 'graduado' && nex >= 40) {
        extraInventoryFromGrants.push({
          id: 'item-grimorio-ritualistico',
          name: 'Grimório Ritualístico',
          slots: 1,
          quantity: 1,
          category: 0,
          description:
            'Grimório especial de Ocultista Graduado (40%): armazena seus rituais extras (até seu Intelecto).',
        });
      }
      if (cls.id === 'ocultista' && nex === 99) {
        const trail99Map: Record<string, string> = {
          conduite: 'ord-rit-canalizar-medo',
          flagelador: 'ord-rit-medo-tangivel',
          graduado: 'ord-rit-conhecendo-medo',
          intuitivo: 'ord-rit-presenca-medo',
          lamina_paranormal: 'ord-rit-lamina-medo',
        };
        const fearRitId = trail99Map[trail.id];
        const r99 = fearRitId
          ? ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === fearRitId)
          : undefined;
        if (r99) {
          abilities.push({
            id: `rit-nex99-${r99.id}`,
            name: r99.name,
            category: 'ritual',
            cost: r99.cost,
            element: 'Medo',
            description: r99.description,
            damageFormula: r99.metadata?.damageFormula,
            isActive: false,
            modifiers: r99.modifiers || [],
          });
        }
      }
    }
  }

  // Versatilidade (NEX 50%): 1º poder (10%) de outra trilha
  if (input.versatilityTrailId && nex >= 50) {
    const versTrail = ORDEM_TRAILS.find((t) => t.id === input.versatilityTrailId);
    const p10 = versTrail?.powers.find((p) => p.nex === 10);
    if (versTrail && p10) {
      abilities.push({
        id: `versatility-${versTrail.id}-10`,
        name: `Versatilidade (${versTrail.name} 10%): ${p10.name}`,
        category: 'classe',
        cost: p10.cost,
        description: p10.description,
        isActive: p10.cost === 0,
        modifiers: p10.modifiers || [],
      });
      if (
        versTrail.id === 'atirador_elite' &&
        !finalProficiencies.some((p) => p.toLowerCase().includes('balas longas'))
      ) {
        finalProficiencies.push('Armas de fogo (balas longas)');
      }
    }
  }

  // Poderes de Classe e Poderes Paranormais acumulados nos marcos (15%, 30%, 45%, 60%, 75%, 90%)
  if (input.chosenClassPowerIds && input.chosenClassPowerIds.length > 0) {
    for (let idx = 0; idx < input.chosenClassPowerIds.length; idx++) {
      const pId = input.chosenClassPowerIds[idx];
      const pEntry = ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === pId);
      if (!pEntry) continue;
      if (pEntry.category === 'paranormal_power') {
        transcendedCount += 1;
      }
      const requiresManualToggle =
        pEntry.id === 'ord-pwr-comb-defensivo' ||
        pEntry.id === 'ord-pwr-comb-duas-armas' ||
        pEntry.name.toLowerCase().includes('combate defensivo') ||
        pEntry.name.toLowerCase().includes('combater com duas armas');
      abilities.push({
        id: `build-pwr-${idx}-${pEntry.id}`,
        name: pEntry.name,
        sourceId: pEntry.metadata?.sourceId,
        category: pEntry.category === 'paranormal_power' ? 'poder_paranormal' : 'poder',
        cost: pEntry.cost,
        element: pEntry.metadata?.element,
        description: pEntry.description,
        isActive: pEntry.cost === 0 && !requiresManualToggle,
        modifiers: pEntry.modifiers || [],
      });
      applyBuildPowerAutoGrants(pEntry);
    }
  }

  // Se Ocultista escolheu rituais iniciais (suporta "id:Elemento" para Amaldiçoar Arma)
  if (input.chosenRitualIds && input.chosenRitualIds.length > 0) {
    for (const rawRitId of input.chosenRitualIds) {
      const [rId, chosenElement] = rawRitId.split(':');
      const rEntry = ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === rId);
      if (rEntry) {
        const isAmaldicoar = rEntry.id === 'ord-rit-amaldicoar-arma' || rEntry.name.toLowerCase().includes('amaldiçoar arma');
        const finalName = chosenElement
          ? `Amaldiçoar Arma — ${chosenElement} (1º Círculo)`
          : rEntry.name;
        const finalDesc = chosenElement
          ? `[Elemento: ${chosenElement}] ${rEntry.description}`
          : rEntry.description;
        abilities.push({
          id: chosenElement ? `rit-${rEntry.id}-${chosenElement.toLowerCase()}` : `rit-${rEntry.id}`,
          name: finalName,
          category: 'ritual',
          cost: rEntry.cost,
          element: chosenElement || rEntry.metadata?.element,
          description: finalDesc,
          damageFormula: isAmaldicoar ? undefined : rEntry.metadata?.damageFormula,
          isActive: false,
          modifiers: rEntry.modifiers || [],
        });
      }
    }
  }

  // 3. Montar Inventário Inicial e Ataques Preparados (com suporte a múltiplas unidades!)
  const inventory: RPGItem[] = [...extraInventoryFromGrants];
  const attacks: PreparedAttack[] = [...extraAttacksFromGrants];

  const normalizedItems: Array<{ id: string; quantity: number }> =
    input.chosenItems && input.chosenItems.length > 0
      ? input.chosenItems.filter((it) => it.quantity > 0)
      : (input.chosenItemIds || []).map((id) => ({ id, quantity: 1 }));

  let favToolAssigned = false;

  for (const picked of normalizedItems) {
    const itemEntry = ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === picked.id);
    if (!itemEntry) continue;

    const isWeapon = isOrdemItemWeaponEntry(itemEntry);
    const isFavTool =
      origin.id === 'engenheiro' &&
      !isWeapon &&
      !favToolAssigned &&
      input.favoriteToolItemId === itemEntry.id;
    if (isFavTool) favToolAssigned = true;

    const baseCategory = itemEntry.metadata?.categoryLevel ?? itemEntry.cost ?? 0;
    const baseSlots = itemEntry.metadata?.slots ?? 1;
    const isPara = isOrdemCompendiumItemParanormal(itemEntry);
    const isCursed = Boolean(itemEntry.metadata?.isCursedSpecial);
    const itemKind =
      itemEntry.metadata?.itemSubtype ||
      inferOrdemItemKind({
        name: itemEntry.name,
        description: itemEntry.description,
        isParanormal: isPara,
        isCursedSpecial: isCursed,
      });
    const isUtensilio =
      itemEntry.name.toLowerCase().includes('utensílio') ||
      itemEntry.name.toLowerCase().includes('utensilio');
    const isVestimenta = itemEntry.name.toLowerCase().includes('vestimenta');

    const invItem: RPGItem = {
      id: `init-item-${itemEntry.id}-${Math.random().toString(36).slice(2, 6)}`,
      name: itemEntry.name,
      slots: baseSlots,
      baseSlots,
      quantity: Math.max(1, picked.quantity),
      category: baseCategory,
      baseCategory,
      description: itemEntry.description,
      isEquipped: true,
      isParanormal: isPara,
      isCursedSpecial: isCursed,
      itemKind,
      sourceId: itemEntry.metadata?.sourceId || 'ordem-base',
      remainingCharges: itemEntry.metadata?.uses,
      accessoryConfig:
        isUtensilio || isVestimenta
          ? { accessoryType: isVestimenta ? 'vestimenta' : 'utensilio' }
          : undefined,
      isFavoriteTool: isFavTool || undefined,
      modifiers: itemEntry.modifiers || [],
    };
    inventory.push(invItem);

    // Se for arma real, cria ataque preparado automaticamente!
    if (isWeapon && itemEntry.metadata?.damageFormula) {
      const classif = classifyOrdemWeapon(
        itemEntry.name,
        itemEntry.description,
        undefined,
        itemEntry.metadata?.element
      );
      const attrVal = classif.isRanged
        ? input.attributes.agi
        : classif.isAgile
        ? Math.max(input.attributes.for, input.attributes.agi)
        : input.attributes.for;
      const matchedSkill = skills.find((s) => s.id === classif.skillId);
      const skillBonus = matchedSkill ? matchedSkill.trainingDegree : 0;

      attacks.push({
        id: `atk-${itemEntry.id}-${Math.random().toString(36).slice(2, 6)}`,
        name: itemEntry.name,
        diceCount: Math.max(1, attrVal),
        attackBonus: skillBonus,
        damageFormula: itemEntry.metadata.damageFormula,
        critRange: itemEntry.metadata.critRange || '20/x2',
        damageType:
          itemEntry.metadata?.element ||
          (classif.isFirearm ? 'Balístico' : classif.isDisparo ? 'Perfuração' : 'Impacto'),
        isMelee: classif.isMelee,
        isFirearm: classif.isFirearm,
        isDisparo: classif.isDisparo,
        linkedItemId: invItem.id,
      });
    }
  }

  // 4. Calcular barras vitais base + modificadores ativos (Calejado, Cicatrizes Psicológicas, etc.)
  const baseVitals = calculateOrdemBaseVitals({
    characterClass: cls.id,
    attributes: input.attributes,
    nex,
    originIdOrName: origin.id,
    transcendedCount,
  });

  // Poderes gerais (SaH): "treina a perícia ou, se já for treinado, +2"
  const generalGrants = applyGeneralPowerSkillGrants([], abilities, skills);
  abilities.splice(0, abilities.length, ...generalGrants.abilities);
  skills.splice(0, skills.length, ...generalGrants.skills);

  const sheetData: OrdemSheetData = {
    origin: origin.name,
    characterClass: cls.id,
    nex,
    patent,
    trail: input.trailId || undefined,
    affinity: nex >= 50 && input.affinity ? input.affinity : undefined,
    prestigePoints:
      ORDEM_PATENTS.find((p) => p.name.toLowerCase() === patent.toLowerCase())?.minPrestige ?? 0,
    peritoSkills: input.peritoSkillIds || [],
    proficiencies: finalProficiencies,
    transcendedCount,
    originMeta: input.originMeta ? { ...input.originMeta } : undefined,
    displacement: 9,
    attributes: { ...input.attributes },
    skills,
    abilities,
    activeConditions: [],
  };

  const activeBonuses = calculateActiveBonuses(
    'ordem-paranormal',
    nex,
    abilities,
    inventory,
    []
  );

  const vitals: VitalBar[] = [
    {
      id: 'pv',
      label: 'Pontos de Vida',
      current: baseVitals.pvMax + (activeBonuses.vitalMax.pv || 0),
      max: baseVitals.pvMax,
      color: '#dc2626',
    },
    {
      id: 'san',
      label: 'Sanidade',
      current: baseVitals.sanMax + (activeBonuses.vitalMax.san || 0),
      max: baseVitals.sanMax,
      color: '#2563eb',
    },
    {
      id: 'pe',
      label: 'Pontos de Esforço',
      current: baseVitals.peMax + (activeBonuses.vitalMax.pe || 0),
      max: baseVitals.peMax,
      color: '#d97706',
    },
  ];

  return { vitals, sheetData, inventory, attacks };
}

export interface BuildT20CharacterInput {
  raceId: string;
  classId: string;
  originId: string;
  deity: string;
  level?: number;
  baseAttributes: T20Attributes;
  freeChosenAttrs?: Array<keyof T20Attributes>;
  trainedSkillIds: string[];
}

export function buildT20Character(input: BuildT20CharacterInput): {
  vitals: VitalBar[];
  sheetData: T20SheetData;
  inventory: RPGItem[];
  attacks: PreparedAttack[];
} {
  const base = createDefaultT20Sheet();
  const race = T20_RACES.find((r) => r.id === input.raceId) || T20_RACES[0];
  const cls = T20_CLASSES.find((c) => c.id === input.classId) || T20_CLASSES[0];
  const originName =
    T20_ORIGINS.find((o) => o === input.originId) || T20_ORIGINS[0];

  const finalAttrs: T20Attributes = { ...input.baseAttributes };
  for (const [k, v] of Object.entries(race.attributeBonuses)) {
    const key = k as keyof T20Attributes;
    finalAttrs[key] = (finalAttrs[key] || 0) + (v || 0);
  }
  if (input.freeChosenAttrs) {
    for (const key of input.freeChosenAttrs) {
      finalAttrs[key] = (finalAttrs[key] || 0) + 1;
    }
  }

  const allTrainedSet = new Set<string>([
    ...cls.fixedSkills,
    ...input.trainedSkillIds,
  ]);

  const skills = base.sheetData.skills.map((sk) => ({
    ...sk,
    isTrained: allTrainedSet.has(sk.id),
  }));

  const level = Math.max(1, Math.min(20, Number(input.level || 1)));
  const pvMax = Math.max(
    1,
    cls.basePv +
      finalAttrs.constituicao +
      (level - 1) * (cls.pvPerLevel + finalAttrs.constituicao)
  );
  const pmMax = Math.max(1, level * cls.pmPerLevel);

  const vitals: VitalBar[] = [
    { id: 'pv', label: 'Pontos de Vida', current: pvMax, max: pvMax, color: '#dc2626' },
    { id: 'pm', label: 'Pontos de Mana', current: pmMax, max: pmMax, color: '#2563eb' },
  ];

  const abilities: CharacterAbility[] = [
    {
      id: `t20-orig-${originName}`,
      name: `Origem: ${originName}`,
      category: 'origem',
      cost: 0,
      description: `Benefícios da origem ${originName}.`,
      isActive: true,
      modifiers: [],
    },
  ];

  const sheetData: T20SheetData = {
    race: race.name,
    characterClass: cls.name,
    level,
    deity: input.deity || 'Nenhuma',
    origin: originName,
    attributes: finalAttrs,
    skills,
    abilities,
    activeConditions: [],
  };

  return { vitals, sheetData, inventory: [], attacks: [] };
}

// ---------------------------------------------------------------------------
// Classificação Canônica de Armas de Ordem Paranormal RPG
// ---------------------------------------------------------------------------

export interface OrdemWeaponClassification {
  isFirearm: boolean;
  isDisparo: boolean;
  isRanged: boolean;
  isMelee: boolean;
  isThrown: boolean;
  isAgile: boolean;
  isArcoComposto: boolean;
  skillId: 'pontaria' | 'luta';
}

export function classifyOrdemWeapon(
  name: string,
  description?: string,
  explicitIsFirearm?: boolean,
  damageType?: string,
  isUnarmed?: boolean
): OrdemWeaponClassification {
  const nameLower = (name || '').toLowerCase();
  const descLower = (description || '').toLowerCase();
  const dmgLower = (damageType || '').toLowerCase();

  const isDesarmado = Boolean(
    isUnarmed ||
    nameLower.includes('desarmado') ||
    descLower.includes('ataque desarmado')
  );

  if (isDesarmado) {
    return {
      isFirearm: false,
      isDisparo: false,
      isRanged: false,
      isMelee: true,
      isThrown: false,
      isAgile: true,
      isArcoComposto: false,
      skillId: 'luta',
    };
  }

  // 1. Armas de Fogo
  const firearmKeywords = [
    'fogo',
    'pistola',
    'revólver',
    'revolver',
    'fuzil',
    'sniper',
    'submetralhadora',
    'espingarda',
    'escopeta',
    'shotgun',
    'rifle',
    'carabina',
    'metralhadora',
    'bazuca',
    'bazooka',
    'lança-chamas',
    'lanca-chamas',
    'trabuco',
    'garrucha',
    'balístico',
    'balistico',
    'balas curtas',
    'balas longas',
    'cartuchos',
  ];

  const hasFirearmKeyword = firearmKeywords.some(
    (kw) => nameLower.includes(kw) || descLower.includes(kw) || dmgLower.includes(kw)
  );

  const isFirearm = Boolean(explicitIsFirearm) || hasFirearmKeyword;

  // 2. Armas de Disparo (à distância, mas não de fogo: arcos, bestas, balestras)
  const disparoKeywords = [
    'disparo',
    'arma de disparo',
    'arco',
    'besta',
    'balestra',
    'flecha',
    'flechas',
    'virote',
    'virotes',
    'estilingue',
    'funda',
  ];

  const isDisparo =
    !isFirearm &&
    disparoKeywords.some((kw) => nameLower.includes(kw) || descLower.includes(kw));

  const isRanged = isFirearm || isDisparo;

  // 3. Arma de Arremesso
  const isThrown =
    descLower.includes('arremess') ||
    nameLower.includes('arremess') ||
    nameLower.includes('faca') ||
    nameLower.includes('lança') ||
    nameLower.includes('lanca') ||
    nameLower.includes('machadinha') ||
    nameLower.includes('adaga') ||
    nameLower.includes('dardo') ||
    nameLower.includes('shuriken');

  // 4. Melee (somente se NÃO for arma de fogo e NÃO for arma de disparo)
  const isMelee = !isRanged;

  // 5. Arma Ágil
  const isAgile =
    nameLower.includes('ágil') ||
    nameLower.includes('agil') ||
    descLower.includes('arma ágil') ||
    descLower.includes('ágil') ||
    descLower.includes('agil') ||
    nameLower.includes('florete') ||
    nameLower.includes('nunchaku') ||
    nameLower.includes('katana') ||
    nameLower.includes('punhal') ||
    nameLower.includes('faca');

  // 6. Arco Composto (única arma de disparo que soma Força no dano pelas regras oficiais)
  const isArcoComposto = nameLower.includes('arco composto') || descLower.includes('arco composto');

  const skillId: 'pontaria' | 'luta' = isRanged ? 'pontaria' : 'luta';

  return {
    isFirearm,
    isDisparo,
    isRanged,
    isMelee,
    isThrown,
    isAgile,
    isArcoComposto,
    skillId,
  };
}
