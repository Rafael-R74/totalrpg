import {
  CharacterAbility,
  CompendiumEntryData,
  OrdemAttributes,
  OrdemSheetData,
  PreparedAttack,
  RPGItem,
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
  T20_CLASSES,
  T20_ORIGINS,
  T20_RACES,
} from './wizardData';
import { ORDEM_COMPENDIUM_ENTRIES } from './ordemCompendiumData';

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
  const encararMorteBonus = (abilities || []).some(
    (a) =>
      a.isActive !== false &&
      a.name.toLowerCase().includes('encarar a morte')
  )
    ? 1
    : 0;

  return baseLimit + originBonus + encararMorteBonus;
}

export function getOrdemRitualDT(
  nex: number,
  effectivePre: number,
  trailId?: string,
  abilities?: CharacterAbility[],
  originIdOrName?: string
): number {
  const peLimit = getOrdemPeLimit(nex, originIdOrName, abilities);
  const graduadoBonus = trailId === 'graduado' && nex >= 65 ? 5 : 0;
  const especialistaBonus = (abilities || []).some(
    (a) =>
      a.isActive !== false &&
      a.name.toLowerCase().includes('especialista em elemento')
  )
    ? 2
    : 0;
  return 10 + peLimit + effectivePre + graduadoBonus + especialistaBonus;
}

export function getOrdemMaxLoad(
  effectiveFor: number,
  effectiveInt: number,
  trailId?: string,
  nex?: number,
  bonusSlots = 0
): number {
  const attrTotal =
    trailId === 'tecnico' && (nex ?? 5) >= 10
      ? effectiveFor + effectiveInt
      : effectiveFor;
  const baseSlots = attrTotal <= 0 ? 2 : attrTotal * 5;
  return Math.max(2, baseSlots + bonusSlots);
}

export function checkOrdemPowerRequirements(
  entry: CompendiumEntryData,
  sheetData: OrdemSheetData,
  abilities: CharacterAbility[]
): { met: boolean; missing: string[] } {
  const reqText = entry.metadata?.requirements?.trim();
  if (!reqText) return { met: true, missing: [] };

  const missing: string[] = [];
  const lowerReq = reqText.toLowerCase();

  // 1. Classe
  if (lowerReq.includes('combatente') && sheetData.characterClass !== 'combatente') {
    missing.push('Classe: Combatente');
  }
  if (lowerReq.includes('especialista') && sheetData.characterClass !== 'especialista') {
    missing.push('Classe: Especialista');
  }
  if (lowerReq.includes('ocultista') && sheetData.characterClass !== 'ocultista') {
    missing.push('Classe: Ocultista');
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
    { token: 'ocultismo', skillId: 'ocultismo', label: 'Treinado em Ocultismo' },
  ];
  if (lowerReq.includes('treinado')) {
    for (const sc of skillChecks) {
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
      // Conta poderes paranormais e rituais daquele elemento que o personagem já possui
      const ownedCount = abilities.filter((ab) => {
        const compMatch = ORDEM_COMPENDIUM_ENTRIES.find(
          (ce) => ce.name.toLowerCase() === ab.name.toLowerCase()
        );
        const abElement = ab.element || compMatch?.metadata?.element || '';
        return (
          abElement.toLowerCase().includes(elCheck.element.toLowerCase()) &&
          (ab.category === 'poder' ||
            ab.category === 'poder_paranormal' ||
            ab.category === 'ritual')
        );
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
  tempHpFormula?: string;
  tempHpFlat?: number;
  sceneDefenseBonus?: number;
}

export function parseOrdemRitualForms(
  ritualName: string,
  ritualDescription: string,
  baseCost: number,
  baseDamageFormula?: string
): OrdemRitualCastForm[] {
  const lowerName = ritualName.toLowerCase();
  const baseCircle =
    baseCost >= 10 ? 4 : baseCost >= 6 ? 3 : baseCost >= 3 ? 2 : 1;

  // Separa texto Normal, Discente e Verdadeiro
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

  const forms: OrdemRitualCastForm[] = [
    {
      mode: 'normal',
      label: 'Normal',
      extraCost: 0,
      totalCost: Math.max(1, baseCost),
      requiredCircle: baseCircle,
      requiresAffinity: false,
      description: normalText,
      damageFormula: isTempHpRitual ? undefined : baseDamageFormula,
      tempHpFormula: lowerName.includes('consumir manancial') ? '3d6' : undefined,
      tempHpFlat: lowerName.includes('tela de ruído') ? 15 : undefined,
      sceneDefenseBonus: lowerName.includes('armadura de sangue')
        ? 5
        : lowerName.includes('embaralhar')
        ? 6
        : undefined,
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

    const circleMatch = metaStr.match(/(\d+)º\s*círc/i) || effectDesc.match(/requer\s*(\d+)º\s*círc/i);
    const requiredCircle = circleMatch ? Number(circleMatch[1]) : baseCircle;

    const requiresAffinity =
      metaStr.toLowerCase().includes('afinidade') ||
      effectDesc.toLowerCase().includes('requer afinidade');

    const diceMatch = effectDesc.match(/(\d+d\d+(?:[+-]\d+)?)/i);
    const extractedFormula = diceMatch ? diceMatch[1] : baseDamageFormula;

    let tempHpFormula: string | undefined;
    let tempHpFlat: number | undefined;
    let sceneDefenseBonus: number | undefined;

    if (lowerName.includes('consumir manancial')) {
      tempHpFormula = extractedFormula || (mode === 'discente' ? '6d6' : '10d6');
    } else if (lowerName.includes('tela de ruído')) {
      tempHpFlat = mode === 'discente' ? 30 : 60;
    }

    if (lowerName.includes('armadura de sangue')) {
      sceneDefenseBonus = mode === 'discente' ? 10 : 15;
    } else if (lowerName.includes('embaralhar')) {
      sceneDefenseBonus = mode === 'discente' ? 12 : 16;
    }

    return {
      mode,
      label: mode === 'discente' ? 'Discente' : 'Verdadeiro',
      extraCost,
      totalCost: Math.max(1, baseCost) + extraCost,
      requiredCircle,
      requiresAffinity,
      description: effectDesc,
      damageFormula: isTempHpRitual ? undefined : extractedFormula,
      tempHpFormula,
      tempHpFlat,
      sceneDefenseBonus,
    };
  }

  const discForm = extractFormDetails('discente', discText);
  if (discForm) forms.push(discForm);

  const verdForm = extractFormDetails('verdadeiro', verdText);
  if (verdForm) forms.push(verdForm);

  return forms;
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
  nex?: number;
  patent?: string;
  trailId?: string;
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

  // 1. Marcar perícias treinadas (Origem + Escolhas)
  const allTrainedSet = new Set<string>([
    ...origin.skills,
    ...input.trainedSkillIds,
  ]);
  if (cls.id === 'ocultista') {
    allTrainedSet.add('ocultismo');
    allTrainedSet.add('vontade');
  }

  const skills = base.sheetData.skills.map((sk) => ({
    ...sk,
    trainingDegree: (allTrainedSet.has(sk.id) ? 5 : 0) as 0 | 5 | 10 | 15,
  }));

  // 2. Montar lista de Habilidades (Poder da Origem + Habilidades Iniciais da Classe + Trilha se NEX >= 10 + Rituais do Ocultista)
  const abilities: CharacterAbility[] = [
    {
      id: `orig-${origin.id}`,
      name: `${origin.powerName} (Origem: ${origin.name})`,
      category: 'origem',
      cost: 0,
      description: origin.powerDescription,
      isActive: true,
      modifiers: origin.modifiers || [],
    },
    ...cls.initialAbilities.map((ab, idx) => ({
      id: `cls-${cls.id}-${idx}`,
      name: ab.name,
      category: 'classe' as const,
      cost: ab.cost,
      description: ab.description,
      isActive: ab.cost === 0,
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
        modifiers: pEntry.modifiers || [],
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
            name: `Trilha ${trail.name} (${tp.nex}%): ${tp.name}`,
            category: 'classe',
            cost: tp.cost,
            description: tp.description,
            isActive: tp.cost === 0,
            modifiers: tp.modifiers || [],
          });
        }
      }
    }
  }

  // Se Ocultista escolheu rituais iniciais
  if (input.chosenRitualIds && input.chosenRitualIds.length > 0) {
    for (const rId of input.chosenRitualIds) {
      const rEntry = ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === rId);
      if (rEntry) {
        abilities.push({
          id: `rit-${rEntry.id}`,
          name: rEntry.name,
          category: 'ritual',
          cost: rEntry.cost,
          description: rEntry.description,
          damageFormula: rEntry.metadata?.damageFormula,
          isActive: false,
          modifiers: rEntry.modifiers || [],
        });
      }
    }
  }

  // 3. Montar Inventário Inicial e Ataques Preparados (com suporte a múltiplas unidades!)
  const inventory: RPGItem[] = [];
  const attacks: PreparedAttack[] = [];

  const normalizedItems: Array<{ id: string; quantity: number }> =
    input.chosenItems && input.chosenItems.length > 0
      ? input.chosenItems.filter((it) => it.quantity > 0)
      : (input.chosenItemIds || []).map((id) => ({ id, quantity: 1 }));

  for (const picked of normalizedItems) {
    const itemEntry = ORDEM_COMPENDIUM_ENTRIES.find((e) => e.id === picked.id);
    if (!itemEntry) continue;

    const invItem: RPGItem = {
      id: `init-item-${itemEntry.id}-${Math.random().toString(36).slice(2, 6)}`,
      name: itemEntry.name,
      slots: itemEntry.metadata?.slots ?? 1,
      quantity: Math.max(1, picked.quantity),
      category: itemEntry.metadata?.categoryLevel ?? itemEntry.cost ?? 0,
      description: itemEntry.description,
      isEquipped: true,
      modifiers: itemEntry.modifiers || [],
    };
    inventory.push(invItem);

    // Se for arma (possui damageFormula), cria ataque preparado automaticamente!
    if (itemEntry.metadata?.damageFormula) {
      const isRanged =
        itemEntry.description.toLowerCase().includes('disparo') ||
        itemEntry.description.toLowerCase().includes('fogo') ||
        (itemEntry.metadata?.range && itemEntry.metadata.range !== 'Corpo a Corpo');
      const skillId = isRanged ? 'pontaria' : 'luta';
      const attrVal = isRanged ? input.attributes.agi : input.attributes.for;
      const skillBonus = allTrainedSet.has(skillId) ? 5 : 0;

      attacks.push({
        id: `atk-${itemEntry.id}-${Math.random().toString(36).slice(2, 6)}`,
        name: itemEntry.name,
        diceCount: Math.max(1, attrVal),
        attackBonus: skillBonus,
        damageFormula: itemEntry.metadata.damageFormula,
        critRange: itemEntry.metadata.critRange || '20/x2',
        damageType: itemEntry.metadata.element || 'Físico',
      });
    }
  }

  // 4. Calcular barras vitais base + modificadores ativos (Calejado, Cicatrizes Psicológicas, etc.)
  const baseVitals = calculateOrdemBaseVitals({
    characterClass: cls.id,
    attributes: input.attributes,
    nex,
    originIdOrName: origin.id,
    transcendedCount: 0,
  });

  const sheetData: OrdemSheetData = {
    origin: origin.name,
    characterClass: cls.id,
    nex,
    patent,
    trail: input.trailId || undefined,
    prestigePoints:
      ORDEM_PATENTS.find((p) => p.name === patent)?.minPrestige ?? 0,
    peritoSkills: input.peritoSkillIds || [],
    proficiencies: cls.proficiencies,
    transcendedCount: 0,
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

  const pvMax = Math.max(1, cls.basePv + finalAttrs.constituicao);
  const pmMax = Math.max(1, cls.pmPerLevel);

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
    level: 1,
    deity: input.deity || 'Nenhuma',
    origin: originName,
    attributes: finalAttrs,
    skills,
    abilities,
    activeConditions: [],
  };

  return { vitals, sheetData, inventory: [], attacks: [] };
}
