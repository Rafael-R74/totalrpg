import { useState, useEffect } from 'react';
import { SystemId } from '@totalrpg/shared';
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
  deleteCampaign
} from '../services/api';
import { AdminPanel } from './AdminPanel';
import { ImageUploadField } from './ImageUploadField';
import { CharacterWizardModal } from './CharacterWizardModal';

interface DashboardProps {
  currentUser: { id: string; username: string; email: string };
  onEnterSession: (campaignId: string, role: 'dm' | 'player') => void;
  onOpenCharacter: (characterId: string, campaignId?: string) => void;
}

export function Dashboard({ currentUser, onEnterSession, onOpenCharacter }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'player' | 'characters' | 'dm' | 'admin'>('player');

  const [dmCampaigns, setDmCampaigns] = useState<CampaignData[]>([]);
  const [playerCampaigns, setPlayerCampaigns] = useState<CampaignData[]>([]);
  const [invites, setInvites] = useState<InviteData[]>([]);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de criação de campanha e personagem
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [newCampaignSystem, setNewCampaignSystem] = useState<SystemId>('ordem-paranormal');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  const [newCharName, setNewCharName] = useState('');
  const [newCharSystem, setNewCharSystem] = useState<SystemId>('ordem-paranormal');
  const [newCharPortrait, setNewCharPortrait] = useState('');
  const [isCreatingChar, setIsCreatingChar] = useState(false);
  const [wizardLockedSystem, setWizardLockedSystem] = useState<SystemId | undefined>(undefined);

  // Estados para enviar convite (Mestre)
  const [invitingCampaignId, setInvitingCampaignId] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState('');

  // Estados do Modal de Aceitar Convite / Entrar por Código (Jogador)
  const [selectedInviteToAccept, setSelectedInviteToAccept] = useState<InviteData | null>(null);
  const [isJoinByCodeModalOpen, setIsJoinByCodeModalOpen] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [selectedCharIdForJoin, setSelectedCharIdForJoin] = useState('');
  const [quickCharName, setQuickCharName] = useState('');

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
    if (activeTab !== 'admin') {
      loadDashboardData();
    }
  }, [activeTab]);

  async function handleCreateCampaign(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCampaign(newCampaignName, newCampaignDesc, newCampaignSystem);
      setNewCampaignName('');
      setNewCampaignDesc('');
      setIsCreatingCampaign(false);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleCreateCharacter(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCharacter(newCharName, newCharSystem, newCharPortrait || undefined);
      setNewCharName('');
      setNewCharPortrait('');
      setIsCreatingChar(false);
      loadDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleSendInvite(campaignId: string) {
    if (!targetUsername.trim()) return;
    try {
      await sendCampaignInvite(campaignId, targetUsername.trim());
      alert(`Convite enviado para ${targetUsername}!`);
      setTargetUsername('');
      setInvitingCampaignId(null);
    } catch (err: any) {
      alert(err.message);
    }
  }

  // Confirma a entrada via Convite Direto (usando ficha existente ou criando uma nova na hora)
  async function handleConfirmAcceptInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInviteToAccept) return;

    try {
      let charIdToUse = selectedCharIdForJoin;

      // Se o jogador optou por criar um personagem rápido direto no modal
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

  // Confirma a entrada via Código
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

  // Filtra personagens livres do cofre compatíveis com o convite selecionado
  const compatibleCharactersForInvite = selectedInviteToAccept
    ? characters.filter(
        (c) => !c.campaign && c.system === selectedInviteToAccept.campaign.system
      )
    : [];

  const availableVaultCharacters = characters.filter((c) => !c.campaign);

  return (
    <div className="flex flex-col gap-6">
      {/* ASSISTENTE GUIADO DE CRIAÇÃO DE PERSONAGEM */}
      {isCreatingChar && (
        <CharacterWizardModal
          lockedSystem={wizardLockedSystem}
          onClose={() => {
            setIsCreatingChar(false);
            setWizardLockedSystem(undefined);
          }}
          onCreated={async (created) => {
            setIsCreatingChar(false);
            setWizardLockedSystem(undefined);
            await loadDashboardData();
            setSelectedCharIdForJoin(created.id);
            setQuickCharName('');
          }}
        />
      )}

      {/* MODAL 1: ACEITAR CONVITE E VINCULAR FICHA */}
      {selectedInviteToAccept && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmAcceptInvite}
            className="bg-zinc-900 border border-amber-500/60 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                  Convite de {selectedInviteToAccept.campaign.dm.username}
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  Entrar em: {selectedInviteToAccept.campaign.name}
                </h3>
                <span className="text-xs text-zinc-400">
                  Sistema exigido: <strong>{selectedInviteToAccept.campaign.system.toUpperCase()}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInviteToAccept(null)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {compatibleCharactersForInvite.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Opção A: Escolher um personagem livre do seu Cofre
                </label>
                <select
                  value={selectedCharIdForJoin}
                  onChange={(e) => {
                    setSelectedCharIdForJoin(e.target.value);
                    if (e.target.value) setQuickCharName('');
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="">-- Selecionar ficha existente --</option>
                  {compatibleCharactersForInvite.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.system})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                {compatibleCharactersForInvite.length > 0
                  ? 'Opção B: Ou criar um novo personagem agora'
                  : 'Crie seu personagem para esta aventura:'}
              </label>
              <button
                type="button"
                onClick={() => {
                  setWizardLockedSystem(selectedInviteToAccept.campaign.system);
                  setIsCreatingChar(true);
                }}
                className="w-full py-2.5 mb-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 rounded-lg text-xs font-black text-amber-300 transition cursor-pointer"
              >
                ✨ Criar Personagem Completo no Assistente Guiado ({selectedInviteToAccept.campaign.system.toUpperCase()})
              </button>
              <input
                type="text"
                value={quickCharName}
                onChange={(e) => {
                  setQuickCharName(e.target.value);
                  if (e.target.value) setSelectedCharIdForJoin('');
                }}
                placeholder="Ou digite apenas o nome para criação rápida..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInviteToAccept(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Vincular Ficha e Entrar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: ENTRAR POR CÓDIGO DE CONVITE */}
      {isJoinByCodeModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmJoinByCode}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-amber-500">🔑 Entrar com Código de Mesa</h3>
              <button
                type="button"
                onClick={() => setIsJoinByCodeModalOpen(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Código da Aventura (Fornecido pelo Mestre)</label>
              <input
                type="text"
                required
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                placeholder="Ex: TR-8F2A"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono uppercase text-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">Personagem do seu Cofre</label>
              {availableVaultCharacters.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-red-400 bg-red-950/30 border border-red-800/50 p-2.5 rounded-lg">
                    Você ainda não tem personagens livres no Cofre.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardLockedSystem(undefined);
                      setIsCreatingChar(true);
                    }}
                    className="w-full py-2.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 rounded-lg text-xs font-black text-amber-300 transition cursor-pointer"
                  >
                    ✨ Criar Novo Personagem no Assistente Guiado
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    required
                    value={selectedCharIdForJoin}
                    onChange={(e) => setSelectedCharIdForJoin(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    <option value="">-- Escolha qual ficha levar para a mesa --</option>
                    {availableVaultCharacters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.system.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardLockedSystem(undefined);
                      setIsCreatingChar(true);
                    }}
                    className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-xs font-bold text-amber-300 transition cursor-pointer"
                  >
                    + Ou criar novo personagem no Assistente Guiado
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsJoinByCodeModalOpen(false)}
                className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={availableVaultCharacters.length === 0}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Entrar na Aventura
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Navegador de Abas Principal */}
      <div className="flex flex-wrap border-b border-zinc-800 gap-4">
        <button
          onClick={() => setActiveTab('player')}
          className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 ${
            activeTab === 'player'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          🛡️ Aba do Jogador
        </button>

        <button
          onClick={() => setActiveTab('characters')}
          className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 ${
            activeTab === 'characters'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          📜 Meus Personagens (Cofre)
        </button>

        <button
          onClick={() => setActiveTab('dm')}
          className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 ${
            activeTab === 'dm'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          👑 Mestre (DM)
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`pb-3 text-sm font-semibold transition cursor-pointer border-b-2 ${
            activeTab === 'admin'
              ? 'border-amber-500 text-amber-500'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          ⚙️ Painel Admin (Compêndio)
        </button>
      </div>

      {isLoading && <p className="text-sm text-zinc-500">Carregando dados da mesa...</p>}

      {/* ABA: JOGADOR */}
      {activeTab === 'player' && (
        <div className="flex flex-col gap-6">
          {invites.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-800/60 p-4 rounded-xl">
              <h3 className="text-amber-400 font-bold text-sm mb-2">✉️ Convites para Novas Aventuras:</h3>
              <div className="flex flex-col gap-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex justify-between items-center gap-2"
                  >
                    <div>
                      <p className="font-semibold text-white">{inv.campaign.name}</p>
                      <p className="text-xs text-zinc-400">
                        Mestre: <span className="text-amber-400 font-medium">{inv.campaign.dm.username}</span> | Sistema:{' '}
                        {inv.campaign.system.toUpperCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCharIdForJoin('');
                          setQuickCharName('');
                          setSelectedInviteToAccept(inv);
                        }}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                      >
                        Aceitar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineInvite(inv.id)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-300 border border-zinc-700 rounded-lg text-xs font-semibold cursor-pointer transition"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-zinc-200">Minhas Aventuras Ativas</h2>
              <button
                type="button"
                onClick={() => {
                  setInviteCodeInput('');
                  setSelectedCharIdForJoin('');
                  setIsJoinByCodeModalOpen(true);
                }}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-zinc-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                🔑 Entrar com Código
              </button>
            </div>

            {playerCampaigns.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-8 rounded-xl text-center">
                <p className="text-zinc-400 text-sm">Você ainda não está jogando em nenhuma aventura.</p>
                <p className="text-zinc-500 text-xs mt-1">
                  Use o botão &quot;🔑 Entrar com Código&quot; acima ou aceite um convite enviado pelo seu Mestre!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerCampaigns.map((camp) => {
                  const myCharInCampaign = camp.characters?.[0];

                  return (
                    <div
                      key={camp.id}
                      className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg text-white">{camp.name}</h3>
                          <span className="text-xs bg-zinc-800 text-amber-400 px-2.5 py-1 rounded-full uppercase font-mono">
                            {camp.system}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">Mestre: {camp.dm?.username}</p>
                        {myCharInCampaign && (
                          <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 p-3 rounded-xl mt-3">
                            {myCharInCampaign.portraitUrl ? (
                              <img
                                src={myCharInCampaign.portraitUrl}
                                alt={myCharInCampaign.name}
                                className="w-16 h-16 rounded-xl object-cover border-2 border-emerald-500/70 shadow-md shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 rounded-xl bg-zinc-900 border-2 border-emerald-500/40 flex items-center justify-center text-lg font-extrabold text-emerald-400 shrink-0">
                                {myCharInCampaign.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className="text-[10px] font-mono uppercase text-zinc-500 block font-bold">
                                Seu Personagem na Mesa
                              </span>
                              <p className="text-sm text-emerald-400 font-extrabold">
                                🛡️ {myCharInCampaign.name}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        {myCharInCampaign && (
                          <button
                            type="button"
                            onClick={() => onOpenCharacter(myCharInCampaign.id, camp.id)}
                            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition cursor-pointer shadow"
                          >
                            🎲 Entrar na Mesa (Abrir Ficha)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: MEUS PERSONAGENS */}
      {activeTab === 'characters' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-zinc-200">Cofre de Personagens</h2>
              <p className="text-zinc-400 text-xs">
                Fichas criadas por você que podem ser usadas em qualquer campanha do mesmo sistema.
              </p>
            </div>
            <button
              onClick={() => {
                setWizardLockedSystem(undefined);
                setIsCreatingChar(true);
              }}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-lg"
            >
              ✨ + Novo Personagem (Assistente Guiado)
            </button>
          </div>

          {characters.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-8 rounded-xl text-center">
              <p className="text-zinc-400 text-sm">Seu cofre está vazio.</p>
              <p className="text-zinc-500 text-xs mt-1">
                Crie personagens com antecedência para vinculá-los às mesas rapidamente.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    {char.portraitUrl ? (
                      <img
                        src={char.portraitUrl}
                        alt={char.name}
                        className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-500/70 shadow-lg shrink-0 bg-zinc-950"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-2xl bg-zinc-950 border-2 border-amber-500/40 flex items-center justify-center text-2xl font-extrabold text-amber-400 shrink-0">
                        {char.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-white truncate" title={char.name}>
                        {char.name}
                      </h3>
                      {char.campaign && (
                        <p className="text-xs text-emerald-400 font-medium mt-1.5 truncate">
                          Vinculado a: {char.campaign.name}
                        </p>
                      )}
                      <div className="mt-1.5">
                        <span className="inline-block text-[10px] bg-zinc-800 text-amber-400 border border-zinc-700/80 px-2 py-0.5 rounded font-mono uppercase">
                          {char.system}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => onOpenCharacter(char.id, char.campaign?.id)}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-amber-600 text-zinc-200 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        📜 Abrir Ficha Completa
                      </button>

                      {char.campaign && (
                        <button
                          type="button"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Retirar "${char.name}" da campanha atual e devolvê-lo ao Cofre livre?`
                              )
                            )
                              return;
                            try {
                              await removeCharacterFromCampaign(char.campaign!.id, char.id);
                              loadDashboardData();
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }}
                          className="px-2.5 py-2 bg-zinc-950 hover:bg-amber-950 text-zinc-400 hover:text-amber-300 border border-zinc-800 rounded-lg text-xs font-bold transition cursor-pointer"
                          title="Sair da Campanha e voltar para o Cofre"
                        >
                          🚪
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Tem certeza que deseja excluir permanentemente a ficha de "${char.name}"?`
                            )
                          )
                            return;
                          try {
                            await deleteCharacter(char.id);
                            loadDashboardData();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
                        className="px-3 py-2 bg-zinc-950 hover:bg-red-950 text-zinc-500 hover:text-red-400 border border-zinc-800 rounded-lg text-xs font-bold transition cursor-pointer"
                        title="Excluir Personagem Permanentemente"
                      >
                        🗑️
                      </button>
                    </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: MESTRE (DM) */}
      {activeTab === 'dm' && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-zinc-200">Campanhas que você Mestra</h2>
              <p className="text-zinc-400 text-xs">
                Crie e gerencie mesas, envie convites e controle as travas de ficha dos jogadores.
              </p>
            </div>
            <button
              onClick={() => setIsCreatingCampaign(!isCreatingCampaign)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              {isCreatingCampaign ? 'Cancelar' : '+ Nova Aventura'}
            </button>
          </div>

          {isCreatingCampaign && (
            <form
              onSubmit={handleCreateCampaign}
              className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4"
            >
              <h3 className="font-bold text-amber-500 text-sm">Configurar Nova Aventura</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nome da Campanha</label>
                  <input
                    type="text"
                    required
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="Ex: O Segredo na Floresta, Coração de Rubi..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Sistema da Mesa</label>
                  <select
                    value={newCampaignSystem}
                    onChange={(e) => setNewCampaignSystem(e.target.value as SystemId)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="ordem-paranormal">Ordem Paranormal</option>
                    <option value="tormenta20">Tormenta 20</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Descrição Breve (Opcional)</label>
                <input
                  type="text"
                  value={newCampaignDesc}
                  onChange={(e) => setNewCampaignDesc(e.target.value)}
                  placeholder="Ex: Campanha de mistério e investigação"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                className="self-end px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Criar Mesa de Mestre
              </button>
            </form>
          )}

          {dmCampaigns.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-8 rounded-xl text-center">
              <p className="text-zinc-400 text-sm">Você ainda não criou nenhuma aventura como Mestre.</p>
              <p className="text-zinc-500 text-xs mt-1">Clique no botão acima para criar sua primeira mesa!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dmCampaigns.map((camp) => (
                <div
                  key={camp.id}
                  className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-white">{camp.name}</h3>
                      <span className="text-xs bg-amber-950/60 border border-amber-800 text-amber-400 px-2.5 py-1 rounded-full uppercase font-mono">
                        {camp.system}
                      </span>
                    </div>
                    {camp.description && <p className="text-xs text-zinc-400 mt-2">{camp.description}</p>}
                    <div className="flex items-center justify-between mt-3 bg-zinc-950 px-3 py-2 rounded-lg border border-zinc-800">
                      <span className="text-xs font-mono text-zinc-400">
                        Código: <strong className="text-amber-500">{camp.inviteCode}</strong>
                      </span>
                      <span className="text-xs text-zinc-400">
                        Jogadores na mesa: <strong className="text-white">{camp.characters?.length || 0}</strong>
                      </span>
                    </div>
                  </div>

                  {invitingCampaignId === camp.id ? (
                    <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex flex-col gap-2">
                      <label className="text-xs text-zinc-400">Nome de usuário do jogador:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={targetUsername}
                          onChange={(e) => setTargetUsername(e.target.value)}
                          placeholder="Ex: jogador_1"
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-xs text-white"
                        />
                        <button
                          onClick={() => handleSendInvite(camp.id)}
                          className="px-3 py-1 bg-amber-600 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Enviar
                        </button>
                        <button
                          onClick={() => setInvitingCampaignId(null)}
                          className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs cursor-pointer"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => onEnterSession(camp.id, 'dm')}
                      className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Abrir Escudo do Mestre
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !window.confirm(
                            `Tem certeza que deseja excluir a campanha "${camp.name}"? Todos os personagens vinculados voltarão intactos para o Cofre dos jogadores.`
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
                      className="px-3 py-2 bg-zinc-950 hover:bg-red-950 text-zinc-500 hover:text-red-400 border border-zinc-800 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="Excluir Campanha"
                    >
                      🗑️
                    </button>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: ADMIN */}
      {activeTab === 'admin' && <AdminPanel />}
    </div>
  );
}