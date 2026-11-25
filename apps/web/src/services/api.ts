import {
  SystemId,
  FullCharacterPayload,
  SheetPermissions,
  CompendiumEntryData,
  SystemSkillDefinition,
  SceneEffect,
  TotalRpgContentPack,
  ContentPackApplyStats,
  PublicPlatformStatus,
} from '@totalrpg/shared';
import { API_URL } from '../config';

// Interface do retorno de login/cadastro
export interface AuthResponse {
  message: string;
  token: string;
  user: {
    id: string;
    username: string;
    email: string;
    isAdmin?: boolean;
  };
}

// Interface de uma Campanha vinda do banco
export interface CampaignData {
  id: string;
  name: string;
  description?: string;
  system: SystemId;
  inviteCode: string;
  requiredNex?: number | null;
  requiredPatent?: string | null;
  createdAt: string;
  dm?: { username: string };
  characters?: Array<{
    id: string;
    name: string;
    portraitUrl?: string;
    owner: { username: string };
  }>;
}

// Interface de um Convite Pendente
export interface InviteData {
  id: string;
  status: string;
  requiredNex?: number | null;
  requiredPatent?: string | null;
  campaign: {
    id: string;
    name: string;
    system: SystemId;
    requiredNex?: number | null;
    requiredPatent?: string | null;
    dm: { username: string };
  };
}

// Interface de um Personagem no Cofre
export interface CharacterData {
  id: string;
  name: string;
  system: SystemId;
  portraitUrl?: string;
  sheetData?: Record<string, any>;
  campaign?: {
    id: string;
    name: string;
  } | null;
}

// Função auxiliar para recuperar o token salvo no cofre do navegador
function getAuthHeader() {
  const token = localStorage.getItem('totalrpg_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Autenticação
export async function fetchPlatformStatus(): Promise<PublicPlatformStatus> {
  const response = await fetch(`${API_URL}/auth/platform-status`);
  if (!response.ok) {
    return {
      allowRegistration: true,
      requireInviteCode: false,
      maintenanceMode: false,
      maintenanceMessage: '',
      announcementBanner: '',
    };
  }
  return response.json();
}

export async function registerUser(
  username: string,
  email: string,
  password: string,
  inviteCode?: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, inviteCode }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao realizar cadastro.');
  return data;
}

export async function loginUser(emailOrUsername: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao realizar login.');
  return data;
}

export async function fetchCurrentUser(): Promise<{
  user: { id: string; username: string; email: string; isAdmin: boolean };
} | null> {
  const token = localStorage.getItem('totalrpg_token');
  if (!token) return null;
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: getAuthHeader(),
  });
  if (!response.ok) return null;
  return response.json();
}

export async function fetchUserPreferences(): Promise<{ preferences: any | null }> {
  const token = localStorage.getItem('totalrpg_token');
  if (!token) return { preferences: null };
  const response = await fetch(`${API_URL}/auth/preferences`, {
    headers: getAuthHeader(),
  });
  if (!response.ok) return { preferences: null };
  return response.json();
}

export async function saveUserPreferences(preferences: unknown): Promise<void> {
  const token = localStorage.getItem('totalrpg_token');
  if (!token) return;
  await fetch(`${API_URL}/auth/preferences`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify({ preferences }),
  });
}

// Campanhas (DM)
export async function fetchDMCampaigns(): Promise<CampaignData[]> {
  const response = await fetch(`${API_URL}/campaigns/dm`, {
    headers: getAuthHeader()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar campanhas de mestre.');
  return data;
}

export async function createCampaign(
  name: string,
  description: string,
  system: SystemId,
  options?: { requiredNex?: number | null; requiredPatent?: string | null }
): Promise<CampaignData> {
  const response = await fetch(`${API_URL}/campaigns`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      name,
      description,
      system,
      requiredNex: options?.requiredNex ?? null,
      requiredPatent: options?.requiredPatent ?? null,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao criar campanha.');
  return data;
}

export async function sendCampaignInvite(
  campaignId: string,
  targetUsername: string,
  options?: { requiredNex?: number | null; requiredPatent?: string | null }
): Promise<void> {
  const response = await fetch(`${API_URL}/campaigns/${campaignId}/invite`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      targetUsername,
      requiredNex: options?.requiredNex ?? null,
      requiredPatent: options?.requiredPatent ?? null,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao enviar convite.');
}

// Campanhas (Player)
export async function fetchPlayerCampaigns(): Promise<CampaignData[]> {
  const response = await fetch(`${API_URL}/campaigns/player`, {
    headers: getAuthHeader()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar campanhas de jogador.');
  return data;
}

export async function fetchPlayerInvites(): Promise<InviteData[]> {
  const response = await fetch(`${API_URL}/campaigns/invites`, {
    headers: getAuthHeader()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar convites.');
  return data;
}

export async function acceptCampaignInvite(inviteId: string, characterId: string): Promise<void> {
  const response = await fetch(`${API_URL}/campaigns/invites/${inviteId}/accept`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ characterId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao aceitar convite.');
}

export async function declineCampaignInvite(inviteId: string): Promise<void> {
  const response = await fetch(`${API_URL}/campaigns/invites/${inviteId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao recusar convite.');
}

export async function joinCampaignByCode(inviteCode: string, characterId: string): Promise<void> {
  const response = await fetch(`${API_URL}/campaigns/join-code`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ inviteCode, characterId }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao entrar na campanha pelo código.');
}

// Personagens
export async function fetchCharacters(): Promise<CharacterData[]> {
  const response = await fetch(`${API_URL}/characters`, {
    headers: getAuthHeader()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar personagens.');
  return data;
}

export interface CreateCharacterCustomOptions {
  portraitUrl?: string;
  customVitals?: any[];
  customSheetData?: Record<string, any>;
  initialInventory?: any[];
  initialAttacks?: any[];
}

export async function createCharacter(
  name: string,
  system: SystemId,
  portraitUrlOrOptions?: string | CreateCharacterCustomOptions
): Promise<CharacterData> {
  const extraBody: CreateCharacterCustomOptions =
    typeof portraitUrlOrOptions === 'string'
      ? { portraitUrl: portraitUrlOrOptions }
      : portraitUrlOrOptions || {};

  const response = await fetch(`${API_URL}/characters`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      name,
      system,
      ...extraBody,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao criar personagem.');
  return data;
}

// Tipo que representa o personagem completo vindo do banco com os dados da campanha
export interface FullCharacterResponse extends FullCharacterPayload {
  campaign?: (SheetPermissions & {
    id: string;
    name: string;
    dmId: string;
  }) | null;
}

// Busca todos os dados de uma ficha específica
export async function fetchCharacterById(id: string): Promise<FullCharacterResponse> {
  const response = await fetch(`${API_URL}/characters/${id}`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar ficha.');
  return data;
}

// Salva alterações da ficha no banco SQLite
export async function updateCharacter(
  id: string,
  payload: Partial<FullCharacterPayload>
): Promise<FullCharacterResponse> {
  const response = await fetch(`${API_URL}/characters/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao salvar ficha.');
  return data;
}

// Compêndio e ambiente admin
export interface CompendiumResponse {
  entries: CompendiumEntryData[];
  skills: SystemSkillDefinition[];
}

export async function fetchCompendium(system?: SystemId): Promise<CompendiumResponse> {
  const query = system ? `?system=${system}` : '';
  const response = await fetch(`${API_URL}/compendium${query}`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar compêndio.');
  return data;
}

export async function seedCompendium(): Promise<{ message: string }> {
  const response = await fetch(`${API_URL}/compendium/seed`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao inicializar compêndio.');
  return data;
}

export async function fetchContentPack(): Promise<{
  loaded: boolean;
  files: string[];
  stats: ContentPackApplyStats | null;
  pack: TotalRpgContentPack | null;
}> {
  const response = await fetch(`${API_URL}/content-pack`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar Content Pack.');
  return data;
}

export async function importContentPack(pack: TotalRpgContentPack): Promise<{
  message: string;
  stats: ContentPackApplyStats | null;
}> {
  const response = await fetch(`${API_URL}/content-pack/import`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(pack),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao importar Content Pack.');
  return data;
}

export async function createCompendiumEntry(
  payload: Omit<CompendiumEntryData, 'id'>
): Promise<CompendiumEntryData> {
  const response = await fetch(`${API_URL}/compendium/entry`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao criar item no compêndio.');
  return data;
}

export async function deleteCompendiumEntry(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/compendium/entry/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao remover item do compêndio.');
}

export async function upsertSystemSkill(
  payload: Omit<SystemSkillDefinition, 'id'>
): Promise<SystemSkillDefinition> {
  const response = await fetch(`${API_URL}/compendium/skill`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao salvar perícia do sistema.');
  return data;
}

// Escudo do Mestre
export interface DMScreenCharacter extends FullCharacterPayload {
  owner: {
    id: string;
    username: string;
  };
}

export interface DMScreenCampaignData extends SheetPermissions {
  id: string;
  name: string;
  description?: string;
  system: SystemId;
  inviteCode: string;
  dmId: string;
  dmNotes?: string;
  combatState?: any;
  threats?: any[];
  campaignItems?: any[];
  merchants?: any[];
  postIts?: any[];
  characters: DMScreenCharacter[];
  invites: Array<{
    id: string;
    status: string;
    user: { id: string; username: string };
  }>;
}

export async function fetchDMScreenData(campaignId: string): Promise<DMScreenCampaignData> {
  const response = await fetch(`${API_URL}/campaigns/${campaignId}/dm-screen`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar Escudo do Mestre.');
  return data;
}

export async function updateCampaignPermissions(
  campaignId: string,
  permissions: Partial<SheetPermissions>
): Promise<SheetPermissions> {
  const response = await fetch(`${API_URL}/campaigns/${campaignId}/permissions`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(permissions),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao atualizar travas da campanha.');
  return data;
}

export async function updateCampaignDMData(
  campaignId: string,
  payload: {
    dmNotes?: string;
    combatState?: any;
    threats?: any[];
    campaignItems?: any[];
    merchants?: any[];
    postIts?: any[];
  }
): Promise<void> {
  const response = await fetch(`${API_URL}/campaigns/${campaignId}/dm-data`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Erro ao salvar dados do Escudo no banco.');
  }
}

// --- COMÉRCIO & TROCA ENTRE JOGADORES (ETAPA 4E) ---
export interface TradeTargetCharacter {
  id: string;
  name: string;
  ownerId: string;
  owner: { username: string };
}

export async function fetchCampaignTradeTargets(campaignId: string): Promise<{
  allowTrade: boolean;
  characters: TradeTargetCharacter[];
}> {
  const response = await fetch(`${API_URL}/campaigns/${campaignId}/trade-targets`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar aliados da mesa.');
  return data;
}

export async function transferItemBetweenCharacters(
  campaignId: string,
  fromCharacterId: string,
  toCharacterId: string,
  itemId: string,
  quantity: number
): Promise<{
  message: string;
  updatedSender: FullCharacterResponse;
  transferredItem: any;
  transferredAttack?: any;
}> {
  const response = await fetch(`${API_URL}/campaigns/${campaignId}/transfer-item`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ fromCharacterId, toCharacterId, itemId, quantity }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao transferir item.');
  return data;
}

// --- Upload de imagens para o servidor ---
export async function uploadImageFile(file: File): Promise<string> {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo de imagem no navegador.'));
    reader.readAsDataURL(file);
  });

  const response = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type,
      base64Data,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Erro ao enviar imagem para o servidor.');
  }
  return data.url;
}

export async function deleteCharacter(characterId: string): Promise<void> {
  const response = await fetch(`${API_URL}/characters/${characterId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir personagem.');
}

export async function removeCharacterFromCampaign(
  campaignId: string,
  characterId: string
): Promise<void> {
  const response = await fetch(
    `${API_URL}/campaigns/${campaignId}/remove-character/${characterId}`,
    {
      method: 'PUT',
      headers: getAuthHeader(),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao remover personagem da mesa.');
}

export async function deleteCampaign(campaignId: string): Promise<void> {
  const response = await fetch(`${API_URL}/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir campanha.');
}

export async function applyCampaignSceneEffect(
  campaignId: string,
  targetCharacterIds: string[],
  effect?: SceneEffect,
  removeEffectId?: string
): Promise<{ success: boolean; updatedCount: number; updatedIds: string[] }> {
  const response = await fetch(`${API_URL}/campaigns/${campaignId}/apply-scene-effect`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({
      targetCharacterIds,
      effect,
      removeEffectId,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao sincronizar efeito de cena na campanha.');
  return data;
}

// --- PAINEL DE ADMIN GERAL & TELEMETRIA ---
export interface AdminOverviewResponse {
  generatedAt: number;
  settings: {
    allowRegistration: boolean;
    registrationInviteCode: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    announcementBanner: string;
  };
  serverHealth: {
    uptimeSeconds: number;
    nodeVersion: string;
    environment: string;
    memoryRssMb: number;
    memoryHeapMb: number;
    memoryLimitMb: number;
    sqliteBytes: number;
    uploadsCount: number;
    uploadsBytes: number;
    contentPackLoaded: boolean;
    contentPackFiles: string[];
  };
  totals: {
    totalUsers: number;
    adminsCount: number;
    suspendedCount: number;
    activeUsers24h: number;
    onlineAuthenticatedUsers: number;
    onlineGuestSockets: number;
    totalLiveSockets: number;
    totalCharacters: number;
    charactersInCampaigns: number;
    charactersInVault: number;
    charactersBySystem: Record<string, number>;
    totalCampaigns: number;
    pendingInvites: number;
    compendiumEntries: number;
    systemSkills: number;
    totalEventsLogged: number;
  };
  themeStats: {
    palettes: Record<string, number>;
    artDirections: Record<string, number>;
    diceModes: Record<string, number>;
    autoSystemThemeCount: number;
  };
  liveConnections: Array<{
    socketId: string;
    userId?: string;
    username?: string;
    connectedAt: number;
    lastActivityAt: number;
    ip: string;
    device: string;
    view: string;
    contextLabel?: string;
    system?: SystemId | null;
    palette?: string;
    artDirection?: string;
    diceMode?: string;
  }>;
  users: Array<{
    id: string;
    username: string;
    email: string;
    isAdmin: boolean;
    isSuspended: boolean;
    suspendReason: string | null;
    createdAt: string;
    isOnline: boolean;
    openTabsCount: number;
    currentView: string | null;
    currentContextLabel: string | null;
    lastSeenAt: number;
    lastLoginAt: number | null;
    loginCount: number;
    totalRolls: number;
    lastIp: string | null;
    device: string | null;
    theme: {
      palette: string;
      artDirection: string;
      diceMode: string;
      density: string;
      autoSystemTheme: boolean;
      hasSavedCustomPrefs: boolean;
    };
    charactersCount: number;
    campaignsAsDmCount: number;
    characters: Array<{ id: string; name: string; system: string }>;
  }>;
  characters: Array<{
    id: string;
    name: string;
    portraitUrl: string;
    system: SystemId;
    ownerId: string;
    ownerUsername: string;
    campaignId: string | null;
    campaignName: string | null;
    summary: {
      className: string | null;
      trail: string | null;
      origin: string | null;
      nex: number | null;
      level: number | null;
      patent: string | null;
    };
    vitals: Array<{
      id: string;
      label: string;
      current: number;
      max: number;
      color: string;
    }>;
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    description: string;
    system: SystemId;
    inviteCode: string;
    createdAt: string;
    dmUsername: string;
    lockAllSheets: boolean;
    allowTrade: boolean;
    requiredNex: number | null;
    requiredPatent: string | null;
    playersCount: number;
    pendingInvitesCount: number;
    characters: Array<{ id: string; name: string; ownerUsername: string }>;
  }>;
  events: Array<{
    id: string;
    createdAt: number;
    category: 'auth' | 'connection' | 'theme' | 'character' | 'campaign' | 'dice' | 'system';
    userId?: string;
    username?: string;
    summary: string;
    details?: string;
    ip?: string;
    device?: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'purple';
  }>;
}

export async function fetchAdminOverview(): Promise<AdminOverviewResponse> {
  const response = await fetch(`${API_URL}/admin/overview`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar Painel de Admin Geral.');
  return data;
}

export async function toggleUserAdminStatus(
  userId: string
): Promise<{ user: { id: string; username: string; isAdmin: boolean } }> {
  const response = await fetch(`${API_URL}/admin/users/${userId}/toggle-admin`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao alterar permissão do usuário.');
  return data;
}

export async function clearAdminEventsHistory(): Promise<void> {
  const response = await fetch(`${API_URL}/admin/events`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao limpar histórico de eventos.');
}

export async function updateAdminPlatformSettings(payload: {
  allowRegistration?: boolean;
  registrationInviteCode?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  announcementBanner?: string;
}): Promise<{ settings: AdminOverviewResponse['settings'] }> {
  const response = await fetch(`${API_URL}/admin/settings`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao salvar configurações administrativas.');
  return data;
}

export async function adminCreateUser(payload: {
  username: string;
  email: string;
  password: string;
  isAdmin: boolean;
}): Promise<void> {
  const response = await fetch(`${API_URL}/admin/users`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao criar conta.');
}

export async function adminUpdateUser(
  userId: string,
  payload: {
    username: string;
    email: string;
    newPassword?: string;
    isAdmin: boolean;
    isSuspended: boolean;
    suspendReason?: string;
  }
): Promise<void> {
  const response = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao editar dados do usuário.');
}

export async function adminKickUser(userId: string): Promise<{ disconnectedCount: number }> {
  const response = await fetch(`${API_URL}/admin/users/${userId}/kick`, {
    method: 'POST',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao desconectar usuário.');
  return data;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const response = await fetch(`${API_URL}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir usuário.');
}

export async function adminUpdateCharacter(
  characterId: string,
  payload: { name: string; ownerId: string; campaignId: string | null }
): Promise<void> {
  const response = await fetch(`${API_URL}/admin/characters/${characterId}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao atualizar personagem.');
}

export async function adminDeleteCharacter(characterId: string): Promise<void> {
  const response = await fetch(`${API_URL}/admin/characters/${characterId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir personagem.');
}

export async function adminDeleteCampaign(campaignId: string): Promise<void> {
  const response = await fetch(`${API_URL}/admin/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir campanha.');
}
