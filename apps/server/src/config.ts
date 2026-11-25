import fs from 'node:fs';
import path from 'node:path';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';
export const SERVER_PORT = Number(process.env.PORT) || 3333;

export function getJwtSecret(): string {
  const raw = process.env.JWT_SECRET?.trim();
  if (IS_PRODUCTION) {
    if (!raw || raw === 'fallback_secret' || raw.length < 16) {
      throw new Error(
        'FATAL: Em produção (NODE_ENV=production), defina uma variável JWT_SECRET forte (mínimo de 16 caracteres) no arquivo .env.'
      );
    }
    return raw;
  }
  return raw || 'fallback_secret';
}

export function getCorsOrigin(): string | string[] | boolean {
  const raw = process.env.CORS_ORIGIN?.trim();
  if (!raw || raw === '*') return '*';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? list[0] : list;
}

export function getUploadsDir(): string {
  const dataDir = process.env.DATA_DIR?.trim();
  if (dataDir) {
    return path.resolve(dataDir, 'uploads');
  }
  return path.join(process.cwd(), 'uploads');
}

export function getPacksDir(): string {
  const dataDir = process.env.DATA_DIR?.trim();
  if (dataDir) {
    return path.resolve(dataDir, 'packs');
  }

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

export function getWebDistDir(): string | null {
  const candidates = [
    process.env.WEB_DIST_DIR?.trim(),
    path.resolve(__dirname, '../../web/dist'),
    path.resolve(process.cwd(), '../web/dist'),
    path.resolve(process.cwd(), 'apps/web/dist'),
  ].filter(Boolean) as string[];

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.html'))) {
      return dir;
    }
  }
  return null;
}

function parseEnvList(val?: string): Set<string> {
  if (!val) return new Set();
  return new Set(
    val
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isConfiguredAdminIdentity(email?: string | null, username?: string | null): boolean {
  const adminEmails = parseEnvList(process.env.ADMIN_EMAIL);
  const adminUsernames = parseEnvList(process.env.ADMIN_USERNAME);

  if (email && adminEmails.has(email.trim().toLowerCase())) {
    return true;
  }
  if (username && adminUsernames.has(username.trim().toLowerCase())) {
    return true;
  }
  return false;
}

export function getConfiguredAdminFilters(): { emails: string[]; usernames: string[] } {
  return {
    emails: Array.from(parseEnvList(process.env.ADMIN_EMAIL)),
    usernames: Array.from(parseEnvList(process.env.ADMIN_USERNAME)),
  };
}
