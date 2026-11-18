import type { RuleModifier, CompendiumEntryData, CharacterAbility } from './index';
import { ORDEM_RITUALS_DATA } from './ordemRitualsData';

export interface OrdemRitualFormDef {
  extraCost: number;
  requiredCircle: number;
  requiresAffinity: boolean;
  text: string;
}

export interface OrdemRitualDef {
  id: string;
  name: string;
  circle: number;
  element: string;
  elementOptions?: string[];
  execution: string;
  range: string;
  targetLabel: string;
  target: string;
  duration: string;
  resistance?: string;
  description: string;
  discente?: OrdemRitualFormDef;
  verdadeiro?: OrdemRitualFormDef;
  requiresTrail?: string;
}

export interface OrdemRitualFormMechanics {
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
}

export interface OrdemRitualMechanics {
  normal?: OrdemRitualFormMechanics;
  discente?: OrdemRitualFormMechanics;
  verdadeiro?: OrdemRitualFormMechanics;
}

export { ORDEM_RITUALS_DATA };

function normalizeRitualLookup(str: string): string {
  return (str || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s*\(.*\)\s*$/g, '')
    .replace(/\s*—.*$/g, '')
    .replace(/\s*-\s*(conhecimento|energia|morte|sangue|medo).*$/g, '')
    .trim();
}

const RITUAL_BY_ID_MAP = new Map<string, OrdemRitualDef>();
const RITUAL_BY_NORM_NAME_MAP = new Map<string, OrdemRitualDef>();

for (const ritual of ORDEM_RITUALS_DATA) {
  RITUAL_BY_ID_MAP.set(ritual.id.toLowerCase(), ritual);
  const norm = normalizeRitualLookup(ritual.name);
  if (norm) {
    RITUAL_BY_NORM_NAME_MAP.set(norm, ritual);
  }
}

export function findOrdemRitualDef(idOrName?: string): OrdemRitualDef | undefined {
  if (!idOrName) return undefined;
  const cleanId = idOrName.trim().toLowerCase();
  
  // 1. Direct lookup by exact ID O(1)
  const byId = RITUAL_BY_ID_MAP.get(cleanId);
  if (byId) return byId;

  // 2. Lookup by normalized name O(1)
  const normName = normalizeRitualLookup(idOrName);
  if (normName) {
    const byNorm = RITUAL_BY_NORM_NAME_MAP.get(normName);
    if (byNorm) return byNorm;
  }

  // 3. Fast prefix match for generated IDs (ex: "ord-rit-chamas-do-caos-abc123")
  if (cleanId.startsWith('ord-rit-')) {
    for (const [id, def] of RITUAL_BY_ID_MAP) {
      if (cleanId.startsWith(id)) {
        return def;
      }
    }
  }

  return undefined;
}

export function createKnownRitualsKeySet(abilities: CharacterAbility[]): Set<string> {
  const keys = new Set<string>();

  for (const ab of abilities) {
    if (ab.category !== 'ritual' && ab.category !== 'magia') continue;
    const nameLower = ab.name.trim().toLowerCase();
    keys.add(`name:${nameLower}`);

    const norm = normalizeRitualLookup(ab.name);
    if (norm) keys.add(`norm:${norm}`);

    const def = findOrdemRitualDef(ab.id) || findOrdemRitualDef(ab.name);
    if (def) {
      keys.add(`id:${def.id.toLowerCase()}`);
    } else if (ab.id) {
      keys.add(`id:${ab.id.toLowerCase()}`);
    }

    if (nameLower.includes('amaldiçoar arma')) {
      for (const el of ['sangue', 'morte', 'conhecimento', 'energia']) {
        if (nameLower.includes(el)) {
          keys.add(`amaldicoar:${el}`);
        }
      }
    }
  }

  const hasAllAmaldicoar =
    keys.has('amaldicoar:sangue') &&
    keys.has('amaldicoar:morte') &&
    keys.has('amaldicoar:conhecimento') &&
    keys.has('amaldicoar:energia');
  if (hasAllAmaldicoar) {
    keys.add('amaldicoar:all');
    keys.add('id:ord-rit-amaldicoar-arma');
  }

  return keys;
}

export function isOrdemRitualAlreadyOwned(
  entry: { id?: string; name: string },
  abilities: CharacterAbility[],
  precomputedKeySet?: Set<string>
): boolean {
  const keys = precomputedKeySet || createKnownRitualsKeySet(abilities);
  const entryLower = entry.name.trim().toLowerCase();
  const isAmaldicoar =
    entry.id === 'ord-rit-amaldicoar-arma' || entryLower.includes('amaldiçoar arma');

  if (isAmaldicoar) {
    return keys.has('amaldicoar:all');
  }

  if (keys.has(`name:${entryLower}`)) return true;

  if (entry.id) {
    const cleanId = entry.id.toLowerCase();
    if (keys.has(`id:${cleanId}`)) return true;
    const def = findOrdemRitualDef(entry.id);
    if (def && keys.has(`id:${def.id.toLowerCase()}`)) return true;
  }

  const norm = normalizeRitualLookup(entry.name);
  if (norm && keys.has(`norm:${norm}`)) return true;

  const defByName = findOrdemRitualDef(entry.name);
  if (defByName && keys.has(`id:${defByName.id.toLowerCase()}`)) return true;

  return false;
}

export function getOrdemCircleBaseCost(circle: number): number {
  switch (circle) {
    case 1:
      return 1;
    case 2:
      return 3;
    case 3:
      return 6;
    case 4:
      return 10;
    default:
      return 1;
  }
}

export const ORDEM_RITUAL_MECHANICS: Record<string, OrdemRitualMechanics> = {
  // === 1º CÍRCULO ===
  'ord-rit-amaldicoar-arma': {
    normal: { weaponExtraDice: '1d6' },
    discente: { weaponExtraDice: '2d6' },
    verdadeiro: { weaponExtraDice: '4d6' },
  },
  'ord-rit-compreensao-paranormal': {
    verdadeiro: { isPersonalSelf: true },
  },
  'ord-rit-enfeiticar': {
    normal: {
      sceneModifiers: [{ id: 'rit-enf-dip', targetType: 'skill_bonus', targetKey: 'diplomacia', value: 10 }],
    },
    verdadeiro: {
      sceneModifiers: [{ id: 'rit-enf-dip', targetType: 'skill_bonus', targetKey: 'diplomacia', value: 10 }],
    },
  },
  'ord-rit-perturbacao': {
    discente: { damageFormula: '3d8' },
  },
  'ord-rit-tecer-ilusao': {
    verdadeiro: { damageFormula: '6d6' },
  },
  'ord-rit-terceiro-olho': {
    normal: { isPersonalSelf: true },
    discente: { isPersonalSelf: true },
    verdadeiro: { isPersonalSelf: true },
  },
  'ord-rit-ouvir-sussurros': {
    normal: { damageFormula: '1d6', isPersonalSelf: true },
    discente: { damageFormula: '1d6', isPersonalSelf: true },
    verdadeiro: { damageFormula: '1d6', isPersonalSelf: true },
  },
  'ord-rit-coincidencia-forcada': {
    normal: {
      sceneModifiers: [{ id: 'rit-coinc-2', targetType: 'skill_bonus', targetKey: 'all', value: 2 }],
    },
    discente: {
      sceneModifiers: [{ id: 'rit-coinc-2', targetType: 'skill_bonus', targetKey: 'all', value: 2 }],
    },
    verdadeiro: {
      sceneModifiers: [{ id: 'rit-coinc-5', targetType: 'skill_bonus', targetKey: 'all', value: 5 }],
    },
  },
  'ord-rit-eletrocussao': {
    normal: { damageFormula: '3d6' },
    discente: { damageFormula: '6d6' },
    verdadeiro: { damageFormula: '8d6' },
  },
  'ord-rit-embaralhar': {
    normal: { sceneDefenseBonus: 6, isPersonalSelf: true },
    discente: { sceneDefenseBonus: 10, isPersonalSelf: true },
    verdadeiro: { sceneDefenseBonus: 16, isPersonalSelf: true },
  },
  'ord-rit-luz': {
    verdadeiro: {
      sceneModifiers: [{ id: 'rit-luz-von', targetType: 'skill_dice', targetKey: 'vontade', value: 1 }],
    },
  },
  'ord-rit-polarizacao-caotica': {
    normal: { isPersonalSelf: true },
    discente: { damageFormula: '10d6' },
  },
  'ord-rit-cicatrizacao': {
    normal: { healingFormula: '3d8+3' },
    discente: { healingFormula: '5d8+5' },
    verdadeiro: { healingFormula: '7d8+7' },
  },
  'ord-rit-consumir-manancial': {
    normal: { tempHpFormula: '3d6', isPersonalSelf: true },
    discente: { tempHpFormula: '6d6', isPersonalSelf: true },
    verdadeiro: { tempHpFormula: '3d6', damageFormula: '3d6', isPersonalSelf: true },
  },
  'ord-rit-decadencia': {
    normal: { damageFormula: '2d8+2' },
    discente: { damageFormula: '3d8+3' },
    verdadeiro: { damageFormula: '8d8+8', isPersonalSelf: true },
  },
  'ord-rit-arma-atroz': {
    normal: {
      sceneModifiers: [{ id: 'rit-atroz-atk', targetType: 'attack_bonus', targetKey: 'melee', value: 2 }],
      weaponCritThreatSteps: 1,
    },
    discente: {
      sceneModifiers: [{ id: 'rit-atroz-atk', targetType: 'attack_bonus', targetKey: 'melee', value: 5 }],
      weaponCritThreatSteps: 1,
    },
    verdadeiro: {
      sceneModifiers: [{ id: 'rit-atroz-atk', targetType: 'attack_bonus', targetKey: 'melee', value: 5 }],
      weaponCritThreatSteps: 2,
      weaponCritMultiplierBoost: 2,
    },
  },
  'ord-rit-armadura-sangue': {
    normal: { sceneDefenseBonus: 5, isPersonalSelf: true },
    discente: { sceneDefenseBonus: 10, isPersonalSelf: true },
    verdadeiro: { sceneDefenseBonus: 15, isPersonalSelf: true },
  },
  'ord-rit-distorcer-aparencia': {
    normal: {
      isPersonalSelf: true,
      sceneModifiers: [{ id: 'rit-dist-eng', targetType: 'skill_bonus', targetKey: 'enganacao', value: 10 }],
    },
    discente: {
      sceneModifiers: [{ id: 'rit-dist-eng', targetType: 'skill_bonus', targetKey: 'enganacao', value: 10 }],
    },
    verdadeiro: {
      sceneModifiers: [{ id: 'rit-dist-eng', targetType: 'skill_bonus', targetKey: 'enganacao', value: 10 }],
    },
  },
  'ord-rit-fortalecimento-sensorial': {
    normal: {
      isPersonalSelf: true,
      sceneModifiers: [
        { id: 'rit-fs-inv', targetType: 'skill_dice', targetKey: 'investigacao', value: 1 },
        { id: 'rit-fs-lut', targetType: 'skill_dice', targetKey: 'luta', value: 1 },
        { id: 'rit-fs-per', targetType: 'skill_dice', targetKey: 'percepcao', value: 1 },
        { id: 'rit-fs-pon', targetType: 'skill_dice', targetKey: 'pontaria', value: 1 },
      ],
    },
    discente: {
      isPersonalSelf: true,
      sceneModifiers: [
        { id: 'rit-fs-inv', targetType: 'skill_dice', targetKey: 'investigacao', value: 1 },
        { id: 'rit-fs-lut', targetType: 'skill_dice', targetKey: 'luta', value: 1 },
        { id: 'rit-fs-per', targetType: 'skill_dice', targetKey: 'percepcao', value: 1 },
        { id: 'rit-fs-pon', targetType: 'skill_dice', targetKey: 'pontaria', value: 1 },
      ],
    },
    verdadeiro: {
      isPersonalSelf: true,
      sceneDefenseBonus: 10,
      sceneModifiers: [
        { id: 'rit-fs-inv', targetType: 'skill_dice', targetKey: 'investigacao', value: 1 },
        { id: 'rit-fs-lut', targetType: 'skill_dice', targetKey: 'luta', value: 1 },
        { id: 'rit-fs-per', targetType: 'skill_dice', targetKey: 'percepcao', value: 1 },
        { id: 'rit-fs-pon', targetType: 'skill_dice', targetKey: 'pontaria', value: 1 },
        { id: 'rit-fs-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 10 },
      ],
    },
  },
  'ord-rit-odio-incontrolavel': {
    normal: {
      sceneModifiers: [
        { id: 'rit-odio-atk', targetType: 'attack_bonus', targetKey: 'melee', value: 2 },
        { id: 'rit-odio-dmg', targetType: 'damage_bonus', targetKey: 'melee', value: 2 },
      ],
    },
    discente: {
      sceneModifiers: [
        { id: 'rit-odio-atk', targetType: 'attack_bonus', targetKey: 'melee', value: 2 },
        { id: 'rit-odio-dmg', targetType: 'damage_bonus', targetKey: 'melee', value: 2 },
      ],
    },
    verdadeiro: {
      sceneModifiers: [
        { id: 'rit-odio-atk', targetType: 'attack_bonus', targetKey: 'melee', value: 5 },
        { id: 'rit-odio-dmg', targetType: 'damage_bonus', targetKey: 'melee', value: 5 },
      ],
    },
  },

  // === 2º CÍRCULO ===
  'ord-rit-aprimorar-mente': {
    normal: {
      sceneModifiers: [{ id: 'rit-apm-int', targetType: 'attribute', targetKey: 'int', value: 1 }],
    },
    discente: {
      sceneModifiers: [{ id: 'rit-apm-int', targetType: 'attribute', targetKey: 'int', value: 2 }],
    },
    verdadeiro: {
      sceneModifiers: [{ id: 'rit-apm-int', targetType: 'attribute', targetKey: 'int', value: 3 }],
    },
  },
  'ord-rit-deteccao-ameacas': {
    normal: { isPersonalSelf: true },
    discente: { isPersonalSelf: true },
    verdadeiro: { isPersonalSelf: true },
  },
  'ord-rit-esconder-olhos': {
    normal: {
      isPersonalSelf: true,
      sceneModifiers: [{ id: 'rit-esc-fur', targetType: 'skill_bonus', targetKey: 'furtividade', value: 15 }],
    },
    discente: {
      isPersonalSelf: true,
      sceneModifiers: [{ id: 'rit-esc-fur', targetType: 'skill_bonus', targetKey: 'furtividade', value: 15 }],
    },
    verdadeiro: {
      sceneModifiers: [{ id: 'rit-esc-fur', targetType: 'skill_bonus', targetKey: 'furtividade', value: 15 }],
    },
  },
  'ord-rit-invadir-mente': {
    normal: { damageFormula: '6d6' },
    discente: { damageFormula: '10d6' },
    verdadeiro: { damageFormula: '10d6' },
  },
  'ord-rit-localizacao': {
    normal: { isPersonalSelf: true },
    verdadeiro: { isPersonalSelf: true },
  },
  'ord-rit-chamas-caos': {
    normal: { damageFormula: '3d6', weaponExtraDice: '1d6' },
    discente: { damageFormula: '4d6' },
    verdadeiro: { damageFormula: '8d6' },
  },
  'ord-rit-contencao-fantasmagorica': {
    verdadeiro: { damageFormula: '2d6+2' },
  },
  'ord-rit-tela-ruido': {
    normal: { tempHpFlat: 30, isPersonalSelf: true },
    discente: { tempHpFlat: 60, isPersonalSelf: true },
  },
  'ord-rit-eco-espiral': {
    normal: {},
    discente: {},
    verdadeiro: {},
  },
  'ord-rit-miasma-entropico': {
    normal: { damageFormula: '4d8' },
    discente: { damageFormula: '6d8' },
    verdadeiro: { damageFormula: '6d8' },
  },
  'ord-rit-paradoxo': {
    normal: { damageFormula: '6d6' },
    discente: { damageFormula: '4d6' },
    verdadeiro: { damageFormula: '13d6' },
  },
  'ord-rit-aprimorar-fisico': {
    normal: {
      sceneModifiers: [{ id: 'rit-apf-for', targetType: 'attribute', targetKey: 'for', value: 1 }],
    },
    discente: {
      sceneModifiers: [{ id: 'rit-apf-for', targetType: 'attribute', targetKey: 'for', value: 2 }],
    },
    verdadeiro: {
      sceneModifiers: [{ id: 'rit-apf-for', targetType: 'attribute', targetKey: 'for', value: 3 }],
    },
  },
  'ord-rit-descarnar': {
    normal: { damageFormula: '6d8' },
    discente: { damageFormula: '10d8' },
    verdadeiro: { damageFormula: '4d8', weaponExtraDice: '4d8', isPersonalSelf: true },
  },
  'ord-rit-flagelo-sangue': {
    normal: { damageFormula: '10d6' },
    discente: { damageFormula: '10d6' },
    verdadeiro: { damageFormula: '10d6' },
  },
  'ord-rit-hemofagia': {
    normal: { damageFormula: '6d6' },
    discente: { damageFormula: '6d6' },
    verdadeiro: { damageFormula: '4d6', isPersonalSelf: true },
  },
  'ord-rit-protecao-contra-rituais': {
    normal: {
      sceneModifiers: [
        { id: 'rit-pcr-fort', targetType: 'skill_bonus', targetKey: 'fortitude', value: 5 },
        { id: 'rit-pcr-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 5 },
        { id: 'rit-pcr-von', targetType: 'skill_bonus', targetKey: 'vontade', value: 5 },
      ],
    },
    discente: {
      sceneModifiers: [
        { id: 'rit-pcr-fort', targetType: 'skill_bonus', targetKey: 'fortitude', value: 5 },
        { id: 'rit-pcr-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 5 },
        { id: 'rit-pcr-von', targetType: 'skill_bonus', targetKey: 'vontade', value: 5 },
      ],
    },
    verdadeiro: {
      sceneModifiers: [
        { id: 'rit-pcr-fort', targetType: 'skill_bonus', targetKey: 'fortitude', value: 10 },
        { id: 'rit-pcr-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 10 },
        { id: 'rit-pcr-von', targetType: 'skill_bonus', targetKey: 'vontade', value: 10 },
      ],
    },
  },

  // === 3º CÍRCULO ===
  'ord-rit-contato-paranormal': {
    normal: { isPersonalSelf: true, damageFormula: '1d6' },
    discente: { isPersonalSelf: true, damageFormula: '1d8' },
    verdadeiro: { isPersonalSelf: true, damageFormula: '1d12' },
  },
  'ord-rit-salto-fantasma': {
    normal: { isPersonalSelf: true },
    discente: {
      isPersonalSelf: true,
      sceneDefenseBonus: 10,
      sceneModifiers: [{ id: 'rit-sf-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 10 }],
    },
  },
  'ord-rit-transfigurar-agua': {
    normal: { damageFormula: '5d8' },
    verdadeiro: { damageFormula: '10d8' },
  },
  'ord-rit-transfigurar-terra': {
    normal: { damageFormula: '10d6' },
    discente: { damageFormula: '10d6' },
    verdadeiro: { damageFormula: '10d6' },
  },
  'ord-rit-poeira-podridao': {
    normal: { damageFormula: '4d8' },
    verdadeiro: { damageFormula: '4d8+16' },
  },
  'ord-rit-tentaculos-lodo': {
    normal: { damageFormula: '4d6' },
    verdadeiro: { damageFormula: '6d6' },
  },
  'ord-rit-ferver-sangue': {
    normal: { damageFormula: '4d8' },
    verdadeiro: { damageFormula: '4d8' },
  },
  'ord-rit-forma-monstruosa': {
    normal: {
      isPersonalSelf: true,
      tempHpFlat: 30,
      sceneModifiers: [
        { id: 'rit-fm-atk', targetType: 'attack_bonus', targetKey: 'melee', value: 5 },
        { id: 'rit-fm-dmg', targetType: 'damage_bonus', targetKey: 'melee', value: 5 },
      ],
    },
    discente: {
      isPersonalSelf: true,
      tempHpFlat: 30,
      sceneModifiers: [
        { id: 'rit-fm-atk', targetType: 'attack_bonus', targetKey: 'melee', value: 5 },
        { id: 'rit-fm-dmg', targetType: 'damage_bonus', targetKey: 'melee', value: 5 },
      ],
    },
    verdadeiro: {
      isPersonalSelf: true,
      tempHpFlat: 50,
      sceneModifiers: [
        { id: 'rit-fm-atk', targetType: 'attack_bonus', targetKey: 'melee', value: 10 },
        { id: 'rit-fm-dmg', targetType: 'damage_bonus', targetKey: 'melee', value: 10 },
      ],
    },
  },
  'ord-rit-purgatorio': {
    normal: { damageFormula: '6d6' },
  },
  'ord-rit-vomitar-pestes': {
    normal: { damageFormula: '5d12' },
    discente: { damageFormula: '5d12' },
    verdadeiro: { damageFormula: '5d12' },
  },

  // === 4º CÍRCULO ===
  'ord-rit-inexistir': {
    normal: { damageFormula: '10d12+10' },
    discente: { damageFormula: '15d12+15' },
    verdadeiro: { damageFormula: '20d12+20' },
  },
  'ord-rit-alterar-destino': {
    normal: {
      isPersonalSelf: true,
      sceneDefenseBonus: 15,
      sceneModifiers: [
        { id: 'rit-ad-fort', targetType: 'skill_bonus', targetKey: 'fortitude', value: 15 },
        { id: 'rit-ad-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 15 },
        { id: 'rit-ad-von', targetType: 'skill_bonus', targetKey: 'vontade', value: 15 },
      ],
    },
    verdadeiro: {
      sceneDefenseBonus: 15,
      sceneModifiers: [
        { id: 'rit-ad-fort', targetType: 'skill_bonus', targetKey: 'fortitude', value: 15 },
        { id: 'rit-ad-ref', targetType: 'skill_bonus', targetKey: 'reflexos', value: 15 },
        { id: 'rit-ad-von', targetType: 'skill_bonus', targetKey: 'vontade', value: 15 },
      ],
    },
  },
  'ord-rit-deflagracao-energia': {
    normal: { damageFormula: '3d10', isPersonalSelf: true },
    verdadeiro: { damageFormula: '3d10', isPersonalSelf: true },
  },
  'ord-rit-convocar-algoz': {
    normal: { damageFormula: '6d6' },
  },
  'ord-rit-distorcao-temporal': {
    normal: { isPersonalSelf: true },
  },
  'ord-rit-conhecendo-medo': {
    normal: { damageFormula: '10d6' },
  },
  'ord-rit-lamina-medo': {
    normal: { damageFormula: '10d8' },
  },
  'ord-rit-medo-tangivel': {
    normal: { isPersonalSelf: true },
  },
  'ord-rit-presenca-medo': {
    normal: { damageFormula: '10d8', isPersonalSelf: true },
  },
};

export function buildOrdemRitualCompendiumEntries(): CompendiumEntryData[] {
  return [...ORDEM_RITUALS_DATA]
    .sort((a, b) => a.circle - b.circle || a.element.localeCompare(b.element) || a.name.localeCompare(b.name))
    .map((r) => {
      const mech = ORDEM_RITUAL_MECHANICS[r.id];
      const isAmaldicoar = r.id === 'ord-rit-amaldicoar-arma';
      const entryName = isAmaldicoar
        ? 'Amaldiçoar Arma (1º Círculo)'
        : `${r.name} (${r.circle}º Círculo - ${r.element})`;

      const parts: string[] = [r.description];
      if (r.discente) {
        const reqParts: string[] = [`+${r.discente.extraCost} PE`];
        if (r.discente.requiredCircle > r.circle) reqParts.push(`${r.discente.requiredCircle}º círc.`);
        if (r.discente.requiresAffinity) reqParts.push('afinidade');
        parts.push(`Discente (${reqParts.join(', ')}): ${r.discente.text}`);
      }
      if (r.verdadeiro) {
        const reqParts: string[] = [`+${r.verdadeiro.extraCost} PE`];
        if (r.verdadeiro.requiredCircle > r.circle) reqParts.push(`${r.verdadeiro.requiredCircle}º círc.`);
        if (r.verdadeiro.requiresAffinity) reqParts.push('afinidade');
        parts.push(`Verdadeiro (${reqParts.join(', ')}): ${r.verdadeiro.text}`);
      }

      const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
      const baseDmg =
        mech?.normal?.damageFormula ||
        mech?.normal?.healingFormula ||
        mech?.normal?.tempHpFormula ||
        mech?.normal?.weaponExtraDice;

      return {
        id: r.id,
        system: 'ordem-paranormal',
        category: 'spell',
        name: entryName,
        description: parts.join(' '),
        cost: getOrdemCircleBaseCost(r.circle),
        modifiers: mech?.normal?.sceneModifiers || [],
        metadata: {
          circle: r.circle,
          element: r.elementOptions ? r.elementOptions.join(' / ') : r.element,
          execution: cap(r.execution),
          range: cap(r.range),
          duration: cap(r.duration),
          target: `${r.targetLabel}: ${r.target}`,
          resistance: r.resistance,
          requiresTrail: r.requiresTrail,
          damageFormula: baseDmg,
        },
      };
    });
}

