import { PrismaClient } from '@prisma/client';
import { getConfiguredAdminFilters } from './config';

function resolveSqliteUrlWithSingleConnection(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  if (raw.startsWith('file:') && !raw.includes('connection_limit=')) {
    const separator = raw.includes('?') ? '&' : '?';
    return `${raw}${separator}connection_limit=1`;
  }
  return raw;
}

const resolvedUrl = resolveSqliteUrlWithSingleConnection();

// Conexão central com o banco SQLite (com connection_limit=1 para evitar SQLITE_BUSY sob concorrência)
export const prisma = new PrismaClient(
  resolvedUrl ? { datasources: { db: { url: resolvedUrl } } } : undefined
);

export async function initDatabasePragmas(): Promise<void> {
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
  await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
}

export async function syncConfiguredAdmins(): Promise<void> {
  const { emails, usernames } = getConfiguredAdminFilters();
  if (emails.length === 0 && usernames.length === 0) return;

  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, isAdmin: true },
  });

  const emailSet = new Set(emails);
  const userSet = new Set(usernames);

  const idsToPromote = users
    .filter(
      (u) =>
        !u.isAdmin &&
        (emailSet.has(u.email.trim().toLowerCase()) ||
          userSet.has(u.username.trim().toLowerCase()))
    )
    .map((u) => u.id);

  if (idsToPromote.length > 0) {
    await prisma.user.updateMany({
      where: { id: { in: idsToPromote } },
      data: { isAdmin: true },
    });
    console.log(`👑 ${idsToPromote.length} conta(s) promovida(s) a Admin via .env.`);
  }
}
