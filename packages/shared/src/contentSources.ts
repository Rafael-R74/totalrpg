import { SystemId } from './index';
import { ORDEM_ORIGINS, ORDEM_TRAILS } from './wizardData';
import { ORDEM_COMPENDIUM_ENTRIES } from './ordemCompendiumData';

export type ContentSourceId = string;

export interface ContentSourceDefinition {
  id: ContentSourceId;
  system: SystemId;
  name: string;
  shortName: string;
  isBaseBook?: boolean;
}

export const ORDEM_CONTENT_SOURCES: ContentSourceDefinition[] = [
  {
    id: 'ordem-base',
    system: 'ordem-paranormal',
    name: 'Livro Básico',
    shortName: 'Livro Básico',
    isBaseBook: true,
  },
  {
    id: 'sobrevivendo-ao-horror',
    system: 'ordem-paranormal',
    name: 'Sobrevivendo ao Horror',
    shortName: 'Sobrevivendo ao Horror',
  },
];

export const T20_CONTENT_SOURCES: ContentSourceDefinition[] = [
  {
    id: 't20-base',
    system: 'tormenta20',
    name: 'Livro Básico (Jogo do Ano)',
    shortName: 'Livro Básico',
    isBaseBook: true,
  },
];

export function getContentSourcesForSystem(system: SystemId): ContentSourceDefinition[] {
  if (system === 'ordem-paranormal') return ORDEM_CONTENT_SOURCES;
  if (system === 'tormenta20') return T20_CONTENT_SOURCES;
  return [];
}

export function getDefaultSourceIdForSystem(system: SystemId): string {
  if (system === 'ordem-paranormal') return 'ordem-base';
  if (system === 'tormenta20') return 't20-base';
  return 'base';
}

export function getSourceDisplayName(sourceId: string | undefined, system: SystemId = 'ordem-paranormal'): string {
  const effectiveId = sourceId || getDefaultSourceIdForSystem(system);
  const found = getContentSourcesForSystem(system).find((s) => s.id === effectiveId);
  return found?.name || effectiveId;
}

export function getSourceShortName(sourceId: string | undefined, system: SystemId = 'ordem-paranormal'): string {
  const effectiveId = sourceId || getDefaultSourceIdForSystem(system);
  const found = getContentSourcesForSystem(system).find((s) => s.id === effectiveId);
  return found?.shortName || effectiveId;
}

export function getEffectiveAllowedSources(
  allowedSources: unknown,
  system: SystemId
): string[] {
  const allForSystem = getContentSourcesForSystem(system).map((s) => s.id);
  if (!Array.isArray(allowedSources) || allowedSources.length === 0) {
    return allForSystem;
  }
  const valid = allowedSources.filter(
    (id): id is string => typeof id === 'string' && allForSystem.includes(id)
  );
  if (valid.length === 0) return allForSystem;
  // O livro básico é obrigatório: classes, trilhas e regras centrais vêm dele.
  const baseId = getContentSourcesForSystem(system).find((s) => s.isBaseBook)?.id;
  return baseId && !valid.includes(baseId) ? [baseId, ...valid] : valid;
}

/**
 * Regra de seleção das badges de filtro:
 * - [] significa "Todos" selecionado (exibe tudo permitido na aventura).
 * - Ao clicar em um suplemento quando "Todos" está ativo, passa a exibir APENAS ele ([clicked]).
 * - Ao clicar em outros suplementos, eles passam a ser exibidos juntos (união: [...current, clicked]),
 *   permanecendo preenchidos até que o usuário clique na badge "Todos" (ou desmarque todas).
 */
export function toggleContentSourceSelection(
  currentSelected: string[],
  clickedSourceId: string | 'ALL'
): string[] {
  if (clickedSourceId === 'ALL') {
    return [];
  }
  if (currentSelected.length === 0) {
    return [clickedSourceId];
  }
  if (currentSelected.includes(clickedSourceId)) {
    return currentSelected.filter((id) => id !== clickedSourceId);
  }
  return [...currentSelected, clickedSourceId];
}

export function matchesContentSourceFilter(
  entrySourceId: string | undefined,
  selectedSources: string[],
  allowedSources?: string[] | null,
  system: SystemId = 'ordem-paranormal'
): boolean {
  const src = entrySourceId || getDefaultSourceIdForSystem(system);
  if (Array.isArray(allowedSources) && allowedSources.length > 0) {
    if (!allowedSources.includes(src)) {
      return false;
    }
  }
  if (!selectedSources || selectedSources.length === 0) {
    return true;
  }
  return selectedSources.includes(src);
}

export function resolveEntrySourceId(
  entry:
    | {
        id?: string;
        name?: string;
        sourceId?: string;
        isParanormalInvention?: boolean;
        metadata?: { sourceId?: string };
      }
    | null
    | undefined,
  system: SystemId = 'ordem-paranormal'
): string {
  const fallback = getDefaultSourceIdForSystem(system);
  if (!entry) return fallback;
  if (entry.sourceId) return entry.sourceId;
  if (entry.metadata?.sourceId) return entry.metadata.sourceId;
  if (entry.isParanormalInvention) return 'sobrevivendo-ao-horror';

  if (system !== 'ordem-paranormal') return fallback;

  const rawId = (entry.id || '').trim();
  const rawName = (entry.name || '').trim().toLowerCase();

  if (rawId.startsWith('sah-')) {
    return 'sobrevivendo-ao-horror';
  }

  // Origem
  if (rawId.startsWith('orig-')) {
    const origId = rawId.replace(/^orig-/, '');
    const orig = ORDEM_ORIGINS.find((o) => o.id === origId);
    if (orig) return orig.sourceId || 'ordem-base';
  }

  // Trilha / Versatilidade
  const trailMatch = rawId.match(/^(?:trail|versatility)-([a-z0-9_]+)-\d+$/i);
  if (trailMatch) {
    const tr = ORDEM_TRAILS.find((t) => t.id === trailMatch[1]);
    if (tr) return tr.sourceId || 'ordem-base';
  }

  // Compêndio por ID (direto ou com prefixos de build)
  const strippedCompId = rawId
    .replace(/^cult-/, '')
    .replace(/^build-pwr-\d+-/, '')
    .replace(/^rit-nex99-/, '')
    .replace(/^rit-/, '')
    .replace(/-(?:sangue|morte|conhecimento|energia|medo)$/i, '');

  const byId = ORDEM_COMPENDIUM_ENTRIES.find(
    (e) => e.id === rawId || e.id === strippedCompId
  );
  if (byId) {
    return byId.metadata?.sourceId || 'ordem-base';
  }

  // Itens especiais gerados por origens de suplementos
  if (
    rawName.startsWith('invento paranormal') ||
    rawName.includes('ingrediente paranormal')
  ) {
    return 'sobrevivendo-ao-horror';
  }

  // Compêndio por nome exato
  if (rawName) {
    const cleanName = rawName.split('(')[0].trim();
    const byName = ORDEM_COMPENDIUM_ENTRIES.find((e) => {
      const en = e.name.trim().toLowerCase();
      return en === rawName || en.split('(')[0].trim() === cleanName;
    });
    if (byName) {
      return byName.metadata?.sourceId || 'ordem-base';
    }
  }

  return fallback;
}

export interface CharacterSourceViolation {
  itemLabel: string;
  categoryLabel: string;
  sourceId: string;
  sourceName: string;
}

export function validateCharacterSourcesForCampaign(
  character: {
    system: string;
    sheetData?: Record<string, any> | null;
    inventory?: any[] | null;
  },
  allowedSources: unknown
): {
  ok: boolean;
  violations: CharacterSourceViolation[];
  errorMessage?: string;
} {
  const system = character.system as SystemId;
  const allSources = getContentSourcesForSystem(system);
  if (allSources.length === 0 || !Array.isArray(allowedSources) || allowedSources.length === 0) {
    return { ok: true, violations: [] };
  }

  const allowedSet = new Set(
    allowedSources.filter((s): s is string => typeof s === 'string')
  );
  if (allowedSet.size === 0) {
    return { ok: true, violations: [] };
  }

  const violations: CharacterSourceViolation[] = [];
  const seenKeys = new Set<string>();

  const addViolation = (categoryLabel: string, itemLabel: string, sourceId: string) => {
    const dedup = `${categoryLabel}:${itemLabel.toLowerCase()}`;
    if (seenKeys.has(dedup)) return;
    seenKeys.add(dedup);
    violations.push({
      categoryLabel,
      itemLabel,
      sourceId,
      sourceName: getSourceDisplayName(sourceId, system),
    });
  };

  const sheet = (character.sheetData || {}) as Record<string, any>;

  if (system === 'ordem-paranormal') {
    // 1. Origem
    const rawOrigin = String(sheet.origin || '').trim().toLowerCase();
    if (rawOrigin) {
      const orig = ORDEM_ORIGINS.find(
        (o) => o.id === rawOrigin || o.name.toLowerCase() === rawOrigin
      );
      if (orig) {
        const src = orig.sourceId || 'ordem-base';
        if (!allowedSet.has(src)) {
          addViolation('Origem', orig.name, src);
        }
      }
    }

    // 2. Trilha
    const rawTrail = String(sheet.trail || '').trim().toLowerCase();
    if (rawTrail) {
      const tr = ORDEM_TRAILS.find(
        (t) => t.id === rawTrail || t.name.toLowerCase() === rawTrail
      );
      if (tr) {
        const src = tr.sourceId || 'ordem-base';
        if (!allowedSet.has(src)) {
          addViolation('Trilha', tr.name, src);
        }
      }
    }

    // 3. Habilidades / Poderes / Rituais
    const abilities = Array.isArray(sheet.abilities) ? sheet.abilities : [];
    for (const ab of abilities) {
      if (!ab || ab.category === 'origem') continue;
      const src = resolveEntrySourceId(ab, system);
      if (!allowedSet.has(src)) {
        const catLabel =
          ab.category === 'ritual'
            ? 'Ritual'
            : ab.category === 'poder_paranormal'
            ? 'Poder Paranormal'
            : 'Poder';
        addViolation(catLabel, String(ab.name || 'Habilidade'), src);
      }
    }

    // 4. Inventário
    const inv = Array.isArray(character.inventory) ? character.inventory : [];
    for (const item of inv) {
      if (!item) continue;
      const src = resolveEntrySourceId(item, system);
      if (!allowedSet.has(src)) {
        addViolation('Item', String(item.name || 'Equipamento'), src);
      }
    }
  }

  if (violations.length === 0) {
    return { ok: true, violations: [] };
  }

  const summaryItems = violations
    .slice(0, 4)
    .map((v) => `${v.categoryLabel} "${v.itemLabel}" (${v.sourceName})`)
    .join(', ');
  const extraCount = violations.length > 4 ? ` e mais ${violations.length - 4}` : '';

  return {
    ok: false,
    violations,
    errorMessage: `Personagem bloqueado pelas regras da mesa — contém conteúdos de suplementos não permitidos pelo Mestre: ${summaryItems}${extraCount}.`,
  };
}
