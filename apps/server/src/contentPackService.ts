import fs from 'node:fs';
import path from 'node:path';
import {
  applyContentPack,
  mergeContentPacks,
  type ContentPackApplyStats,
  type TotalRpgContentPack,
} from '@totalrpg/shared';

let cachedMergedPack: TotalRpgContentPack | null = null;
let loadedPackFiles: string[] = [];
let cachedStats: ContentPackApplyStats | null = null;

function resolvePacksDirectory(): string {
  const candidates = [
    path.resolve(__dirname, '../../../data/packs'),
    path.resolve(process.cwd(), 'data/packs'),
    path.resolve(process.cwd(), '../../data/packs'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return candidates[0];
}

export function loadLocalContentPacks(): ContentPackApplyStats | null {
  const packsDir = resolvePacksDirectory();

  if (!fs.existsSync(packsDir)) {
    cachedMergedPack = null;
    loadedPackFiles = [];
    cachedStats = null;
    console.log(
      'ℹ️ Nenhum Content Pack local encontrado em data/packs — executando em modo base (BYOC).'
    );
    return null;
  }

  const files = fs
    .readdirSync(packsDir)
    .filter((file) => file.endsWith('.json') && !file.endsWith('.example.json'))
    .sort((a, b) => a.localeCompare(b));

  const parsedPacks: TotalRpgContentPack[] = [];
  const validFiles: string[] = [];

  for (const file of files) {
    try {
      const fullPath = path.join(packsDir, file);
      const raw = fs.readFileSync(fullPath, 'utf8');
      const parsed = JSON.parse(raw) as TotalRpgContentPack;
      if (parsed && typeof parsed === 'object') {
        parsedPacks.push(parsed);
        validFiles.push(file);
      }
    } catch (err) {
      console.error(`⚠️ Falha ao carregar Content Pack "${file}":`, err);
    }
  }

  if (parsedPacks.length === 0) {
    cachedMergedPack = null;
    loadedPackFiles = [];
    cachedStats = null;
    console.log(
      'ℹ️ Nenhum Content Pack local encontrado em data/packs — executando em modo base (BYOC).'
    );
    return null;
  }

  const merged = mergeContentPacks(parsedPacks);
  const stats = applyContentPack(merged);

  cachedMergedPack = merged;
  loadedPackFiles = validFiles;
  cachedStats = stats;

  console.log(
    `📦 Content Pack local carregado (${validFiles.length} arquivo${validFiles.length > 1 ? 's' : ''}, ${stats.totalApplied} descrições aplicadas)`
  );

  return stats;
}

export function saveImportedContentPack(
  pack: TotalRpgContentPack
): ContentPackApplyStats | null {
  const packsDir = resolvePacksDirectory();
  fs.mkdirSync(packsDir, { recursive: true });

  const targetFile = path.join(packsDir, 'imported.local.json');
  fs.writeFileSync(targetFile, JSON.stringify(pack, null, 2), 'utf8');

  return loadLocalContentPacks();
}

export function getLoadedContentPackState(): {
  loaded: boolean;
  files: string[];
  stats: ContentPackApplyStats | null;
  pack: TotalRpgContentPack | null;
} {
  return {
    loaded: loadedPackFiles.length > 0 && cachedMergedPack !== null,
    files: [...loadedPackFiles],
    stats: cachedStats,
    pack: cachedMergedPack,
  };
}
