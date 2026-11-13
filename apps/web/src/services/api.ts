import {
  SystemId,
  FullCharacterPayload,
  SheetPermissions,
  CompendiumEntryData,
  SystemSkillDefinition,
} from '@totalrpg/shared';
const API_URL = 'http://localhost:3333/api';

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
  campaign: {
    id: string;
    name: string;
    system: SystemId;
    dm: { username: string };
  };
}

// Interface de um Personagem no Cofre
export interface CharacterData {
  id: string;
  name: string;
  system: SystemId;
  portraitUrl?: string;
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
export async function registerUser(username: string, email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
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

// Campanhas (DM)
export async function fetchDMCampaigns(): Promise<CampaignData[]> {
  const response = await fetch(`${API_URL}/campaigns/dm`, {
    headers: getAuthHeader()
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao buscar campanhas de mestre.');
  return data;
}

export async function createCampaign(name: string, description: string, system: SystemId): Promise<CampaignData> {
  const response = await fetch(`${API_URL}/campaigns`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ name, description, system }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao criar campanha.');
  return data;
}

export async function sendCampaignInvite(campaignId: string, targetUsername: string): Promise<void> {
  const response = await fetch(`${API_URL}/campaigns/${campaignId}/invite`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ targetUsername }),
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

export async function createCharacter(name: string, system: SystemId, portraitUrl?: string): Promise<CharacterData> {
  const response = await fetch(`${API_URL}/characters`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ name, system, portraitUrl }),
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