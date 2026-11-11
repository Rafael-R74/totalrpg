import { PrismaClient } from '@prisma/client';

// Conexão central com o banco SQLite
export const prisma = new PrismaClient();