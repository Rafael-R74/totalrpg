import fs from 'node:fs';
import path from 'node:path';
import { getPacksDir } from './config';

export interface SuspendedUserInfo {
  reason?: string;
  suspendedAt: number;
  suspendedBy?: string;
}

export interface PlatformAdminSettings {
  allowRegistration: boolean;
  registrationInviteCode: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  announcementBanner: string;
  suspendedUsers: Record<string, SuspendedUserInfo>;
}

const DEFAULT_SETTINGS: PlatformAdminSettings = {
  allowRegistration: true,
  registrationInviteCode: '',
  maintenanceMode: false,
  maintenanceMessage: 'A plataforma está em manutenção rápida. Voltamos em instantes!',
  announcementBanner: '',
  suspendedUsers: {},
};

let loaded = false;
let currentSettings: PlatformAdminSettings = { ...DEFAULT_SETTINGS, suspendedUsers: {} };

function getSettingsFilePath(): string {
  return path.join(getPacksDir(), 'admin-settings.local.json');
}

function ensureLoaded(): void {
  if (loaded) return;
  loaded = true;
  try {
    const file = getSettingsFilePath();
    if (!fs.existsSync(file)) return;
    const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (raw && typeof raw === 'object') {
      currentSettings = {
        allowRegistration:
          typeof raw.allowRegistration === 'boolean'
            ? raw.allowRegistration
            : DEFAULT_SETTINGS.allowRegistration,
        registrationInviteCode:
          typeof raw.registrationInviteCode === 'string'
            ? raw.registrationInviteCode.trim()
            : '',
        maintenanceMode: Boolean(raw.maintenanceMode),
        maintenanceMessage:
          typeof raw.maintenanceMessage === 'string' && raw.maintenanceMessage.trim()
            ? raw.maintenanceMessage.trim()
            : DEFAULT_SETTINGS.maintenanceMessage,
        announcementBanner:
          typeof raw.announcementBanner === 'string' ? raw.announcementBanner.trim() : '',
        suspendedUsers:
          raw.suspendedUsers && typeof raw.suspendedUsers === 'object'
            ? raw.suspendedUsers
            : {},
      };
    }
  } catch (err) {
    console.warn('⚠️ Falha ao ler admin-settings.local.json:', err);
  }
}

function persistSettings(): void {
  try {
    const file = getSettingsFilePath();
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(file, JSON.stringify(currentSettings, null, 2), 'utf-8');
  } catch (err) {
    console.warn('⚠️ Falha ao salvar admin-settings.local.json:', err);
  }
}

export function getAdminSettings(): PlatformAdminSettings {
  ensureLoaded();
  return {
    ...currentSettings,
    suspendedUsers: { ...currentSettings.suspendedUsers },
  };
}

export function getPublicPlatformStatus() {
  ensureLoaded();
  return {
    allowRegistration: currentSettings.allowRegistration,
    requireInviteCode:
      !currentSettings.allowRegistration &&
      Boolean(currentSettings.registrationInviteCode.trim()),
    maintenanceMode: currentSettings.maintenanceMode,
    maintenanceMessage: currentSettings.maintenanceMessage,
    announcementBanner: currentSettings.announcementBanner,
  };
}

export function updateAdminSettings(
  patch: Partial<Omit<PlatformAdminSettings, 'suspendedUsers'>>
): PlatformAdminSettings {
  ensureLoaded();
  if (typeof patch.allowRegistration === 'boolean') {
    currentSettings.allowRegistration = patch.allowRegistration;
  }
  if (typeof patch.registrationInviteCode === 'string') {
    currentSettings.registrationInviteCode = patch.registrationInviteCode.trim();
  }
  if (typeof patch.maintenanceMode === 'boolean') {
    currentSettings.maintenanceMode = patch.maintenanceMode;
  }
  if (typeof patch.maintenanceMessage === 'string') {
    currentSettings.maintenanceMessage =
      patch.maintenanceMessage.trim() || DEFAULT_SETTINGS.maintenanceMessage;
  }
  if (typeof patch.announcementBanner === 'string') {
    currentSettings.announcementBanner = patch.announcementBanner.trim();
  }
  persistSettings();
  return getAdminSettings();
}

export function getUserSuspension(userId: string): SuspendedUserInfo | null {
  ensureLoaded();
  return currentSettings.suspendedUsers[userId] || null;
}

export function setUserSuspension(
  userId: string,
  suspended: boolean,
  opts?: { reason?: string; suspendedBy?: string }
): void {
  ensureLoaded();
  if (suspended) {
    currentSettings.suspendedUsers[userId] = {
      reason: opts?.reason?.trim() || undefined,
      suspendedAt: Date.now(),
      suspendedBy: opts?.suspendedBy,
    };
  } else {
    delete currentSettings.suspendedUsers[userId];
  }
  persistSettings();
}
