import { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import {
  SystemId,
  ORDEM_NEX_PROGRESSION,
  ORDEM_PATENTS,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@totalrpg/shared';
import {
  CampaignData,
  CharacterData,
  InviteData,
  fetchDMCampaigns,
  fetchPlayerCampaigns,
  fetchPlayerInvites,
  fetchCharacters,
  createCampaign,
  createCharacter,
  sendCampaignInvite,
  acceptCampaignInvite,
  declineCampaignInvite,
  joinCampaignByCode,
  deleteCharacter,
  removeCharacterFromCampaign,
  deleteCampaign,
} from '../services/api';
import { AdminPanel } from './AdminPanel';
import { PlatformAdminDashboard } from './PlatformAdminDashboard';
import { CharacterWizardModal } from './CharacterWizardModal';
import { UserSettingsPanel } from './UserSettingsPanel';
import { SYSTEM_META, SystemSigilBadge } from './BrandMark';
import { Dialog } from './ui/Dialog';
import { Icon, IconName } from './ui/Icon';
import { Portrait } from './ui/Portrait';

export type DashboardTabId =
  | 'player'
  | 'characters'
  | 'dm'
  | 'admin-overview'
  | 'admin'
  | 'settings';

interface DashboardProps {
  currentUser: { id: string; username: string; email: string; isAdmin?: boolean };
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  requestedTab?: DashboardTabId | null;
  onRequestedTabHandled?: () => void;
  onEnterSession: (campaignId: string, role: 'dm' | 'player', system?: SystemId) => void;
  onOpenCharacter: (characterId: string, campaignId?: string, system?: SystemId) => void;
}

export function Dashboard({
  currentUser,
  socket,
  requestedTab,
  onRequestedTabHandled,
  onEnterSession,
  onOpenCharacter,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<DashboardTabId>('player');

  const [dmCampaigns, setDmCampaigns] = useState<CampaignData[]>([]);
  const [playerCampaigns, setPlayerCampaigns] = useState<CampaignData[]>([]);
  const [invites, setInvites] = useState<InviteData[]>([]);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de criação de campanha e personagem
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [newCampaignSystem, setNewCampaignSystem] = useState<SystemId>('ordem-paranormal');
  const [newCampaignReqNex, setNewCampaignReqNex] = useState<string>('');
  const [newCampaignReqPatent, setNewCampaignReqPatent] = useState<string>('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  const [isCreatingChar, setIsCreatingChar] = useState(false);
  const [wizardLockedSystem, setWizardLockedSystem] = useState<SystemId | undefined>(undefined);
  const [wizardLockedNex, setWizardLockedNex] = useState<number | null>(null);
  const [wizardLockedPatent, setWizardLockedPatent] = useState<string | null>(null);

  // Estados para enviar convite (Mestre)
  const [invitingCampaignId, setInvitingCampaignId] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState('');
  const [inviteReqNex, setInviteReqNex] = useState<string>('');
  const [inviteReqPatent, setInviteReqPatent] = useState<string>('');

  // Estados do Modal de Aceitar Convite / Entrar por Código (Jogador)
  const [selectedInviteToAccept, setSelectedInviteToAccept] = useState<InviteData | null>(null);
  const [isJoinByCodeModalOpen, setIsJoinByCodeModalOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [selectedCharIdForJoin, setSelectedCharIdForJoin] = useState('');
  const [quickCharName, setQuickCharName] = useState('');

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
      onRequestedTabHandled?.();
    }
  }, [requestedTab, onRequestedTabHandled]);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      if (activeTab === 'player') {
        const [camp, inv, chars] = await Promise.all([
          fetchPlayerCampaigns(),
          fetchPlayerInvites(),
          fetchCharacters(),
        ]);
        setPlayerCampaigns(camp);
        setInvites(inv);
        setCharacters(chars);
      } else if (activeTab === 'characters') {
        const chars = await fetchCharacters();
        setCharacters(chars);
      } else if (activeTab === 'dm') {
        const camp = await fetchDMCampaigns();
        setDmCampaigns(camp);
      }
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== 'admin' && activeTab !== 'admin-overview' && activeTab !== 'settings') {
      loadDashboardData();
    }
  }, [activeTab]);

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCampaign(newCampaignName, newCampaignDesc, newCampaignSystem, {
        requiredNex:
          newCampaignSystem === 'ordem-paranormal' && newCampaignReqNex !== ''
            ? Number(newCampaignReqNex)
            : null,
        requiredPatent:
          newCampaignSystem === 'ordem-paranormal' && newCampaignReqPatent !== ''
            ? newCampaignReqPatent
            : null,
      });
      setNewCampaignName('');
      setNewCampaignDesc('');
      setNewCampaignReqNex('');
      setNewCampaignReqPatent('');
      setIsCreatingCampaign(false);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleSendInvite(campaignId: string) {
    if (!targetUsername.trim()) return;
    try {
      await sendCampaignInvite(campaignId, targetUsername.trim(), {
        requiredNex: inviteReqNex !== '' ? Number(inviteReqNex) : null,
        requiredPatent: inviteReqPatent !== '' ? inviteReqPatent : null,
      });
      alert(`Convite enviado para ${targetUsername}!`);
      setTargetUsername('');
      setInviteReqNex('');
      setInviteReqPatent('');
      setInvitingCampaignId(null);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleConfirmAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInviteToAccept) return;

    try {
      let charIdToUse = selectedCharIdForJoin;

      if (!charIdToUse && quickCharName.trim()) {
        const created = await createCharacter(
          quickCharName.trim(),
          selectedInviteToAccept.campaign.system
        );
        charIdToUse = created.id;
      }

      if (!charIdToUse) {
        alert('Selecione um personagem do seu cofre ou digite um nome para criar um novo.');
        return;
      }

      await acceptCampaignInvite(selectedInviteToAccept.id, charIdToUse);
      setSelectedInviteToAccept(null);
      setSelectedCharIdForJoin('');
      setQuickCharName('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDeclineInvite(inviteId: string) {
    try {
      await declineCampaignInvite(inviteId);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleConfirmJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCodeInput.trim() || !selectedCharIdForJoin) {
      alert('Digite o código da mesa e escolha um personagem do seu cofre.');
      return;
    }

    try {
      await joinCampaignByCode(inviteCodeInput.trim(), selectedCharIdForJoin);
      setIsJoinByCodeModalOpen(false);
      setInviteCodeInput('');
      setSelectedCharIdForJoin('');
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  const inviteRequiredNex = selectedInviteToAccept
    ? selectedInviteToAccept.requiredNex ?? selectedInviteToAccept.campaign.requiredNex ?? null
    : null;
  const inviteRequiredPatent = selectedInviteToAccept
    ? selectedInviteToAccept.requiredPatent ?? selectedInviteToAccept.campaign.requiredPatent ?? null
    : null;

  function checkInviteRequirements(c: CharacterData): { ok: boolean; reason?: string } {
    if (!selectedInviteToAccept) return { ok: true };
    if (c.system !== selectedInviteToAccept.campaign.system) {
      return { ok: false, reason: `Sistema ${c.system}` };
    }
    if (c.system === 'ordem-paranormal') {
      const charNex = Number(c.sheetData?.nex ?? 5);
      const charPatent = String(c.sheetData?.patent || 'Recruta');
      if (typeof inviteRequiredNex === 'number' && charNex !== inviteRequiredNex) {
        return { ok: false, reason: `NEX ${charNex}% ≠ exigido ${inviteRequiredNex}%` };
      }
      if (
        inviteRequiredPatent &&
        charPatent.trim().toLowerCase() !== inviteRequiredPatent.trim().toLowerCase()
      ) {
        return { ok: false, reason: `Patente "${charPatent}" ≠ "${inviteRequiredPatent}"` };
      }
    }
    return { ok: true };
  }

  const compatibleCharactersForInvite = selectedInviteToAccept
    ? characters.filter(
        (c) => !c.campaign && c.system === selectedInviteToAccept.campaign.system
      )
    : [];
  const matchingCharactersForInvite = compatibleCharactersForInvite.filter(
    (c) => checkInviteRequirements(c).ok
  );

  const availableVaultCharacters = characters.filter((c) => !c.campaign);

  const navItems: Array<{ id: DashboardTabId; label: string; icon: IconName; count?: number }> = [
    { id: 'player', label: 'Minhas mesas', icon: 'd20', count: invites.length > 0 ? invites.length : undefined },
    { id: 'characters', label: 'Personagens', icon: 'user' },
    { id: 'dm', label: 'Mestrar', icon: 'shield' },
    ...(currentUser.isAdmin
      ? ([
          { id: 'admin-overview', label: 'Painel Admin', icon: 'activity' },
          { id: 'admin', label: 'Compêndio', icon: 'library' },
        ] as Array<{ id: DashboardTabId; label: string; icon: IconName }>)
      : []),
    { id: 'settings', label: 'Configurações', icon: 'settings' },
  ];

  const invitingCampaign = dmCampaigns.find((c) => c.id === invitingCampaignId) || null;

  function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
    return (
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 basis-[22rem]">
          <h2 className="text-[1.75rem] sm:text-3xl leading-tight">{title}</h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-[60ch]">{description}</p>
        </div>
        {action}
      </div>
    );
  }

  function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-700 px-6 py-12 flex flex-col items-center text-center gap-2">
        <Icon name="d20" size={28} className="text-zinc-600 mb-1" />
        <p className="text-base font-semibold text-zinc-100">{title}</p>
        <p className="text-sm text-zinc-400 max-w-[46ch]">{body}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  function openWizard(system?: SystemId) {
    setWizardLockedSystem(system);
    setIsCreatingChar(true);
  }

  return (
    <div className="flex flex-col gap-7">
      {isCreatingChar && (
        <CharacterWizardModal
          lockedSystem={wizardLockedSystem}
          lockedNex={wizardLockedNex}
          lockedPatent={wizardLockedPatent}
          onClose={() => {
            setIsCreatingChar(false);
            setWizardLockedSystem(undefined);
            setWizardLockedNex(null);
            setWizardLockedPatent(null);
          }}
          onCreated={async (created) => {
            setIsCreatingChar(false);
            setWizardLockedSystem(undefined);
            setWizardLockedNex(null);
            setWizardLockedPatent(null);
            await loadDashboardData();
            setSelectedCharIdForJoin(created.id);
            setQuickCharName('');
          }}
        />
      )}

      {/* Aceitar convite */}
      <Dialog
        open={Boolean(selectedInviteToAccept)}
        onClose={() => setSelectedInviteToAccept(null)}
        size="sm"
        title={selectedInviteToAccept?.campaign.name}
        description={
          selectedInviteToAccept ? `Convite de @${selectedInviteToAccept.campaign.dm.username}` : undefined
        }
        footer={
          <>
            <button type="button" onClick={() => setSelectedInviteToAccept(null)} className="trpg-btn-quiet">
              Cancelar
            </button>
            <button type="submit" form="accept-invite-form" className="trpg-btn-primary">
              Entrar na mesa
            </button>
          </>
        }
      >
        {selectedInviteToAccept && (
          <form id="accept-invite-form" onSubmit={handleConfirmAcceptInvite} className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <SystemSigilBadge system={selectedInviteToAccept.campaign.system} />
              {typeof inviteRequiredNex === 'number' && <span className="trpg-badge">NEX {inviteRequiredNex}%</span>}
              {inviteRequiredPatent && <span className="trpg-badge">{inviteRequiredPatent}</span>}
            </div>

            {compatibleCharactersForInvite.length > 0 && (
              <div>
                <label htmlFor="invite-char-select" className="trpg-label">
                  Levar um personagem do seu cofre
                </label>
                <select
                  id="invite-char-select"
                  value={selectedCharIdForJoin}
                  onChange={(e) => {
                    setSelectedCharIdForJoin(e.target.value);
                    if (e.target.value) setQuickCharName('');
                  }}
                  className="trpg-input"
                >
                  <option value="">Escolha um personagem</option>
                  {compatibleCharactersForInvite.map((c) => {
                    const check = checkInviteRequirements(c);
                    const extra =
                      c.system === 'ordem-paranormal'
                        ? ` — NEX ${c.sheetData?.nex ?? 5}%, ${c.sheetData?.patent || 'Recruta'}`
                        : '';
                    return (
                      <option key={c.id} value={c.id} disabled={!check.ok}>
                        {c.name}
                        {extra}
                        {!check.ok ? ` (não atende: ${check.reason})` : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-xs text-zinc-500 mt-1.5">
                  {matchingCharactersForInvite.length} de {compatibleCharactersForInvite.length} atendem aos requisitos da mesa.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="trpg-label mb-0">
                {compatibleCharactersForInvite.length > 0 ? 'Ou crie um personagem novo' : 'Crie seu personagem para esta mesa'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setWizardLockedSystem(selectedInviteToAccept.campaign.system);
                  setWizardLockedNex(inviteRequiredNex);
                  setWizardLockedPatent(inviteRequiredPatent);
                  setIsCreatingChar(true);
                }}
                className="trpg-btn-secondary w-full"
              >
                <Icon name="sparkles" size={16} /> Abrir assistente de criação
              </button>
              {typeof inviteRequiredNex !== 'number' && !inviteRequiredPatent && (
                <>
                  <label htmlFor="quick-char-name" className="sr-only">
                    Nome para ficha rápida
                  </label>
                  <input
                    id="quick-char-name"
                    type="text"
                    value={quickCharName}
                    onChange={(e) => {
                      setQuickCharName(e.target.value);
                      if (e.target.value) setSelectedCharIdForJoin('');
                    }}
                    placeholder="Ou só um nome, para uma ficha rápida"
                    className="trpg-input"
                  />
                </>
              )}
            </div>
          </form>
        )}
      </Dialog>

      {/* Entrar por código */}
      <Dialog
        open={isJoinByCodeModalOpen}
        onClose={() => setIsJoinByCodeModalOpen(false)}
        size="sm"
        title="Entrar com código"
        description="O mestre encontra o código no card da campanha."
        footer={
          <>
            <button type="button" onClick={() => setIsJoinByCodeModalOpen(false)} className="trpg-btn-quiet">
              Cancelar
            </button>
            <button
              type="submit"
              form="join-code-form"
              disabled={availableVaultCharacters.length === 0}
              className="trpg-btn-primary"
            >
              Entrar na mesa
            </button>
          </>
        }
      >
        <form id="join-code-form" onSubmit={handleConfirmJoinByCode} className="flex flex-col gap-5">
          <div>
            <label htmlFor="join-invite-code" className="trpg-label">
              Código da mesa
            </label>
            <input
              id="join-invite-code"
              type="text"
              required
              autoComplete="off"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
              placeholder="TR-8F2A"
              className="trpg-input trpg-code text-lg"
            />
          </div>
          <div>
            <label htmlFor="join-vault-char" className="trpg-label">
              Personagem
            </label>
            {availableVaultCharacters.length === 0 ? (
              <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-300 flex flex-col gap-3">
                Você não tem personagens livres no cofre.
                <button type="button" onClick={() => openWizard()} className="trpg-btn-secondary trpg-btn-sm self-start">
                  <Icon name="plus" size={15} /> Criar personagem
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <select
                  id="join-vault-char"
                  required
                  value={selectedCharIdForJoin}
                  onChange={(e) => setSelectedCharIdForJoin(e.target.value)}
                  className="trpg-input"
                >
                  <option value="">Escolha quem vai para a mesa</option>
                  {availableVaultCharacters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {SYSTEM_META[c.system]?.label || c.system}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => openWizard()} className="trpg-btn-quiet trpg-btn-sm self-start">
                  <Icon name="plus" size={15} /> Criar outro personagem
                </button>
              </div>
            )}
          </div>
        </form>
      </Dialog>

      {/* Nova campanha */}
      <Dialog
        open={isCreatingCampaign}
        onClose={() => setIsCreatingCampaign(false)}
        size="md"
        title="Nova campanha"
        description="Você recebe um código para os jogadores entrarem."
        footer={
          <>
            <button type="button" onClick={() => setIsCreatingCampaign(false)} className="trpg-btn-quiet">
              Cancelar
            </button>
            <button type="submit" form="new-campaign-form" className="trpg-btn-primary">
              Criar campanha
            </button>
          </>
        }
      >
        <form id="new-campaign-form" onSubmit={handleCreateCampaign} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="new-camp-name" className="trpg-label">
              Nome
            </label>
            <input
              id="new-camp-name"
              type="text"
              required
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
              placeholder="Caso Subsolo"
              className="trpg-input"
            />
          </div>
          <div className="sm:col-span-2">
            <span className="trpg-label">Sistema</span>
            <div role="radiogroup" aria-label="Sistema" className="grid grid-cols-3 gap-2">
              {(['ordem-paranormal', 'tormenta20', 'duna'] as SystemId[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={newCampaignSystem === s}
                  onClick={() => setNewCampaignSystem(s)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                    newCampaignSystem === s
                      ? 'border-amber-500 bg-amber-950/40 text-zinc-100'
                      : 'border-zinc-700 text-zinc-300 hover:border-zinc-500'
                  }`}
                >
                  {SYSTEM_META[s].label}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="new-camp-desc" className="trpg-label">
              Resumo <span className="font-normal text-zinc-500">(opcional)</span>
            </label>
            <input
              id="new-camp-desc"
              type="text"
              value={newCampaignDesc}
              onChange={(e) => setNewCampaignDesc(e.target.value)}
              placeholder="Ambientação, tom da mesa"
              className="trpg-input"
            />
          </div>
          {newCampaignSystem === 'ordem-paranormal' && (
            <>
              <div>
                <label htmlFor="new-camp-nex" className="trpg-label">
                  NEX exigido
                </label>
                <select
                  id="new-camp-nex"
                  value={newCampaignReqNex}
                  onChange={(e) => setNewCampaignReqNex(e.target.value)}
                  className="trpg-input"
                >
                  <option value="">Qualquer</option>
                  {ORDEM_NEX_PROGRESSION.map((m) => (
                    <option key={m.nex} value={String(m.nex)}>
                      NEX {m.nex}%
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="new-camp-patent" className="trpg-label">
                  Patente exigida
                </label>
                <select
                  id="new-camp-patent"
                  value={newCampaignReqPatent}
                  onChange={(e) => setNewCampaignReqPatent(e.target.value)}
                  className="trpg-input"
                >
                  <option value="">Qualquer</option>
                  <option value="Mundano">Mundano</option>
                  {ORDEM_PATENTS.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </form>
      </Dialog>

      {/* Convidar jogador */}
      <Dialog
        open={Boolean(invitingCampaign)}
        onClose={() => setInvitingCampaignId(null)}
        size="sm"
        title="Convidar jogador"
        description={invitingCampaign ? `Para ${invitingCampaign.name}` : undefined}
        footer={
          <>
            <button type="button" onClick={() => setInvitingCampaignId(null)} className="trpg-btn-quiet">
              Cancelar
            </button>
            <button
              type="button"
              disabled={!targetUsername.trim()}
              onClick={() => invitingCampaign && handleSendInvite(invitingCampaign.id)}
              className="trpg-btn-primary"
            >
              Enviar convite
            </button>
          </>
        }
      >
        {invitingCampaign && (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg bg-zinc-950/60 border border-zinc-800 px-3.5 py-3 flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-400">Ou compartilhe o código</span>
              <span className="trpg-code text-lg text-zinc-100">{invitingCampaign.inviteCode}</span>
            </div>
            <div>
              <label htmlFor="inv-user" className="trpg-label">
                Nome de usuário
              </label>
              <input
                id="inv-user"
                type="text"
                autoFocus
                value={targetUsername}
                onChange={(e) => setTargetUsername(e.target.value)}
                placeholder="usuario_do_jogador"
                className="trpg-input"
              />
            </div>
            {invitingCampaign.system === 'ordem-paranormal' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="inv-nex" className="trpg-label">
                    NEX exigido
                  </label>
                  <select id="inv-nex" value={inviteReqNex} onChange={(e) => setInviteReqNex(e.target.value)} className="trpg-input">
                    <option value="">Qualquer</option>
                    {ORDEM_NEX_PROGRESSION.map((m) => (
                      <option key={m.nex} value={String(m.nex)}>
                        NEX {m.nex}%
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="inv-pat" className="trpg-label">
                    Patente exigida
                  </label>
                  <select id="inv-pat" value={inviteReqPatent} onChange={(e) => setInviteReqPatent(e.target.value)} className="trpg-input">
                    <option value="">Qualquer</option>
                    <option value="Mundano">Mundano</option>
                    {ORDEM_PATENTS.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>

      {/* Abas do início */}
      <div role="tablist" aria-label="Seções do início" className="trpg-tabs -mx-1">
        {navItems.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="trpg-tab"
          >
            <Icon name={tab.icon} size={16} className={activeTab === tab.id ? 'text-amber-500' : ''} />
            {tab.label}
            {typeof tab.count === 'number' && tab.count > 0 && (
              <span className="trpg-tab-count bg-amber-600! text-white!" aria-label={`${tab.count} convites`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="sr-only">
        {isLoading ? 'Carregando' : ''}
      </div>

      {activeTab === 'player' && (
        <div className="flex flex-col gap-8">
          {invites.length > 0 && (
            <section aria-labelledby="invites-title" className="rounded-xl border border-amber-800/70 bg-amber-950/25 p-4 sm:p-5">
              <h3 id="invites-title" className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Icon name="megaphone" size={17} className="text-amber-400" />
                {invites.length === 1 ? 'Você recebeu um convite' : `Você recebeu ${invites.length} convites`}
              </h3>
              <ul className="mt-3 flex flex-col divide-y divide-zinc-800/80">
                {invites.map((inv) => {
                  const nex = inv.requiredNex ?? inv.campaign.requiredNex;
                  const patent = inv.requiredPatent ?? inv.campaign.requiredPatent;
                  return (
                    <li key={inv.id} className="py-3 first:pt-1 last:pb-0 flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="font-semibold text-zinc-100">{inv.campaign.name}</strong>
                          <SystemSigilBadge system={inv.campaign.system} compact />
                        </div>
                        <p className="text-sm text-zinc-400 mt-0.5">
                          Mestre @{inv.campaign.dm.username}
                          {nex !== null && nex !== undefined ? `, exige NEX ${nex}%` : ''}
                          {patent ? `, patente ${patent}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleDeclineInvite(inv.id)} className="trpg-btn-quiet trpg-btn-sm">
                          Recusar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCharIdForJoin('');
                            setQuickCharName('');
                            setSelectedInviteToAccept(inv);
                          }}
                          className="trpg-btn-primary trpg-btn-sm"
                        >
                          Aceitar
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <SectionHeader
            title="Minhas mesas"
            description="As campanhas em que você joga. Abra a ficha para rolar, gastar recursos e ver o que o mestre compartilhar."
            action={
              <button
                type="button"
                onClick={() => {
                  setInviteCodeInput('');
                  setSelectedCharIdForJoin('');
                  setIsJoinByCodeModalOpen(true);
                }}
                className="trpg-btn-secondary"
              >
                <Icon name="key" size={16} /> Entrar com código
              </button>
            }
          />

          {playerCampaigns.length === 0 ? (
            <EmptyState
              title="Você ainda não está em nenhuma mesa"
              body="Peça o código ao seu mestre, ou espere o convite aparecer aqui."
            />
          ) : (
            <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {playerCampaigns.map((camp) => {
                const myChar = camp.characters?.[0];
                return (
                  <li key={camp.id}>
                    <button
                      type="button"
                      disabled={!myChar}
                      onClick={() => myChar && onOpenCharacter(myChar.id, camp.id, camp.system)}
                      className="trpg-card trpg-card-interactive w-full text-left p-4 flex items-center gap-4 disabled:opacity-60"
                    >
                      <Portrait name={myChar?.name || camp.name} url={myChar?.portraitUrl} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xl trpg-display text-zinc-100 truncate">{myChar?.name || 'Sem ficha'}</span>
                        <span className="block text-sm text-zinc-300 truncate mt-0.5">{camp.name}</span>
                        <span className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                          <SystemSigilBadge system={camp.system} compact /> Mestre @{camp.dm?.username}
                        </span>
                      </span>
                      <Icon name="chevron-down" size={18} className="-rotate-90 text-zinc-500 shrink-0" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'characters' && (
        <div className="flex flex-col gap-6">
          <SectionHeader
            title="Personagens"
            description="Monte fichas antes da sessão e leve qualquer uma para uma mesa compatível."
            action={
              <button type="button" onClick={() => openWizard()} className="trpg-btn-primary">
                <Icon name="plus" size={17} /> Criar personagem
              </button>
            }
          />

          {characters.length === 0 ? (
            <EmptyState
              title="Nenhum personagem ainda"
              body="O assistente guia a criação passo a passo: origem, atributos, classe e perícias."
              action={
                <button type="button" onClick={() => openWizard()} className="trpg-btn-primary">
                  <Icon name="sparkles" size={16} /> Criar o primeiro personagem
                </button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {characters.map((char) => {
                const nex = char.system === 'ordem-paranormal' ? char.sheetData?.nex : undefined;
                return (
                  <li key={char.id} className="trpg-card trpg-card-interactive p-4 flex flex-col gap-4">
                    <button
                      type="button"
                      onClick={() => onOpenCharacter(char.id, char.campaign?.id, char.system)}
                      className="flex items-center gap-4 text-left rounded-lg"
                    >
                      <Portrait name={char.name} url={char.portraitUrl} size="lg" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xl trpg-display text-zinc-100 truncate" title={char.name}>
                          {char.name}
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <SystemSigilBadge system={char.system} compact />
                          {nex !== undefined && <span className="trpg-badge trpg-num">NEX {nex}%</span>}
                        </span>
                        <span className={`block text-xs mt-1.5 truncate ${char.campaign ? 'text-emerald-300' : 'text-zinc-500'}`}>
                          {char.campaign ? `Na mesa ${char.campaign.name}` : 'Livre no cofre'}
                        </span>
                      </span>
                    </button>
                    <div className="flex items-center gap-1 pt-3 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => onOpenCharacter(char.id, char.campaign?.id, char.system)}
                        className="trpg-btn-secondary trpg-btn-sm flex-1"
                      >
                        Abrir ficha
                      </button>
                      {char.campaign && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (!window.confirm(`Tirar "${char.name}" da mesa e devolver ao cofre?`)) return;
                            try {
                              await removeCharacterFromCampaign(char.campaign!.id, char.id);
                              loadDashboardData();
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }}
                          className="trpg-icon-btn"
                          aria-label={`Tirar ${char.name} da mesa`}
                          title="Tirar da mesa"
                        >
                          <Icon name="undo" size={17} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          if (!window.confirm(`Excluir a ficha de "${char.name}" para sempre?`)) return;
                          try {
                            await deleteCharacter(char.id);
                            loadDashboardData();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        className="trpg-icon-btn hover:text-red-300!"
                        aria-label={`Excluir ${char.name}`}
                        title="Excluir"
                      >
                        <Icon name="trash" size={17} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'dm' && (
        <div className="flex flex-col gap-6">
          <SectionHeader
            title="Mestrar"
            description="Abra o escudo para conduzir combate, ameaças, itens, anotações e a tela da TV."
            action={
              <button type="button" onClick={() => setIsCreatingCampaign(true)} className="trpg-btn-primary">
                <Icon name="plus" size={17} /> Nova campanha
              </button>
            }
          />

          {dmCampaigns.length === 0 ? (
            <EmptyState
              title="Nenhuma campanha ainda"
              body="Crie uma campanha para ganhar um código de convite e abrir o escudo do mestre."
              action={
                <button type="button" onClick={() => setIsCreatingCampaign(true)} className="trpg-btn-primary">
                  <Icon name="plus" size={17} /> Criar campanha
                </button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {dmCampaigns.map((camp) => (
                <li key={camp.id} className="trpg-card p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-2xl trpg-display text-zinc-100 leading-tight">{camp.name}</h3>
                      {camp.description && <p className="text-sm text-zinc-400 mt-1.5 max-w-[60ch]">{camp.description}</p>}
                    </div>
                    <SystemSigilBadge system={camp.system} compact />
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-3 gap-px rounded-lg overflow-hidden bg-zinc-800 text-sm">
                    <div className="bg-zinc-950/70 px-3 py-2">
                      <dt className="text-xs text-zinc-500">Código</dt>
                      <dd className="trpg-code text-zinc-100">{camp.inviteCode}</dd>
                    </div>
                    <div className="bg-zinc-950/70 px-3 py-2">
                      <dt className="text-xs text-zinc-500">Jogadores</dt>
                      <dd className="trpg-num font-semibold text-zinc-100">{camp.characters?.length || 0}</dd>
                    </div>
                    <div className="bg-zinc-950/70 px-3 py-2 col-span-2 sm:col-span-1">
                      <dt className="text-xs text-zinc-500">Requisitos</dt>
                      <dd className="text-zinc-200 truncate">
                        {typeof camp.requiredNex === 'number' || camp.requiredPatent
                          ? [typeof camp.requiredNex === 'number' ? `NEX ${camp.requiredNex}%` : '', camp.requiredPatent || '']
                              .filter(Boolean)
                              .join(', ')
                          : 'Livre'}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onEnterSession(camp.id, 'dm', camp.system)}
                      className="trpg-btn-primary flex-1"
                    >
                      <Icon name="shield" size={17} /> Abrir escudo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInvitingCampaignId(camp.id);
                        setTargetUsername('');
                        setInviteReqNex(typeof camp.requiredNex === 'number' ? String(camp.requiredNex) : '');
                        setInviteReqPatent(camp.requiredPatent || '');
                      }}
                      className="trpg-btn-secondary"
                    >
                      <Icon name="users" size={16} /> Convidar
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Excluir a campanha "${camp.name}"? As fichas dos jogadores voltam intactas para os cofres.`
                          )
                        )
                          return;
                        try {
                          await deleteCampaign(camp.id);
                          loadDashboardData();
                        } catch (err: any) {
                          alert(err.message);
                        }
                      }}
                      className="trpg-icon-btn hover:text-red-300!"
                      aria-label={`Excluir campanha ${camp.name}`}
                      title="Excluir campanha"
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'admin-overview' && currentUser.isAdmin && (
        <PlatformAdminDashboard
          currentUserId={currentUser.id}
          socket={socket}
          onOpenCharacter={onOpenCharacter}
        />
      )}

      {activeTab === 'admin' && currentUser.isAdmin && <AdminPanel />}

      {activeTab === 'settings' && <UserSettingsPanel currentUser={currentUser} />}
    </div>
  );
}
