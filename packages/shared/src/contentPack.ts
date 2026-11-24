import { ORDEM_RITUALS_DATA } from './ordemRitualsData';
import { buildOrdemRitualCompendiumEntries } from './ordemRituals';
import { ORDEM_COMPENDIUM_ENTRIES } from './ordemCompendiumData';
import {
  ORDEM_EQUIPMENT_MODIFICATIONS,
  ORDEM_EQUIPMENT_CURSES,
} from './ordemEquipmentData';
import {
  ORDEM_ORIGINS,
  ORDEM_CLASSES,
  ORDEM_TRAILS,
  ORDEM_INSANITY_EFFECTS,
  ORDEM_INTERLUDE_DISHES,
} from './wizardData';

export const PLACEHOLDER_RULEBOOK_TEXT =
  'Consulte o Livro de Regras v1.3 para a descrição completa (ou importe um Content Pack local no Painel Admin).';

export interface TotalRpgContentPack {
  version: string;
  name?: string;
  system?: string;
  compendium?: Record<string, { description: string }>;
  rituals?: Record<
    string,
    { description: string; discenteText?: string; verdadeiroText?: string }
  >;
  equipmentMods?: Record<string, { description: string }>;
  equipmentCurses?: Record<string, { description: string }>;
  origins?: Record<string, { description: string; powerDescription: string }>;
  classes?: Record<
    string,
    { description: string; initialAbilities: Record<string, string> }
  >;
  trails?: Record<
    string,
    { description: string; powers: Record<string, string> }
  >;
  insanityEffects?: string[];
  interludeDishes?: Record<string, { description: string }>;
}

export interface ContentPackApplyStats {
  rituals: number;
  compendium: number;
  equipmentMods: number;
  equipmentCurses: number;
  origins: number;
  classes: number;
  trails: number;
  insanityEffects: number;
  interludeDishes: number;
  totalApplied: number;
}

let loadedPackCount = 0;
let lastApplyStats: ContentPackApplyStats | null = null;

export function isContentPackLoaded(): boolean {
  return loadedPackCount > 0;
}

export function getContentPackStats(): ContentPackApplyStats | null {
  return lastApplyStats;
}

export function mergeContentPacks(packs: TotalRpgContentPack[]): TotalRpgContentPack {
  const merged: TotalRpgContentPack = {
    version: packs[packs.length - 1]?.version || '1.0.0',
    name: packs.map((p) => p.name).filter(Boolean).join(' + ') || 'Local Content Pack',
    system: packs[0]?.system || 'ordem-paranormal',
    compendium: {},
    rituals: {},
    equipmentMods: {},
    equipmentCurses: {},
    origins: {},
    classes: {},
    trails: {},
    insanityEffects: [],
    interludeDishes: {},
  };

  for (const p of packs) {
    if (p.compendium) Object.assign(merged.compendium!, p.compendium);
    if (p.rituals) Object.assign(merged.rituals!, p.rituals);
    if (p.equipmentMods) Object.assign(merged.equipmentMods!, p.equipmentMods);
    if (p.equipmentCurses) Object.assign(merged.equipmentCurses!, p.equipmentCurses);
    if (p.origins) Object.assign(merged.origins!, p.origins);
    if (p.classes) {
      for (const [k, v] of Object.entries(p.classes)) {
        const prev = merged.classes![k];
        merged.classes![k] = {
          description: v.description || prev?.description || '',
          initialAbilities: {
            ...(prev?.initialAbilities || {}),
            ...(v.initialAbilities || {}),
          },
        };
      }
    }
    if (p.trails) {
      for (const [k, v] of Object.entries(p.trails)) {
        const prev = merged.trails![k];
        merged.trails![k] = {
          description: v.description || prev?.description || '',
          powers: {
            ...(prev?.powers || {}),
            ...(v.powers || {}),
          },
        };
      }
    }
    if (p.insanityEffects && p.insanityEffects.length > 0) {
      merged.insanityEffects = [...p.insanityEffects];
    }
    if (p.interludeDishes) {
      Object.assign(merged.interludeDishes!, p.interludeDishes);
    }
  }

  return merged;
}

export function applyContentPack(pack: TotalRpgContentPack): ContentPackApplyStats {
  const stats: ContentPackApplyStats = {
    rituals: 0,
    compendium: 0,
    equipmentMods: 0,
    equipmentCurses: 0,
    origins: 0,
    classes: 0,
    trails: 0,
    insanityEffects: 0,
    interludeDishes: 0,
    totalApplied: 0,
  };

  // 1. Atualiza ORDEM_RITUALS_DATA in-place primeiro para que buildOrdemRitualCompendiumEntries() reflita os textos completos
  if (pack.rituals) {
    for (const r of ORDEM_RITUALS_DATA) {
      const entry = pack.rituals[r.id];
      if (!entry) continue;
      if (entry.description) {
        r.description = entry.description;
        stats.rituals += 1;
      }
      if (r.discente && entry.discenteText) {
        r.discente.text = entry.discenteText;
      }
      if (r.verdadeiro && entry.verdadeiroText) {
        r.verdadeiro.text = entry.verdadeiroText;
      }
    }
  }

  // 2. Atualiza ORDEM_COMPENDIUM_ENTRIES in-place (entradas normais + entradas de rituais reconstruídas)
  const rebuiltRitualsById = new Map(
    buildOrdemRitualCompendiumEntries().map((r) => [r.id, r])
  );

  for (const entry of ORDEM_COMPENDIUM_ENTRIES) {
    if (entry.category === 'spell') {
      const rebuilt = rebuiltRitualsById.get(entry.id);
      if (rebuilt) {
        entry.description = rebuilt.description;
        if (pack.rituals?.[entry.id]) {
          stats.compendium += 1;
        }
      }
    } else if (pack.compendium?.[entry.id]?.description) {
      entry.description = pack.compendium[entry.id].description;
      stats.compendium += 1;
    }
  }

  // 3. Modificações e maldições de equipamentos
  if (pack.equipmentMods) {
    for (const mod of ORDEM_EQUIPMENT_MODIFICATIONS) {
      const item = pack.equipmentMods[mod.id];
      if (item?.description) {
        mod.description = item.description;
        stats.equipmentMods += 1;
      }
    }
  }

  if (pack.equipmentCurses) {
    for (const curse of ORDEM_EQUIPMENT_CURSES) {
      const item = pack.equipmentCurses[curse.id];
      if (item?.description) {
        curse.description = item.description;
        stats.equipmentCurses += 1;
      }
    }
  }

  // 4. Origens
  if (pack.origins) {
    for (const origin of ORDEM_ORIGINS) {
      const item = pack.origins[origin.id];
      if (!item) continue;
      if (item.description) {
        origin.description = item.description;
        stats.origins += 1;
      }
      if (item.powerDescription) {
        origin.powerDescription = item.powerDescription;
      }
    }
  }

  // 5. Classes e habilidades iniciais
  if (pack.classes) {
    for (const cls of ORDEM_CLASSES) {
      const item = pack.classes[cls.id];
      if (!item) continue;
      if (item.description) {
        cls.description = item.description;
        stats.classes += 1;
      }
      if (item.initialAbilities) {
        for (const ab of cls.initialAbilities) {
          if (item.initialAbilities[ab.name]) {
            ab.description = item.initialAbilities[ab.name];
          }
        }
      }
    }
  }

  // 6. Trilhas de classe e seus poderes
  if (pack.trails) {
    for (const trail of ORDEM_TRAILS) {
      const item = pack.trails[trail.id];
      if (!item) continue;
      if (item.description) {
        trail.description = item.description;
        stats.trails += 1;
      }
      if (item.powers) {
        for (const pw of trail.powers) {
          const desc = item.powers[String(pw.nex)];
          if (desc) {
            pw.description = desc;
          }
        }
      }
    }
  }

  // 7. Tabela de efeitos de insanidade
  if (pack.insanityEffects && pack.insanityEffects.length > 0) {
    ORDEM_INSANITY_EFFECTS.splice(
      0,
      ORDEM_INSANITY_EFFECTS.length,
      ...pack.insanityEffects
    );
    stats.insanityEffects = pack.insanityEffects.length;
  }

  // 8. Pratos da Cena de Interlúdio
  if (pack.interludeDishes) {
    for (const dish of ORDEM_INTERLUDE_DISHES) {
      const item = pack.interludeDishes[dish.id];
      if (item?.description) {
        dish.description = item.description;
        stats.interludeDishes += 1;
      }
    }
  }

  stats.totalApplied =
    stats.rituals +
    stats.compendium +
    stats.equipmentMods +
    stats.equipmentCurses +
    stats.origins +
    stats.classes +
    stats.trails +
    stats.insanityEffects +
    stats.interludeDishes;

  if (stats.totalApplied > 0) {
    loadedPackCount += 1;
  }
  lastApplyStats = stats;

  return stats;
}
