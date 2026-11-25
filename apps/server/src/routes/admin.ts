import { Router, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/authMiddleware';
import {
  clearAdminEvents,
  disconnectUserSockets,
  extractCleanIpFromRequest,
  getTelemetrySnapshot,
  recordAdminEvent,
  removeUserTelemetryRecord,
  summarizeUserAgent,
} from '../adminTelemetryService';
import {
  getAdminSettings,
  getPublicPlatformStatus,
  getUserSuspension,
  setUserSuspension,
  updateAdminSettings,
} from '../adminSettingsService';
import { deleteUserPrefs, readAllUserPrefs } from './auth';
import { getUploadsDir } from '../config';
import { getLoadedContentPackState } from '../contentPackService';
import { VitalBar } from '@totalrpg/shared';

export const adminRouter = Router();

adminRouter.use(authMiddleware as any);

async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { isAdmin: true, username: true },
    });
    if (!user?.isAdmin) {
      return res.status(403).json({
        error: 'Acesso restrito exclusivamente a administradores da plataforma.',
      });
    }
    req.username = user.username;
    return next();
  } catch (error) {
    console.error('Erro na verificação de admin:', error);
    return res.status(500).json({ error: 'Erro interno ao validar permissão de administrador.' });
  }
}

adminRouter.use(requireAdmin as any);

function resolveSqliteDiskUsageBytes(): number {
  const rawUrl = process.env.DATABASE_URL?.trim() || 'file:./dev.db';
  if (!rawUrl.startsWith('file:')) return 0;

  const cleanRelOrAbs = rawUrl.replace(/^file:/, '').split('?')[0];
  const candidates = [
    path.isAbsolute(cleanRelOrAbs) ? cleanRelOrAbs : '',
    path.resolve(process.cwd(), 'prisma', cleanRelOrAbs),
    path.resolve(process.cwd(), 'apps/server/prisma', cleanRelOrAbs),
    path.resolve(__dirname, '../../prisma', cleanRelOrAbs),
  ].filter(Boolean);

  for (const baseFile of candidates) {
    if (fs.existsSync(baseFile)) {
      let total = 0;
      for (const suffix of ['', '-wal', '-shm', '-journal']) {
        const target = `${baseFile}${suffix}`;
        if (fs.existsSync(target)) {
          try {
            total += fs.statSync(target).size;
          } catch {
            // ignore
          }
        }
      }
      return total;
    }
  }
  return 0;
}

function resolveUploadsStats(): { count: number; totalBytes: number } {
  try {
    const dir = getUploadsDir();
    if (!fs.existsSync(dir)) return { count: 0, totalBytes: 0 };
    const files = fs.readdirSync(dir);
    let totalBytes = 0;
    let count = 0;
    for (const name of files) {
      const full = path.join(dir, name);
      try {
        const st = fs.statSync(full);
        if (st.isFile()) {
          count += 1;
          totalBytes += st.size;
        }
      } catch {
        // ignore
      }
    }
    return { count, totalBytes };
  } catch {
    return { count: 0, totalBytes: 0 };
  }
}

// 1. Visão Geral Completa da Plataforma
adminRouter.get('/overview', async (_req: AuthenticatedRequest, res) => {
  try {
    const [users, characters, campaigns, compendiumCount, skillsCount] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          isAdmin: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.character.findMany({
        select: {
          id: true,
          name: true,
          portraitUrl: true,
          system: true,
          vitals: true,
          sheetData: true,
          ownerId: true,
          owner: { select: { id: true, username: true } },
          campaignId: true,
          campaign: { select: { id: true, name: true, system: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.campaign.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          system: true,
          inviteCode: true,
          requiredNex: true,
          requiredPatent: true,
          lockAllSheets: true,
          allowTrade: true,
          createdAt: true,
          dmId: true,
          dm: { select: { id: true, username: true } },
          characters: {
            select: {
              id: true,
              name: true,
              owner: { select: { username: true } },
            },
          },
          invites: {
            select: {
              id: true,
              status: true,
              user: { select: { username: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.compendiumEntry.count(),
      prisma.systemSkill.count(),
    ]);

    const allPrefs = readAllUserPrefs();
    const adminSettings = getAdminSettings();
    const { events, users: userMeta, liveConnections } = getTelemetrySnapshot();

    const liveByUserId = new Map<string, typeof liveConnections>();
    let guestSocketsCount = 0;
    for (const conn of liveConnections) {
      if (conn.userId) {
        const list = liveByUserId.get(conn.userId) || [];
        list.push(conn);
        liveByUserId.set(conn.userId, list);
      } else {
        guestSocketsCount += 1;
      }
    }

    const charsByOwner = new Map<string, Array<{ id: string; name: string; system: string }>>();
    const charactersBySystem: Record<string, number> = {
      'ordem-paranormal': 0,
      tormenta20: 0,
      duna: 0,
    };
    let charactersInCampaigns = 0;

    const formattedCharacters = characters.map((c) => {
      charactersBySystem[c.system] = (charactersBySystem[c.system] || 0) + 1;
      if (c.campaignId) charactersInCampaigns += 1;

      const ownerList = charsByOwner.get(c.ownerId) || [];
      ownerList.push({ id: c.id, name: c.name, system: c.system });
      charsByOwner.set(c.ownerId, ownerList);

      const sheet = (c.sheetData && typeof c.sheetData === 'object' ? c.sheetData : {}) as Record<
        string,
        any
      >;
      const vitals = Array.isArray(c.vitals) ? (c.vitals as unknown as VitalBar[]) : [];

      return {
        id: c.id,
        name: c.name,
        portraitUrl: c.portraitUrl || '',
        system: c.system,
        ownerId: c.ownerId,
        ownerUsername: c.owner.username,
        campaignId: c.campaign?.id || null,
        campaignName: c.campaign?.name || null,
        summary: {
          className: sheet.className || sheet.class || null,
          trail: sheet.trail || null,
          origin: sheet.origin || null,
          nex: typeof sheet.nex === 'number' ? sheet.nex : null,
          level: typeof sheet.level === 'number' ? sheet.level : null,
          patent: sheet.patent || null,
        },
        vitals: vitals.slice(0, 3).map((v) => ({
          id: v.id,
          label: v.label,
          current: v.current,
          max: v.max,
          color: v.color,
        })),
      };
    });

    const dmCountByUser = new Map<string, number>();
    let pendingInvites = 0;
    const formattedCampaigns = campaigns.map((camp) => {
      dmCountByUser.set(camp.dmId, (dmCountByUser.get(camp.dmId) || 0) + 1);
      const pending = camp.invites.filter((i) => i.status === 'PENDING').length;
      pendingInvites += pending;
      return {
        id: camp.id,
        name: camp.name,
        description: camp.description || '',
        system: camp.system,
        inviteCode: camp.inviteCode,
        createdAt: camp.createdAt,
        dmUsername: camp.dm.username,
        lockAllSheets: camp.lockAllSheets,
        allowTrade: camp.allowTrade,
        requiredNex: camp.requiredNex,
        requiredPatent: camp.requiredPatent,
        playersCount: camp.characters.length,
        pendingInvitesCount: pending,
        characters: camp.characters.map((ch) => ({
          id: ch.id,
          name: ch.name,
          ownerUsername: ch.owner.username,
        })),
      };
    });

    const paletteCounts: Record<string, number> = {};
    const artDirectionCounts: Record<string, number> = {};
    const diceModeCounts: Record<string, number> = {};
    let autoSystemThemeCount = 0;

    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    let activeUsers24h = 0;
    let adminsCount = 0;
    let suspendedCount = 0;

    const formattedUsers = users.map((u) => {
      if (u.isAdmin) adminsCount += 1;
      const suspension = getUserSuspension(u.id);
      if (suspension) suspendedCount += 1;

      const rawPref = (allPrefs[u.id] || {}) as Record<string, any>;
      const liveList = liveByUserId.get(u.id) || [];
      const primaryLive = liveList[0];
      const meta = userMeta[u.id];

      const palette = String(primaryLive?.palette || rawPref.palette || 'ordo-crimson');
      const artDirection = String(primaryLive?.artDirection || rawPref.artDirection || 'dossier');
      const diceMode = String(primaryLive?.diceMode || rawPref.dice || 'auto');
      const autoSystemTheme =
        typeof rawPref.autoSystemTheme === 'boolean' ? rawPref.autoSystemTheme : true;
      const density = rawPref.density === 'compact' ? 'compact' : 'comfortable';
      const hasSavedCustomPrefs = Boolean(allPrefs[u.id]);

      paletteCounts[palette] = (paletteCounts[palette] || 0) + 1;
      artDirectionCounts[artDirection] = (artDirectionCounts[artDirection] || 0) + 1;
      diceModeCounts[diceMode] = (diceModeCounts[diceMode] || 0) + 1;
      if (autoSystemTheme) autoSystemThemeCount += 1;

      const lastSeenAt = primaryLive
        ? now
        : meta?.lastSeenAt || meta?.lastLoginAt || new Date(u.createdAt).getTime();

      if (lastSeenAt >= dayAgo) {
        activeUsers24h += 1;
      }

      return {
        id: u.id,
        username: u.username,
        email: u.email,
        isAdmin: u.isAdmin,
        isSuspended: Boolean(suspension),
        suspendReason: suspension?.reason || null,
        createdAt: u.createdAt,
        isOnline: liveList.length > 0,
        openTabsCount: liveList.length,
        currentView: primaryLive?.view || meta?.lastView || null,
        currentContextLabel: primaryLive?.contextLabel || meta?.lastContextLabel || null,
        lastSeenAt,
        lastLoginAt: meta?.lastLoginAt || null,
        loginCount: meta?.loginCount || 0,
        totalRolls: meta?.totalRolls || 0,
        lastIp: primaryLive?.ip || meta?.lastIp || null,
        device: primaryLive?.device || meta?.lastDevice || null,
        theme: {
          palette,
          artDirection,
          diceMode,
          density,
          autoSystemTheme,
          hasSavedCustomPrefs,
        },
        charactersCount: (charsByOwner.get(u.id) || []).length,
        campaignsAsDmCount: dmCountByUser.get(u.id) || 0,
        characters: charsByOwner.get(u.id) || [],
      };
    });

    const mem = process.memoryUsage();
    const uploadsStats = resolveUploadsStats();
    const sqliteBytes = resolveSqliteDiskUsageBytes();
    const packState = getLoadedContentPackState();

    return res.json({
      generatedAt: now,
      settings: {
        allowRegistration: adminSettings.allowRegistration,
        registrationInviteCode: adminSettings.registrationInviteCode,
        maintenanceMode: adminSettings.maintenanceMode,
        maintenanceMessage: adminSettings.maintenanceMessage,
        announcementBanner: adminSettings.announcementBanner,
      },
      serverHealth: {
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        memoryRssMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        memoryHeapMb: Math.round((mem.heapUsed / 1024 / 1024) * 10) / 10,
        memoryLimitMb: 512,
        sqliteBytes,
        uploadsCount: uploadsStats.count,
        uploadsBytes: uploadsStats.totalBytes,
        contentPackLoaded: packState.loaded,
        contentPackFiles: packState.files,
      },
      totals: {
        totalUsers: users.length,
        adminsCount,
        suspendedCount,
        activeUsers24h,
        onlineAuthenticatedUsers: liveByUserId.size,
        onlineGuestSockets: guestSocketsCount,
        totalLiveSockets: liveConnections.length,
        totalCharacters: characters.length,
        charactersInCampaigns,
        charactersInVault: characters.length - charactersInCampaigns,
        charactersBySystem,
        totalCampaigns: campaigns.length,
        pendingInvites,
        compendiumEntries: compendiumCount,
        systemSkills: skillsCount,
        totalEventsLogged: events.length,
      },
      themeStats: {
        palettes: paletteCounts,
        artDirections: artDirectionCounts,
        diceModes: diceModeCounts,
        autoSystemThemeCount,
      },
      liveConnections,
      users: formattedUsers,
      characters: formattedCharacters,
      campaigns: formattedCampaigns,
      events: events.slice(0, 250),
    });
  } catch (error) {
    console.error('Erro ao montar overview de admin:', error);
    return res.status(500).json({ error: 'Erro ao carregar visão geral administrativa.' });
  }
});

// 2. Atualizar Configurações Globais (Bloqueio de Cadastro, Chave Beta, Manutenção, Banner)
adminRouter.put('/settings', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      allowRegistration,
      registrationInviteCode,
      maintenanceMode,
      maintenanceMessage,
      announcementBanner,
    } = req.body || {};

    const updated = updateAdminSettings({
      allowRegistration,
      registrationInviteCode,
      maintenanceMode,
      maintenanceMessage,
      announcementBanner,
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('platform:statusUpdated', getPublicPlatformStatus());
    }

    const summaryParts: string[] = [];
    if (typeof allowRegistration === 'boolean') {
      summaryParts.push(
        allowRegistration
          ? 'Cadastros abertos'
          : updated.registrationInviteCode
            ? 'Cadastros restritos por chave'
            : 'Cadastros bloqueados'
      );
    }
    if (typeof maintenanceMode === 'boolean') {
      summaryParts.push(maintenanceMode ? 'Modo Manutenção ATIVADO' : 'Modo Manutenção desativado');
    }
    if (typeof announcementBanner === 'string') {
      summaryParts.push(announcementBanner.trim() ? 'Aviso global publicado' : 'Aviso global removido');
    }

    recordAdminEvent({
      category: 'system',
      userId: req.userId,
      username: req.username,
      summary: `@${req.username} atualizou configurações globais (${summaryParts.join(' • ') || 'ajustes salvos'})`,
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: 'purple',
    });

    return res.json({
      settings: {
        allowRegistration: updated.allowRegistration,
        registrationInviteCode: updated.registrationInviteCode,
        maintenanceMode: updated.maintenanceMode,
        maintenanceMessage: updated.maintenanceMessage,
        announcementBanner: updated.announcementBanner,
      },
    });
  } catch (error) {
    console.error('Erro ao salvar configurações admin:', error);
    return res.status(500).json({ error: 'Erro ao salvar configurações administrativas.' });
  }
});

// 3. Criar Novo Usuário Manualmente pelo Admin (mesmo com cadastro público fechado)
adminRouter.post('/users', async (req: AuthenticatedRequest, res) => {
  try {
    const username = String(req.body?.username || '').trim();
    const email = String(req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const isAdmin = Boolean(req.body?.isAdmin);

    if (!username || !email || password.length < 4) {
      return res.status(400).json({
        error: 'Informe nome de usuário, e-mail e uma senha de pelo menos 4 caracteres.',
      });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'Já existe uma conta com esse nome de usuário ou e-mail.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        isAdmin,
      },
      select: { id: true, username: true, email: true, isAdmin: true, createdAt: true },
    });

    recordAdminEvent({
      category: 'system',
      userId: req.userId,
      username: req.username,
      summary: `@${req.username} criou manualmente a conta @${created.username}`,
      details: `${created.email}${created.isAdmin ? ' • Criado como Admin' : ''}`,
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: 'success',
    });

    return res.status(201).json({ user: created });
  } catch (error) {
    console.error('Erro ao criar usuário via admin:', error);
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
});

// 4. Editar Dados de um Usuário (username, e-mail, redefinir senha, admin, suspensão)
adminRouter.put('/users/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const targetId = String(req.params.id || '');
    if (!targetId) {
      return res.status(400).json({ error: 'ID de usuário inválido.' });
    }

    const existing = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, username: true, email: true, isAdmin: true },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const nextUsername =
      typeof req.body?.username === 'string' ? req.body.username.trim() : existing.username;
    const nextEmail =
      typeof req.body?.email === 'string' ? req.body.email.trim() : existing.email;
    const newPassword =
      typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const nextIsAdmin =
      typeof req.body?.isAdmin === 'boolean' ? req.body.isAdmin : existing.isAdmin;
    const nextSuspended =
      typeof req.body?.isSuspended === 'boolean'
        ? req.body.isSuspended
        : Boolean(getUserSuspension(targetId));
    const suspendReason =
      typeof req.body?.suspendReason === 'string' ? req.body.suspendReason.trim() : undefined;

    if (!nextUsername || !nextEmail) {
      return res.status(400).json({ error: 'Nome de usuário e e-mail não podem ficar vazios.' });
    }

    if (targetId === req.userId && !nextIsAdmin) {
      return res.status(400).json({
        error: 'Você não pode remover sua própria permissão de Administrador.',
      });
    }

    if (targetId === req.userId && nextSuspended) {
      return res.status(400).json({
        error: 'Você não pode suspender sua própria conta de Administrador.',
      });
    }

    if (nextUsername !== existing.username || nextEmail !== existing.email) {
      const conflict = await prisma.user.findFirst({
        where: {
          id: { not: targetId },
          OR: [{ username: nextUsername }, { email: nextEmail }],
        },
      });
      if (conflict) {
        return res.status(409).json({
          error: 'Já existe outro usuário utilizando esse nome de usuário ou e-mail.',
        });
      }
    }

    const updateData: Record<string, any> = {
      username: nextUsername,
      email: nextEmail,
      isAdmin: nextIsAdmin,
    };

    const changes: string[] = [];
    if (nextUsername !== existing.username) changes.push(`usuário: ${existing.username} → ${nextUsername}`);
    if (nextEmail !== existing.email) changes.push(`e-mail alterado`);
    if (nextIsAdmin !== existing.isAdmin) {
      changes.push(nextIsAdmin ? 'promovido a Admin' : 'Admin revogado');
    }

    if (newPassword.trim()) {
      if (newPassword.trim().length < 4) {
        return res.status(400).json({ error: 'A nova senha deve ter pelo menos 4 caracteres.' });
      }
      updateData.password = await bcrypt.hash(newPassword.trim(), 10);
      changes.push('senha redefinida');
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: updateData,
      select: { id: true, username: true, email: true, isAdmin: true },
    });

    const wasSuspended = Boolean(getUserSuspension(targetId));
    setUserSuspension(targetId, nextSuspended, {
      reason: suspendReason,
      suspendedBy: req.username,
    });

    if (nextSuspended !== wasSuspended) {
      changes.push(nextSuspended ? 'conta SUSPENSA' : 'conta reativada');
      if (nextSuspended) {
        disconnectUserSockets(
          targetId,
          suspendReason
            ? `Sua conta foi suspensa pelo administrador: ${suspendReason}`
            : 'Sua conta foi suspensa pelo administrador.'
        );
      }
    }

    recordAdminEvent({
      category: 'system',
      userId: req.userId,
      username: req.username,
      summary: `@${req.username} editou a conta @${updated.username}`,
      details: changes.join(' • ') || 'Dados atualizados',
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: nextSuspended ? 'warning' : 'info',
    });

    return res.json({ user: updated });
  } catch (error) {
    console.error('Erro ao editar usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar dados do usuário.' });
  }
});

// 5. Atalho rápido: Alternar permissão de Admin
adminRouter.post('/users/:id/toggle-admin', async (req: AuthenticatedRequest, res) => {
  try {
    const targetId = String(req.params.id || '');
    if (!targetId) {
      return res.status(400).json({ error: 'ID de usuário inválido.' });
    }
    if (targetId === req.userId) {
      return res.status(400).json({
        error: 'Por segurança, você não pode remover sua própria permissão de Administrador.',
      });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, username: true, isAdmin: true },
    });
    if (!target) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const updated = await prisma.user.update({
      where: { id: targetId },
      data: { isAdmin: !target.isAdmin },
      select: { id: true, username: true, isAdmin: true },
    });

    recordAdminEvent({
      category: 'system',
      userId: req.userId,
      username: req.username,
      summary: updated.isAdmin
        ? `Promoveu @${updated.username} a Administrador`
        : `Revogou permissão de Administrador de @${updated.username}`,
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: updated.isAdmin ? 'purple' : 'warning',
    });

    return res.json({ user: updated });
  } catch (error) {
    console.error('Erro ao alternar admin:', error);
    return res.status(500).json({ error: 'Erro ao alterar permissão do usuário.' });
  }
});

// 6. Desconectar sessões ativas de um usuário (Kick / Forçar Logout)
adminRouter.post('/users/:id/kick', async (req: AuthenticatedRequest, res) => {
  try {
    const targetId = String(req.params.id || '');
    if (targetId === req.userId) {
      return res.status(400).json({ error: 'Você não pode desconectar sua própria sessão atual.' });
    }
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { username: true },
    });
    if (!target) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const disconnectedCount = disconnectUserSockets(
      targetId,
      'Sua sessão foi encerrada pelo administrador.'
    );

    recordAdminEvent({
      category: 'system',
      userId: req.userId,
      username: req.username,
      summary: `@${req.username} encerrou as sessões ativas de @${target.username} (${disconnectedCount} aba(s))`,
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: 'warning',
    });

    return res.json({ disconnectedCount });
  } catch (error) {
    console.error('Erro ao desconectar usuário:', error);
    return res.status(500).json({ error: 'Erro ao desconectar sessões do usuário.' });
  }
});

// 7. Excluir permanentemente um usuário (com cascata transacional segura)
adminRouter.delete('/users/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const targetId = String(req.params.id || '');
    if (!targetId) {
      return res.status(400).json({ error: 'ID de usuário inválido.' });
    }
    if (targetId === req.userId) {
      return res.status(400).json({
        error: 'Você não pode excluir sua própria conta de Administrador.',
      });
    }

    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, username: true, email: true },
    });
    if (!target) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Desconecta imediatamente qualquer aba aberta desse usuário
    disconnectUserSockets(targetId, 'Sua conta foi removida pelo administrador.');

    // Busca campanhas mestradas por ele para devolver fichas de terceiros ao Cofre sem quebrar FKs
    const dmCampaigns = await prisma.campaign.findMany({
      where: { dmId: targetId },
      select: { id: true },
    });
    const dmCampaignIds = dmCampaigns.map((c) => c.id);

    await prisma.$transaction([
      ...(dmCampaignIds.length > 0
        ? [
            prisma.character.updateMany({
              where: { campaignId: { in: dmCampaignIds } },
              data: { campaignId: null },
            }),
            prisma.campaignInvite.deleteMany({
              where: { campaignId: { in: dmCampaignIds } },
            }),
            prisma.campaign.deleteMany({
              where: { id: { in: dmCampaignIds } },
            }),
          ]
        : []),
      prisma.campaignInvite.deleteMany({
        where: { userId: targetId },
      }),
      prisma.character.deleteMany({
        where: { ownerId: targetId },
      }),
      prisma.user.delete({
        where: { id: targetId },
      }),
    ]);

    deleteUserPrefs(targetId);
    setUserSuspension(targetId, false);
    removeUserTelemetryRecord(targetId);

    recordAdminEvent({
      category: 'system',
      userId: req.userId,
      username: req.username,
      summary: `@${req.username} excluiu permanentemente a conta @${target.username} (${target.email})`,
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: 'danger',
    });

    return res.json({ message: `Conta @${target.username} excluída com sucesso.` });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao excluir usuário.' });
  }
});

// 8. Editar / Transferir Personagem pelo Admin
adminRouter.put('/characters/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const charId = String(req.params.id || '');
    const existing = await prisma.character.findUnique({
      where: { id: charId },
      include: { owner: { select: { username: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Personagem não encontrado.' });
    }

    const nextName =
      typeof req.body?.name === 'string' && req.body.name.trim()
        ? req.body.name.trim()
        : existing.name;
    const nextOwnerId =
      typeof req.body?.ownerId === 'string' && req.body.ownerId
        ? req.body.ownerId
        : existing.ownerId;
    const nextCampaignId =
      req.body?.campaignId === null
        ? null
        : typeof req.body?.campaignId === 'string'
          ? req.body.campaignId || null
          : existing.campaignId;

    const updated = await prisma.character.update({
      where: { id: charId },
      data: {
        name: nextName,
        ownerId: nextOwnerId,
        campaignId: nextCampaignId,
      },
      include: { owner: { select: { username: true } } },
    });

    recordAdminEvent({
      category: 'character',
      userId: req.userId,
      username: req.username,
      summary: `@${req.username} editou o personagem "${updated.name}" (dono: @${updated.owner.username})`,
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: 'info',
    });

    return res.json({ character: updated });
  } catch (error) {
    console.error('Erro ao editar personagem pelo admin:', error);
    return res.status(500).json({ error: 'Erro ao atualizar personagem.' });
  }
});

// 9. Excluir Personagem pelo Admin
adminRouter.delete('/characters/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const charId = String(req.params.id || '');
    const existing = await prisma.character.findUnique({
      where: { id: charId },
      include: { owner: { select: { username: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Personagem não encontrado.' });
    }

    await prisma.character.delete({ where: { id: charId } });

    recordAdminEvent({
      category: 'character',
      userId: req.userId,
      username: req.username,
      summary: `@${req.username} excluiu o personagem "${existing.name}" (era de @${existing.owner.username})`,
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: 'danger',
    });

    return res.json({ message: 'Personagem excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir personagem pelo admin:', error);
    return res.status(500).json({ error: 'Erro ao excluir personagem.' });
  }
});

// 10. Excluir Campanha pelo Admin (devolvendo personagens intactos aos cofres)
adminRouter.delete('/campaigns/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const campaignId = String(req.params.id || '');
    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { dm: { select: { username: true } } },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Campanha não encontrada.' });
    }

    await prisma.$transaction([
      prisma.character.updateMany({
        where: { campaignId },
        data: { campaignId: null },
      }),
      prisma.campaignInvite.deleteMany({ where: { campaignId } }),
      prisma.campaign.delete({ where: { id: campaignId } }),
    ]);

    recordAdminEvent({
      category: 'campaign',
      userId: req.userId,
      username: req.username,
      summary: `@${req.username} excluiu a campanha "${existing.name}" (Mestre: @${existing.dm.username})`,
      ip: extractCleanIpFromRequest(req),
      device: summarizeUserAgent(req.headers['user-agent']),
      tone: 'danger',
    });

    return res.json({ message: 'Campanha excluída e fichas devolvidas aos cofres.' });
  } catch (error) {
    console.error('Erro ao excluir campanha pelo admin:', error);
    return res.status(500).json({ error: 'Erro ao excluir campanha.' });
  }
});

// 11. Limpar histórico de eventos do painel
adminRouter.delete('/events', async (req: AuthenticatedRequest, res) => {
  clearAdminEvents();
  recordAdminEvent({
    category: 'system',
    userId: req.userId,
    username: req.username,
    summary: `Histórico de atividades limpo por @${req.username}`,
    ip: extractCleanIpFromRequest(req),
    device: summarizeUserAgent(req.headers['user-agent']),
    tone: 'neutral',
  });
  return res.json({ message: 'Histórico de eventos limpo com sucesso.' });
});
