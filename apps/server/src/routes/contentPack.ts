import { Router } from 'express';
import type { TotalRpgContentPack } from '@totalrpg/shared';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';
import {
  getLoadedContentPackState,
  saveImportedContentPack,
} from '../contentPackService';
import { resetOrdemCompendiumSync } from './compendium';
import {
  extractCleanIpFromRequest,
  recordAdminEvent,
  summarizeUserAgent,
} from '../adminTelemetryService';

export const contentPackRouter = Router();

const VALID_PACK_SECTIONS: Array<keyof TotalRpgContentPack> = [
  'compendium',
  'rituals',
  'equipmentMods',
  'equipmentCurses',
  'origins',
  'classes',
  'trails',
  'insanityEffects',
  'interludeDishes',
  'bestiary',
];

function isValidContentPackBody(body: unknown): body is TotalRpgContentPack {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return false;
  }
  const obj = body as Record<string, unknown>;
  return VALID_PACK_SECTIONS.some((key) => {
    const val = obj[key];
    return val !== undefined && val !== null && typeof val === 'object';
  });
}

contentPackRouter.get('/', (_req, res) => {
  return res.json(getLoadedContentPackState());
});

contentPackRouter.post('/import', authMiddleware as any, async (req: AuthenticatedRequest, res) => {
  try {
    const currentUser = req.userId
      ? await prisma.user.findUnique({
          where: { id: req.userId },
          select: { isAdmin: true },
        })
      : null;

    if (!currentUser?.isAdmin) {
      return res.status(403).json({
        error: 'Apenas administradores podem importar Content Packs no servidor.',
      });
    }

    if (!isValidContentPackBody(req.body)) {
      return res.status(400).json({
        error:
          'Arquivo JSON inválido: inclua ao menos uma seção válida de Content Pack (rituals, compendium, origins, etc.).',
      });
    }

    const stats = saveImportedContentPack(req.body);
    resetOrdemCompendiumSync();

    recordAdminEvent({
      category: 'system',
      userId: req.userId,
      username: req.username,
      summary: `Content Pack local importado por @${req.username || 'admin'}`,
      details: `${stats?.totalApplied ?? 0} descrições aplicadas`,
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: 'purple',
    });

    return res.json({
      message: 'Content Pack importado e aplicado com sucesso!',
      stats,
    });
  } catch (error) {
    console.error('Erro ao importar Content Pack:', error);
    return res.status(500).json({ error: 'Erro ao salvar Content Pack local.' });
  }
});
