import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SystemId,
} from '@totalrpg/shared';
import {
  AdminOverviewResponse,
  clearAdminEventsHistory,
  fetchAdminOverview,
  toggleUserAdminStatus,
} from '../services/api';
import { ART_DIRECTION_CATALOG, PALETTE_CATALOG } from '../theme/themeEngine';
import { SystemSigilBadge } from './BrandMark';
import { Icon, IconName } from './ui/Icon';
import { Portrait } from './ui/Portrait';

type AdminSubTab = 'overview' | 'activity' | 'users' | 'characters' | 'campaigns';

interface PlatformAdminDashboardProps {
  currentUserId: string;
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  onOpenCharacter: (characterId: string, campaignId?: string, system?: SystemId) => void;
}

const VIEW_LABELS: Record<string, string> = {
  landing: 'Landing Page',
  auth: 'Tela de Login / Cadastro',
  dashboard: 'Dashboard Inicial',
  sheet: 'Ficha de Personagem',
  'dm-screen': 'Escudo do Mestre',
  'second-monitor': '2º Monitor (TV)',
};

const DICE_MODE_LABELS: Record<string, string> = {
  auto: 'Automático',
  '3d': 'Dados 3D',
  '2d': 'Dados 2D',
};

const EVENT_CATEGORY_META: Record<
  AdminOverviewResponse['events'][number]['category'],
  { label: string; icon: IconName; badgeClass: string }
> = {
  connection: {
    label: 'Conexão',
    icon: 'radio',
    badgeClass: 'border-emerald-800/70 bg-emerald-950/40 text-emerald-300',
  },
  auth: {
    label: 'Conta & Acesso',
    icon: 'key',
    badgeClass: 'border-sky-800/70 bg-sky-950/40 text-sky-300',
  },
  theme: {
    label: 'Tema & Visual',
    icon: 'palette',
    badgeClass: 'border-purple-800/70 bg-purple-950/40 text-purple-300',
  },
  character: {
    label: 'Personagem',
    icon: 'user',
    badgeClass: 'border-amber-800/70 bg-amber-950/40 text-amber-300',
  },
  campaign: {
    label: 'Campanha',
    icon: 'shield',
    badgeClass: 'border-indigo-800/70 bg-indigo-950/40 text-indigo-300',
  },
  dice: {
    label: 'Rolagem',
    icon: 'd20',
    badgeClass: 'border-zinc-700 bg-zinc-800/80 text-zinc-200',
  },
  system: {
    label: 'Sistema',
    icon: 'settings',
    badgeClass: 'border-rose-800/70 bg-rose-950/40 text-rose-300',
  },
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${Math.max(1, m)} min`;
}

function formatRelativeTime(timestampMs?: number | null): string {
  if (!timestampMs) return 'Nunca';
  const diffSec = Math.max(0, Math.floor((Date.now() - timestampMs) / 1000));
  if (diffSec < 45) return 'Agora mesmo';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Há ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `Há ${diffDays}d`;
}

function formatDateTime(value: number | string): string {
  const dt = new Date(value);
  return dt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function resolvePaletteInfo(paletteId?: string) {
  const found = PALETTE_CATALOG.find((p) => p.id === paletteId);
  return (
    found || {
      id: paletteId || 'ordo-crimson',
      name: paletteId || 'Arquivo Escarlate',
      swatches: {
        bg: '#14171c',
        surface: '#1b1f26',
        elevated: '#242a33',
        ink: '#f1ece2',
        accent: '#d9423f',
        secondary: '#5b8fd9',
      },
    }
  );
}

function resolveArtDirectionName(artId?: string): string {
  const found = ART_DIRECTION_CATALOG.find((a) => a.id === artId);
  return found ? found.name : artId || 'Arquivo';
}

export function PlatformAdminDashboard({
  currentUserId,
  socket,
  onOpenCharacter,
}: PlatformAdminDashboardProps) {
  const [subTab, setSubTab] = useState<AdminSubTab>('overview');
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [eventCategoryFilter, setEventCategoryFilter] = useState<string>('ALL');
  const [eventSearch, setEventSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userFilterMode, setUserFilterMode] = useState<'all' | 'online' | 'admin'>('all');
  const [charSearch, setCharSearch] = useState('');
  const [charSystemFilter, setCharSystemFilter] = useState<'ALL' | SystemId>('ALL');

  const loadOverview = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const res = await fetchAdminOverview();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar os dados administrativos.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview(false);
  }, [loadOverview]);

  // Assina atualizações em tempo real via WebSocket enquanto o painel estiver aberto
  useEffect(() => {
    const token = localStorage.getItem('totalrpg_token') || '';
    if (!token) return;

    const subscribe = () => {
      socket.emit('admin:watch', { token, active: true });
    };
    subscribe();
    socket.on('connect', subscribe);

    const handleLiveUpdate = () => {
      void loadOverview(true);
    };
    socket.on('admin:telemetryUpdated', handleLiveUpdate);

    return () => {
      socket.emit('admin:watch', { token, active: false });
      socket.off('connect', subscribe);
      socket.off('admin:telemetryUpdated', handleLiveUpdate);
    };
  }, [socket, loadOverview]);

  const filteredEvents = useMemo(() => {
    if (!data) return [];
    const q = eventSearch.trim().toLowerCase();
    return data.events.filter((ev) => {
      if (eventCategoryFilter !== 'ALL' && ev.category !== eventCategoryFilter) return false;
      if (!q) return true;
      return (
        ev.summary.toLowerCase().includes(q) ||
        (ev.username || '').toLowerCase().includes(q) ||
        (ev.details || '').toLowerCase().includes(q) ||
        (ev.ip || '').toLowerCase().includes(q)
      );
    });
  }, [data, eventCategoryFilter, eventSearch]);

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    const q = userSearch.trim().toLowerCase();
    return data.users.filter((u) => {
      if (userFilterMode === 'online' && !u.isOnline) return false;
      if (userFilterMode === 'admin' && !u.isAdmin) return false;
      if (!q) return true;
      const palName = resolvePaletteInfo(u.theme.palette).name.toLowerCase();
      const artName = resolveArtDirectionName(u.theme.artDirection).toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        palName.includes(q) ||
        artName.includes(q) ||
        (u.device || '').toLowerCase().includes(q)
      );
    });
  }, [data, userSearch, userFilterMode]);

  const filteredCharacters = useMemo(() => {
    if (!data) return [];
    const q = charSearch.trim().toLowerCase();
    return data.characters.filter((c) => {
      if (charSystemFilter !== 'ALL' && c.system !== charSystemFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.ownerUsername.toLowerCase().includes(q) ||
        (c.campaignName || '').toLowerCase().includes(q) ||
        (c.summary.className || '').toLowerCase().includes(q) ||
        (c.summary.origin || '').toLowerCase().includes(q)
      );
    });
  }, [data, charSearch, charSystemFilter]);

  async function handleToggleAdmin(userId: string, username: string, currentIsAdmin: boolean) {
    const actionText = currentIsAdmin
      ? `Revogar permissão de Administrador de @${username}?`
      : `Promover @${username} a Administrador da plataforma?`;
    if (!window.confirm(actionText)) return;
    try {
      await toggleUserAdminStatus(userId);
      await loadOverview(true);
    } catch (err: any) {
      alert(err?.message || 'Erro ao alterar permissão.');
    }
  }

  async function handleClearEvents() {
    if (!window.confirm('Limpar todo o histórico de eventos do painel administrativo?')) return;
    try {
      await clearAdminEventsHistory();
      await loadOverview(true);
    } catch (err: any) {
      alert(err?.message || 'Erro ao limpar histórico.');
    }
  }

  if (isLoading && !data) {
    return (
      <div className="trpg-card p-10 flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Icon name="refresh" size={24} className="animate-spin text-amber-400" />
        <p className="text-sm">Carregando telemetria e visão geral da plataforma...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="trpg-card p-8 border-red-900/60 flex flex-col items-start gap-3">
        <p className="text-base font-semibold text-red-300 flex items-center gap-2">
          <Icon name="warning" size={18} /> Acesso ou carregamento falhou
        </p>
        <p className="text-sm text-zinc-400">{error || 'Dados indisponíveis.'}</p>
        <button type="button" onClick={() => loadOverview(false)} className="trpg-btn-secondary trpg-btn-sm">
          Tentar novamente
        </button>
      </div>
    );
  }

  const ramPercent = Math.min(
    100,
    Math.round((data.serverHealth.memoryRssMb / data.serverHealth.memoryLimitMb) * 100)
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho Principal + Saúde do Servidor */}
      <div className="trpg-card p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl sm:text-3xl leading-tight">Painel de Admin Geral</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-800/70 bg-emerald-950/40 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Ao vivo
              </span>
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              Monitoramento em tempo real de conexões, contas, temas visuais, personagens, campanhas e saúde da VPS.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadOverview(true)}
            className="trpg-btn-secondary trpg-btn-sm"
            disabled={isRefreshing}
          >
            <Icon name="refresh" size={15} className={isRefreshing ? 'animate-spin' : ''} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar agora'}
          </button>
        </div>

        {/* Barra Técnica de Infraestrutura */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-zinc-800/90 text-xs">
          <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 px-3 py-2.5">
            <div className="flex items-center justify-between text-zinc-400">
              <span>RAM do Processo</span>
              <span className="trpg-num text-zinc-200 font-semibold">
                {data.serverHealth.memoryRssMb} / {data.serverHealth.memoryLimitMb} MB
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  ramPercent >= 85
                    ? 'bg-red-500'
                    : ramPercent >= 65
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${ramPercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 px-3 py-2.5">
            <span className="text-zinc-500 block">Banco SQLite (WAL)</span>
            <span className="trpg-num text-sm font-semibold text-zinc-100 mt-0.5 block">
              {formatBytes(data.serverHealth.sqliteBytes)}
            </span>
          </div>

          <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 px-3 py-2.5">
            <span className="text-zinc-500 block">Imagens em /uploads</span>
            <span className="trpg-num text-sm font-semibold text-zinc-100 mt-0.5 block">
              {data.serverHealth.uploadsCount} arq. ({formatBytes(data.serverHealth.uploadsBytes)})
            </span>
          </div>

          <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 px-3 py-2.5">
            <span className="text-zinc-500 block">Uptime & Ambiente</span>
            <span className="trpg-num text-sm font-semibold text-zinc-100 mt-0.5 block truncate">
              {formatUptime(data.serverHealth.uptimeSeconds)} • {data.serverHealth.environment}
            </span>
          </div>

          <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 px-3 py-2.5 col-span-2 sm:col-span-1">
            <span className="text-zinc-500 block">Content Pack (BYOC)</span>
            <span
              className={`text-sm font-semibold mt-0.5 block truncate ${
                data.serverHealth.contentPackLoaded ? 'text-emerald-300' : 'text-zinc-400'
              }`}
            >
              {data.serverHealth.contentPackLoaded
                ? `Ativo (${data.serverHealth.contentPackFiles.length} arq.)`
                : 'Modo Público (Limpo)'}
            </span>
          </div>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="trpg-card p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Online Agora</span>
            <Icon name="radio" size={16} className="text-emerald-400" />
          </div>
          <div className="text-3xl font-bold trpg-num text-zinc-100">
            {data.totals.onlineAuthenticatedUsers}
            <span className="text-sm font-normal text-zinc-400 ml-1.5">
              {data.totals.onlineAuthenticatedUsers === 1 ? 'usuário' : 'usuários'}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            {data.totals.totalLiveSockets} {data.totals.totalLiveSockets === 1 ? 'conexão ativa' : 'conexões ativas'}
            {data.totals.onlineGuestSockets > 0
              ? ` (${data.totals.onlineGuestSockets} visitante/TV)`
              : ''}
          </p>
        </div>

        <div className="trpg-card p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Contas Criadas</span>
            <Icon name="users" size={16} className="text-sky-400" />
          </div>
          <div className="text-3xl font-bold trpg-num text-zinc-100">{data.totals.totalUsers}</div>
          <p className="text-xs text-zinc-500">
            {data.totals.activeUsers24h} ativos nas últimas 24h • {data.totals.adminsCount} admin
          </p>
        </div>

        <div className="trpg-card p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Personagens Criados</span>
            <Icon name="user" size={16} className="text-amber-400" />
          </div>
          <div className="text-3xl font-bold trpg-num text-zinc-100">{data.totals.totalCharacters}</div>
          <p className="text-xs text-zinc-500">
            {data.totals.charactersInCampaigns} em mesas • {data.totals.charactersInVault} no cofre
          </p>
        </div>

        <div className="trpg-card p-4 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Campanhas & Mesas</span>
            <Icon name="shield" size={16} className="text-purple-400" />
          </div>
          <div className="text-3xl font-bold trpg-num text-zinc-100">{data.totals.totalCampaigns}</div>
          <p className="text-xs text-zinc-500">
            {data.totals.pendingInvites} convites pendentes • {data.totals.compendiumEntries} itens no compêndio
          </p>
        </div>
      </div>

      {/* Sub-navegação do Painel Admin */}
      <div role="tablist" aria-label="Seções do Painel Admin" className="trpg-tabs -mx-1">
        {(
          [
            { id: 'overview', label: 'Visão Geral & Temas', icon: 'chart' as IconName },
            {
              id: 'activity',
              label: 'Atividades',
              icon: 'activity' as IconName,
              count: data.events.length,
            },
            { id: 'users', label: 'Usuários', icon: 'users' as IconName, count: data.users.length },
            {
              id: 'characters',
              label: 'Personagens',
              icon: 'user' as IconName,
              count: data.characters.length,
            },
            {
              id: 'campaigns',
              label: 'Campanhas',
              icon: 'shield' as IconName,
              count: data.campaigns.length,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            onClick={() => setSubTab(tab.id)}
            className="trpg-tab"
          >
            <Icon name={tab.icon} size={15} />
            {tab.label}
            {'count' in tab && typeof tab.count === 'number' && (
              <span className="trpg-tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ABA 1: VISÃO GERAL, CONEXÕES AO VIVO & TEMAS */}
      {subTab === 'overview' && (
        <div className="flex flex-col gap-6">
          {/* Sessões Conectadas neste exato momento */}
          <section className="trpg-card p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <Icon name="radio" size={17} className="text-emerald-400" />
                  Quem está conectado agora ({data.liveConnections.length})
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Todas as janelas conectadas via WebSocket neste momento (jogadores, mestres, visitantes na Landing Page e 2º Monitor).
                </p>
              </div>
            </div>

            {data.liveConnections.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">
                Nenhuma conexão WebSocket ativa neste instante.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {data.liveConnections.map((conn) => {
                  const pal = resolvePaletteInfo(conn.palette);
                  return (
                    <div
                      key={conn.socketId}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3.5 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                          <span className="font-semibold text-sm text-zinc-100 truncate">
                            {conn.username ? `@${conn.username}` : 'Visitante / Sem login'}
                          </span>
                          <span className="text-[11px] text-zinc-500 trpg-num">
                            {conn.device}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1 truncate">
                          {VIEW_LABELS[conn.view] || conn.view}
                          {conn.contextLabel ? ` — ${conn.contextLabel}` : ''}
                        </p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          IP {conn.ip} • Conectado {formatRelativeTime(conn.connectedAt)}
                        </p>
                      </div>

                      {conn.palette && (
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-white/20"
                              style={{ backgroundColor: pal.swatches.accent }}
                            />
                            {pal.name}
                          </span>
                          {conn.artDirection && (
                            <span className="text-[11px] text-zinc-500">
                              {resolveArtDirectionName(conn.artDirection)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Estatísticas de Paletas, Direções de Arte e Dados */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="trpg-card p-5 flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <Icon name="palette" size={17} className="text-amber-400" />
                  Paletas de Cores Escolhidas
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Distribuição das paletas favoritas entre as {data.totals.totalUsers} contas cadastradas.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {PALETTE_CATALOG.map((pal) => {
                  const count = data.themeStats.palettes[pal.id] || 0;
                  const pct =
                    data.totals.totalUsers > 0
                      ? Math.round((count / data.totals.totalUsers) * 100)
                      : 0;
                  return (
                    <div key={pal.id} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-medium text-zinc-200">
                          <span className="inline-flex items-center -space-x-1">
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-zinc-700"
                              style={{ backgroundColor: pal.swatches.bg }}
                            />
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-zinc-700"
                              style={{ backgroundColor: pal.swatches.accent }}
                            />
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-zinc-700"
                              style={{ backgroundColor: pal.swatches.secondary }}
                            />
                          </span>
                          {pal.name}
                          <span className="text-zinc-500 font-normal">({pal.recommendedSystemLabel})</span>
                        </span>
                        <span className="trpg-num text-zinc-300 font-semibold">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: pal.swatches.accent,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="trpg-card p-5 flex flex-col justify-between gap-5">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                    <Icon name="sparkles" size={17} className="text-purple-400" />
                    Direções de Arte & Modo de Dados
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Tipografia, geometria e preferência entre dados físicos 3D ou 2D.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {ART_DIRECTION_CATALOG.map((art) => {
                    const count = data.themeStats.artDirections[art.id] || 0;
                    const pct =
                      data.totals.totalUsers > 0
                        ? Math.round((count / data.totals.totalUsers) * 100)
                        : 0;
                    return (
                      <div
                        key={art.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-zinc-100">{art.name}</span>
                          <span className="trpg-badge trpg-num">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <span className="text-[11px] text-zinc-500">{art.fontsLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-zinc-400">Preferência de Rolagem de Dados:</span>
                  <div className="flex flex-wrap gap-2">
                    {(['auto', '3d', '2d'] as const).map((mode) => (
                      <span key={mode} className="trpg-badge trpg-num">
                        {DICE_MODE_LABELS[mode]}: {data.themeStats.diceModes[mode] || 0}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Tema automático ao entrar em mesa/ficha de um sistema:</span>
                  <span className="trpg-num font-semibold text-zinc-200">
                    {data.themeStats.autoSystemThemeCount} de {data.totals.totalUsers} usuários
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 pt-2 border-t border-zinc-800/70">
                  <span>Personagens por Sistema:</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="trpg-badge trpg-num">
                      Ordem: {data.totals.charactersBySystem['ordem-paranormal'] || 0}
                    </span>
                    <span className="trpg-badge trpg-num">
                      Tormenta 20: {data.totals.charactersBySystem.tormenta20 || 0}
                    </span>
                    <span className="trpg-badge trpg-num">
                      Duna: {data.totals.charactersBySystem.duna || 0}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Prévia das Últimas Atividades */}
          <section className="trpg-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Icon name="activity" size={17} className="text-sky-400" />
                Últimas Atividades Registradas
              </h3>
              <button
                type="button"
                onClick={() => setSubTab('activity')}
                className="trpg-btn-quiet trpg-btn-sm"
              >
                Ver histórico completo ({data.events.length})
              </button>
            </div>

            {data.events.length === 0 ? (
              <p className="text-sm text-zinc-500 py-4 text-center">
                Nenhuma atividade registrada ainda.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800/80">
                {data.events.slice(0, 10).map((ev) => {
                  const meta = EVENT_CATEGORY_META[ev.category] || EVENT_CATEGORY_META.system;
                  return (
                    <li key={ev.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`mt-0.5 shrink-0 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}
                        >
                          <Icon name={meta.icon} size={12} />
                          {meta.label}
                        </span>
                        <div className="min-w-0">
                          <p className="text-zinc-200 leading-snug">{ev.summary}</p>
                          {ev.details && (
                            <p className="text-xs text-zinc-500 mt-0.5 truncate">{ev.details}</p>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-500 trpg-num">
                        {formatDateTime(ev.createdAt)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ABA 2: FEED COMPLETO DE ATIVIDADES */}
      {subTab === 'activity' && (
        <section className="trpg-card p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: 'Todas' },
                  { id: 'connection', label: 'Conexões' },
                  { id: 'auth', label: 'Contas & Login' },
                  { id: 'theme', label: 'Temas' },
                  { id: 'character', label: 'Personagens' },
                  { id: 'campaign', label: 'Campanhas' },
                  { id: 'dice', label: 'Rolagens' },
                  { id: 'system', label: 'Sistema' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setEventCategoryFilter(f.id)}
                  className={
                    eventCategoryFilter === f.id
                      ? 'trpg-btn-primary trpg-btn-sm'
                      : 'trpg-btn-secondary trpg-btn-sm'
                  }
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="search"
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                placeholder="Buscar @usuário, IP, ação..."
                className="trpg-input sm:w-64"
              />
              {data.events.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearEvents}
                  className="trpg-btn-secondary trpg-btn-sm shrink-0 hover:text-red-300!"
                  title="Limpar histórico"
                >
                  <Icon name="trash" size={15} />
                </button>
              )}
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <p className="text-sm text-zinc-500 py-8 text-center">
              Nenhum evento corresponde ao filtro selecionado.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800/80 max-h-[38rem] overflow-y-auto pr-1">
              {filteredEvents.map((ev) => {
                const meta = EVENT_CATEGORY_META[ev.category] || EVENT_CATEGORY_META.system;
                return (
                  <li key={ev.id} className="py-3 flex items-start justify-between gap-4 text-sm">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`mt-0.5 shrink-0 inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-[11px] font-medium ${meta.badgeClass}`}
                      >
                        <Icon name={meta.icon} size={12} />
                        {meta.label}
                      </span>
                      <div className="min-w-0">
                        <p className="text-zinc-100 leading-snug">{ev.summary}</p>
                        {ev.details && <p className="text-xs text-zinc-400 mt-0.5">{ev.details}</p>}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500 trpg-num">
                      {formatDateTime(ev.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* ABA 3: USUÁRIOS CADASTRADOS & TEMAS */}
      {subTab === 'users' && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `Todos (${data.users.length})` },
                  {
                    id: 'online',
                    label: `Online agora (${data.users.filter((u) => u.isOnline).length})`,
                  },
                  {
                    id: 'admin',
                    label: `Admins (${data.users.filter((u) => u.isAdmin).length})`,
                  },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setUserFilterMode(m.id)}
                  className={
                    userFilterMode === m.id
                      ? 'trpg-btn-primary trpg-btn-sm'
                      : 'trpg-btn-secondary trpg-btn-sm'
                  }
                >
                  {m.label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar usuário, e-mail, tema ou dispositivo..."
              className="trpg-input sm:w-80"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredUsers.map((u) => {
              const pal = resolvePaletteInfo(u.theme.palette);
              const artName = resolveArtDirectionName(u.theme.artDirection);
              return (
                <div key={u.id} className="trpg-card p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                            u.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'
                          }`}
                        />
                        <h3 className="text-lg font-semibold text-zinc-100 truncate">
                          @{u.username}
                        </h3>
                        {u.isAdmin && (
                          <span className="rounded border border-amber-700/70 bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                            Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">{u.email}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {u.isOnline
                          ? `Online agora (${VIEW_LABELS[u.currentView || 'dashboard'] || u.currentView}${
                              u.currentContextLabel ? ` • ${u.currentContextLabel}` : ''
                            })`
                          : `Último acesso: ${formatRelativeTime(u.lastSeenAt)}`}
                        {u.device ? ` • ${u.device}` : ''}
                        {u.lastIp ? ` • IP ${u.lastIp}` : ''}
                      </p>
                    </div>

                    {u.id !== currentUserId && (
                      <button
                        type="button"
                        onClick={() => handleToggleAdmin(u.id, u.username, u.isAdmin)}
                        className="trpg-btn-secondary trpg-btn-sm shrink-0"
                      >
                        {u.isAdmin ? 'Revogar Admin' : 'Tornar Admin'}
                      </button>
                    )}
                  </div>

                  {/* Tema e Preferências Visuais do Usuário */}
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center -space-x-1">
                        <span
                          className="h-4 w-4 rounded-full border border-zinc-700"
                          style={{ backgroundColor: pal.swatches.bg }}
                        />
                        <span
                          className="h-4 w-4 rounded-full border border-zinc-700"
                          style={{ backgroundColor: pal.swatches.accent }}
                        />
                        <span
                          className="h-4 w-4 rounded-full border border-zinc-700"
                          style={{ backgroundColor: pal.swatches.secondary }}
                        />
                      </span>
                      <div>
                        <span className="text-xs font-semibold text-zinc-100 block">
                          {pal.name} • {artName}
                        </span>
                        <span className="text-[11px] text-zinc-500 block">
                          {DICE_MODE_LABELS[u.theme.diceMode] || u.theme.diceMode} •{' '}
                          {u.theme.density === 'compact' ? 'Compacto' : 'Confortável'} •{' '}
                          {u.theme.hasSavedCustomPrefs ? 'Personalizado' : 'Tema padrão'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 trpg-num">
                      <span>{u.loginCount} logins</span>
                      <span>•</span>
                      <span>{u.totalRolls} rolagens</span>
                    </div>
                  </div>

                  {/* Personagens deste usuário */}
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>
                        {u.charactersCount}{' '}
                        {u.charactersCount === 1 ? 'personagem criado' : 'personagens criados'} •{' '}
                        {u.campaignsAsDmCount}{' '}
                        {u.campaignsAsDmCount === 1 ? 'mesa mestrada' : 'mesas mestradas'}
                      </span>
                      <span className="text-zinc-500">
                        Conta desde {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {u.characters.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {u.characters.map((ch) => (
                          <button
                            key={ch.id}
                            type="button"
                            onClick={() =>
                              onOpenCharacter(ch.id, undefined, ch.system as SystemId)
                            }
                            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/90 hover:border-zinc-600 px-2.5 py-1 text-xs text-zinc-200 transition cursor-pointer"
                            title="Inspecionar ficha deste personagem"
                          >
                            <Icon name="user" size={12} className="text-amber-400" />
                            {ch.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ABA 4: TODOS OS PERSONAGENS CRIADOS */}
      {subTab === 'characters' && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'ALL', label: `Todos (${data.characters.length})` },
                  {
                    id: 'ordem-paranormal',
                    label: `Ordem Paranormal (${data.totals.charactersBySystem['ordem-paranormal'] || 0})`,
                  },
                  {
                    id: 'tormenta20',
                    label: `Tormenta 20 (${data.totals.charactersBySystem.tormenta20 || 0})`,
                  },
                  {
                    id: 'duna',
                    label: `Duna (${data.totals.charactersBySystem.duna || 0})`,
                  },
                ] as const
              ).map((sys) => (
                <button
                  key={sys.id}
                  type="button"
                  onClick={() => setCharSystemFilter(sys.id)}
                  className={
                    charSystemFilter === sys.id
                      ? 'trpg-btn-primary trpg-btn-sm'
                      : 'trpg-btn-secondary trpg-btn-sm'
                  }
                >
                  {sys.label}
                </button>
              ))}
            </div>

            <input
              type="search"
              value={charSearch}
              onChange={(e) => setCharSearch(e.target.value)}
              placeholder="Buscar personagem, @dono, classe, mesa..."
              className="trpg-input sm:w-80"
            />
          </div>

          {filteredCharacters.length === 0 ? (
            <div className="trpg-card p-8 text-center text-sm text-zinc-500">
              Nenhum personagem encontrado para este filtro.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCharacters.map((c) => (
                <div key={c.id} className="trpg-card p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Portrait url={c.portraitUrl} name={c.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-semibold text-zinc-100 truncate">{c.name}</h3>
                        <SystemSigilBadge system={c.system} compact />
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5 truncate">
                        Criado por <span className="text-zinc-200 font-medium">@{c.ownerUsername}</span>
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.summary.className && (
                          <span className="trpg-badge">{c.summary.className}</span>
                        )}
                        {c.summary.nex !== null && (
                          <span className="trpg-badge trpg-num">NEX {c.summary.nex}%</span>
                        )}
                        {c.summary.level !== null && (
                          <span className="trpg-badge trpg-num">Nv {c.summary.level}</span>
                        )}
                        {c.summary.origin && (
                          <span className="trpg-badge">{c.summary.origin}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {c.vitals.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 text-center text-xs">
                      {c.vitals.map((v) => (
                        <div
                          key={v.id}
                          className="rounded bg-zinc-950/70 border border-zinc-800/80 px-2 py-1"
                        >
                          <span className="text-[10px] uppercase text-zinc-500 block">
                            {v.id.toUpperCase()}
                          </span>
                          <span className="trpg-num font-semibold text-zinc-200">
                            {v.current}/{v.max}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-800">
                    <span
                      className={`text-xs truncate ${
                        c.campaignName ? 'text-emerald-300' : 'text-zinc-500'
                      }`}
                    >
                      {c.campaignName ? `Mesa: ${c.campaignName}` : 'Livre no cofre'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenCharacter(c.id, c.campaignId || undefined, c.system)}
                      className="trpg-btn-secondary trpg-btn-sm shrink-0"
                    >
                      <Icon name="eye" size={14} /> Inspecionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ABA 5: TODAS AS CAMPANHAS */}
      {subTab === 'campaigns' && (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {data.campaigns.length === 0 ? (
            <div className="trpg-card p-8 text-center text-sm text-zinc-500 lg:col-span-2">
              Nenhuma campanha criada ainda.
            </div>
          ) : (
            data.campaigns.map((camp) => (
              <div key={camp.id} className="trpg-card p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold text-zinc-100 truncate">{camp.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Mestre: <span className="text-zinc-200 font-medium">@{camp.dmUsername}</span> •
                      Criada em {new Date(camp.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                    {camp.description && (
                      <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2">{camp.description}</p>
                    )}
                  </div>
                  <SystemSigilBadge system={camp.system} compact />
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="trpg-badge trpg-code">{camp.inviteCode}</span>
                  <span className="trpg-badge trpg-num">{camp.playersCount} jogadores</span>
                  {camp.pendingInvitesCount > 0 && (
                    <span className="trpg-badge trpg-num">
                      {camp.pendingInvitesCount} convites pendentes
                    </span>
                  )}
                  {camp.lockAllSheets && (
                    <span className="trpg-badge text-amber-300!">Fichas travadas</span>
                  )}
                  {camp.allowTrade && (
                    <span className="trpg-badge text-emerald-300!">Troca liberada</span>
                  )}
                </div>

                {camp.characters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800">
                    {camp.characters.map((ch) => (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() => onOpenCharacter(ch.id, camp.id, camp.system)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:border-zinc-600 px-2.5 py-1 text-xs text-zinc-200 transition cursor-pointer"
                      >
                        <Icon name="user" size={12} className="text-emerald-400" />
                        {ch.name} <span className="text-zinc-500">(@{ch.ownerUsername})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}
