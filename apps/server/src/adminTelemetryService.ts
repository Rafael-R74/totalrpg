import fs from 'node:fs';
import path from 'node:path';
import type { Request } from 'express';
import type { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { PresenceUpdatePayload, PresenceViewId, SystemId } from '@totalrpg/shared';
import { getJwtSecret, getPacksDir } from './config';

export type AdminEventCategory =
  | 'auth'
  | 'connection'
  | 'theme'
  | 'character'
  | 'campaign'
  | 'dice'
  | 'system';

export type AdminEventTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';

export interface AdminPlatformEvent {
  id: string;
  createdAt: number;
  category: AdminEventCategory;
  userId?: string;
  username?: string;
  summary: string;
  details?: string;
  ip?: string;
  device?: string;
  tone?: AdminEventTone;
}

export interface UserTelemetryRecord {
  lastSeenAt?: number;
  lastLoginAt?: number;
  loginCount: number;
  totalRolls: number;
  lastIp?: string;
  lastDevice?: string;
  lastView?: PresenceViewId;
  lastContextLabel?: string;
}

export interface LiveConnectionInfo {
  socketId: string;
  userId?: string;
  username?: string;
  connectedAt: number;
  lastActivityAt: number;
  ip: string;
  device: string;
  view: PresenceViewId;
  contextLabel?: string;
  system?: SystemId | null;
  palette?: string;
  artDirection?: string;
  diceMode?: string;
}

interface PersistedTelemetryStore {
  events: AdminPlatformEvent[];
  users: Record<string, UserTelemetryRecord>;
}

const MAX_ADMIN_EVENTS = 600;
const JWT_SECRET = getJwtSecret();

let storeLoaded = false;
let persistedStore: PersistedTelemetryStore = {
  events: [],
  users: {},
};

let saveTimer: NodeJS.Timeout | null = null;
let broadcastTimer: NodeJS.Timeout | null = null;
let ioInstance: Server | null = null;

const liveConnections = new Map<string, LiveConnectionInfo>();

function getTelemetryFilePath(): string {
  return path.join(getPacksDir(), 'admin-telemetry.local.json');
}

function ensureLoaded(): void {
  if (storeLoaded) return;
  storeLoaded = true;
  try {
    const file = getTelemetryFilePath();
    if (!fs.existsSync(file)) return;
    const parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (parsed && typeof parsed === 'object') {
      persistedStore = {
        events: Array.isArray(parsed.events) ? parsed.events.slice(0, MAX_ADMIN_EVENTS) : [],
        users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
      };
    }
  } catch (err) {
    console.warn('⚠️ Não foi possível carregar admin-telemetry.local.json:', err);
  }
}

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushAdminTelemetry();
  }, 1500);
}

export function flushAdminTelemetry(): void {
  ensureLoaded();
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    const file = getTelemetryFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(persistedStore, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ Falha ao persistir admin-telemetry.local.json:', err);
  }
}

export function attachAdminTelemetryIo(io: Server): void {
  ioInstance = io;
}

function notifyAdminWatchers(reason: string): void {
  if (!ioInstance || broadcastTimer) return;
  broadcastTimer = setTimeout(() => {
    broadcastTimer = null;
    ioInstance?.to('admin-watch').emit('admin:telemetryUpdated', {
      timestamp: Date.now(),
      reason,
    });
  }, 600);
}

export function extractCleanIpFromRequest(req: Request): string {
  const xff = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xff)
    ? xff[0]
    : typeof xff === 'string'
      ? xff.split(',')[0].trim()
      : req.ip || req.socket?.remoteAddress || 'desconhecido';
  return String(raw || 'desconhecido').replace(/^::ffff:/, '');
}

export function extractCleanIpFromSocket(socket: Socket): string {
  const xff = socket.handshake.headers['x-forwarded-for'];
  const raw = Array.isArray(xff)
    ? xff[0]
    : typeof xff === 'string'
      ? xff.split(',')[0].trim()
      : socket.handshake.address || 'desconhecido';
  return String(raw || 'desconhecido').replace(/^::ffff:/, '');
}

export function summarizeUserAgent(uaRaw?: string | string[]): string {
  const ua = Array.isArray(uaRaw) ? uaRaw[0] || '' : uaRaw || '';
  if (!ua) return 'Desconhecido';

  let browser = 'Navegador';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  let os = 'SO';
  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  return `${browser} · ${os}`;
}

export function verifyTokenIdentity(
  token?: string | null
): { userId: string; username: string } | null {
  if (!token || typeof token !== 'string') return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    if (decoded?.userId && decoded?.username) {
      return { userId: decoded.userId, username: decoded.username };
    }
    return null;
  } catch {
    return null;
  }
}

function getOrCreateUserRecord(userId: string): UserTelemetryRecord {
  ensureLoaded();
  if (!persistedStore.users[userId]) {
    persistedStore.users[userId] = {
      loginCount: 0,
      totalRolls: 0,
    };
  }
  return persistedStore.users[userId];
}

export function touchUserTelemetry(
  userId: string,
  patch: Partial<UserTelemetryRecord> & { incrementLogin?: boolean; incrementRolls?: boolean }
): void {
  ensureLoaded();
  const rec = getOrCreateUserRecord(userId);
  const now = Date.now();
  rec.lastSeenAt = patch.lastSeenAt ?? now;
  if (patch.lastLoginAt) rec.lastLoginAt = patch.lastLoginAt;
  if (patch.incrementLogin) rec.loginCount = (rec.loginCount || 0) + 1;
  if (patch.incrementRolls) rec.totalRolls = (rec.totalRolls || 0) + 1;
  if (patch.lastIp) rec.lastIp = patch.lastIp;
  if (patch.lastDevice) rec.lastDevice = patch.lastDevice;
  if (patch.lastView) rec.lastView = patch.lastView;
  if (patch.lastContextLabel !== undefined) rec.lastContextLabel = patch.lastContextLabel;
  scheduleSave();
}

export function recordAdminEvent(input: {
  category: AdminEventCategory;
  userId?: string;
  username?: string;
  summary: string;
  details?: string;
  ip?: string;
  device?: string;
  tone?: AdminEventTone;
}): AdminPlatformEvent {
  ensureLoaded();
  const now = Date.now();
  const entry: AdminPlatformEvent = {
    id: `adm-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    category: input.category,
    userId: input.userId,
    username: input.username,
    summary: input.summary,
    details: input.details,
    ip: input.ip,
    device: input.device,
    tone: input.tone || 'neutral',
  };

  persistedStore.events = [entry, ...persistedStore.events].slice(0, MAX_ADMIN_EVENTS);
  if (input.userId) {
    touchUserTelemetry(input.userId, {
      lastSeenAt: now,
      lastIp: input.ip,
      lastDevice: input.device,
    });
  }
  scheduleSave();
  notifyAdminWatchers(input.category);
  return entry;
}

export function clearAdminEvents(): void {
  ensureLoaded();
  persistedStore.events = [];
  scheduleSave();
  notifyAdminWatchers('clear');
}

export function registerSocketConnected(socket: Socket): LiveConnectionInfo {
  const ip = extractCleanIpFromSocket(socket);
  const device = summarizeUserAgent(socket.handshake.headers['user-agent']);
  const authToken =
    typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : null;
  const identity = verifyTokenIdentity(authToken);
  const now = Date.now();

  const info: LiveConnectionInfo = {
    socketId: socket.id,
    userId: identity?.userId,
    username: identity?.username,
    connectedAt: now,
    lastActivityAt: now,
    ip,
    device,
    view: identity ? 'dashboard' : 'landing',
  };

  liveConnections.set(socket.id, info);

  if (identity) {
    touchUserTelemetry(identity.userId, {
      lastSeenAt: now,
      lastIp: ip,
      lastDevice: device,
      lastView: 'dashboard',
    });
    recordAdminEvent({
      category: 'connection',
      userId: identity.userId,
      username: identity.username,
      summary: `Conectou-se à plataforma (@${identity.username})`,
      details: `${device} • IP ${ip}`,
      ip,
      device,
      tone: 'success',
    });
  } else {
    notifyAdminWatchers('guest_connect');
  }

  return info;
}

export function updateSocketPresence(socket: Socket, payload: PresenceUpdatePayload): void {
  const existing = liveConnections.get(socket.id) || registerSocketConnected(socket);
  const now = Date.now();

  const prevUserId = existing.userId;
  const prevView = existing.view;
  const prevContext = existing.contextLabel;

  if (payload.token !== undefined) {
    const identity = verifyTokenIdentity(payload.token);
    existing.userId = identity?.userId;
    existing.username = identity?.username;
  }

  existing.lastActivityAt = now;
  existing.view = payload.view || existing.view;
  existing.contextLabel = payload.contextLabel;
  existing.system = payload.system ?? existing.system;
  if (payload.palette) existing.palette = payload.palette;
  if (payload.artDirection) existing.artDirection = payload.artDirection;
  if (payload.diceMode) existing.diceMode = payload.diceMode;

  liveConnections.set(socket.id, existing);

  if (existing.userId) {
    touchUserTelemetry(existing.userId, {
      lastSeenAt: now,
      lastIp: existing.ip,
      lastDevice: existing.device,
      lastView: existing.view,
      lastContextLabel: existing.contextLabel,
    });

    // Se o socket acabou de autenticar após abrir como visitante, registra a entrada identificada
    if (!prevUserId && existing.username) {
      recordAdminEvent({
        category: 'connection',
        userId: existing.userId,
        username: existing.username,
        summary: `Sessão autenticada em tempo real (@${existing.username})`,
        details: `${existing.device} • IP ${existing.ip}`,
        ip: existing.ip,
        device: existing.device,
        tone: 'success',
      });
      return;
    }

    // Registra transições relevantes de tela (ex.: abriu Ficha ou Escudo do Mestre)
    if (
      existing.username &&
      (existing.view !== prevView || existing.contextLabel !== prevContext) &&
      (existing.view === 'sheet' || existing.view === 'dm-screen' || existing.view === 'second-monitor')
    ) {
      const viewLabel =
        existing.view === 'sheet'
          ? `Abriu ficha${existing.contextLabel ? `: ${existing.contextLabel}` : ''}`
          : existing.view === 'dm-screen'
            ? `Abriu Escudo do Mestre${existing.contextLabel ? `: ${existing.contextLabel}` : ''}`
            : `Abriu 2º Monitor${existing.contextLabel ? `: ${existing.contextLabel}` : ''}`;

      recordAdminEvent({
        category: 'connection',
        userId: existing.userId,
        username: existing.username,
        summary: viewLabel,
        ip: existing.ip,
        device: existing.device,
        tone: 'info',
      });
      return;
    }
  }

  notifyAdminWatchers('presence');
}

export function unregisterSocketConnected(socketId: string): void {
  const existing = liveConnections.get(socketId);
  liveConnections.delete(socketId);

  if (existing?.userId && existing.username) {
    const durationMin = Math.max(1, Math.round((Date.now() - existing.connectedAt) / 60000));
    touchUserTelemetry(existing.userId, { lastSeenAt: Date.now() });
    recordAdminEvent({
      category: 'connection',
      userId: existing.userId,
      username: existing.username,
      summary: `Desconectou-se (@${existing.username})`,
      details: `Sessão durou ~${durationMin} min • ${existing.device}`,
      ip: existing.ip,
      device: existing.device,
      tone: 'neutral',
    });
  } else {
    notifyAdminWatchers('guest_disconnect');
  }
}

export function getTelemetrySnapshot(): {
  events: AdminPlatformEvent[];
  users: Record<string, UserTelemetryRecord>;
  liveConnections: LiveConnectionInfo[];
} {
  ensureLoaded();
  return {
    events: persistedStore.events,
    users: persistedStore.users,
    liveConnections: Array.from(liveConnections.values()).sort(
      (a, b) => b.lastActivityAt - a.lastActivityAt
    ),
  };
}
