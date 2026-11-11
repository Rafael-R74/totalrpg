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
  sendCampaignInvite
} from '../services/api';
import { AdminPanel } from './AdminPanel';

interface DashboardProps {
  currentUser: { id: string; username: string; email: string };
  onEnterSession: (campaignId: string, role: 'dm' | 'player') => void;
  onOpenCharacter: (characterId: string) => void;
}

export function Dashboard({ currentUser, onEnterSession, onOpenCharacter }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'player' | 'characters' | 'dm' | 'admin'>('player');

  const [dmCampaigns, setDmCampaigns] = useState<CampaignData[]>([]);
  const [playerCampaigns, setPlayerCampaigns] = useState<CampaignData[]>([]);
  const [invites, setInvites] = useState<InviteData[]>([]);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');
  const [newCampaignSystem, setNewCampaignSystem] = useState<SystemId>('ordem-paranormal');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  const [newCharName, setNewCharName] = useState('');
  const [newCharSystem, setNewCharSystem] = useState<SystemId>('ordem-paranormal');
  const [isCreatingChar, setIsCreatingChar] = useState(false);

  const [invitingCampaignId, setInvitingCampaignId] = useState<string | null>(null);
  const [targetUsername, setTargetUsername] = useState('');

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      if (activeTab === 'player') {
        const [camp, inv] = await Promise.all([fetchPlayerCampaigns(), fetchPlayerInvites()]);
        setPlayerCampaigns(camp);
        setInvites(inv);
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
    loadDashboardData();
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
      await createCharacter(newCharName, newCharSystem);
      setNewCharName('');
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

  return (
    <div className="flex flex-col gap-6">
      {/* Navegador de Abas */}
      <div className="flex border-b border-zinc-800 gap-4">
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
                  <div key={inv.id} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{inv.campaign.name}</p>
                      <p className="text-xs text-zinc-400">
                        Mestre: <span className="text-amber-400 font-medium">{inv.campaign.dm.username}</span> | Sistema: {inv.campaign.system.toUpperCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => alert('Na Fase 4 faremos o modal de aceitar convite vinculando uma ficha!')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                    >
                      Aceitar Aventura
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-zinc-200 mb-3">Minhas Aventuras Ativas</h2>
            {playerCampaigns.length === 0 ? (
              <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-8 rounded-xl text-center">
                <p className="text-zinc-400 text-sm">Você ainda não está jogando em nenhuma aventura.</p>
                <p className="text-zinc-500 text-xs mt-1">Peça o convite para o seu Mestre ou crie sua própria aventura na aba DM!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {playerCampaigns.map((camp) => (
                  <div key={camp.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-lg text-white">{camp.name}</h3>
                        <span className="text-xs bg-zinc-800 text-amber-400 px-2.5 py-1 rounded-full uppercase font-mono">
                          {camp.system}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">Mestre: {camp.dm?.username}</p>
                    </div>
                    <button
                      onClick={() => onEnterSession(camp.id, 'player')}
                      className="w-full py-2 bg-zinc-800 hover:bg-amber-600 hover:text-white text-zinc-300 font-bold text-sm rounded-lg transition cursor-pointer"
                    >
                      Entrar na Mesa como Jogador
                    </button>
                  </div>
                ))}
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
              <p className="text-zinc-400 text-xs">Fichas criadas por você que podem ser usadas em qualquer campanha do mesmo sistema.</p>
            </div>
            <button
              onClick={() => setIsCreatingChar(!isCreatingChar)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              {isCreatingChar ? 'Cancelar' : '+ Novo Personagem'}
            </button>
          </div>

          {isCreatingChar && (
            <form onSubmit={handleCreateCharacter} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4">
              <h3 className="font-bold text-amber-500 text-sm">Criar Ficha no Cofre</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nome do Personagem</label>
                  <input
                    type="text"
                    required
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    placeholder="Ex: Arthur Cervero, Klunc..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Sistema de RPG</label>
                  <select
                    value={newCharSystem}
                    onChange={(e) => setNewCharSystem(e.target.value as SystemId)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="ordem-paranormal">Ordem Paranormal</option>
                    <option value="tormenta20">Tormenta 20</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="self-end px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Salvar no Cofre
              </button>
            </form>
          )}

          {characters.length === 0 ? (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 p-8 rounded-xl text-center">
              <p className="text-zinc-400 text-sm">Seu cofre está vazio.</p>
              <p className="text-zinc-500 text-xs mt-1">Crie personagens com antecedência para vinculá-los às mesas rapidamente.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {characters.map((char) => (
                <div key={char.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white">{char.name}</h3>
                      <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono uppercase">
                        {char.system}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                      {char.campaign ? `Vinculado a: ${char.campaign.name}` : 'Disponível no Cofre'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenCharacter(char.id)}
                    className="w-full py-1.5 bg-zinc-800 hover:bg-amber-600 hover:text-white text-zinc-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Abrir Ficha Completa
                  </button>
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
              <p className="text-zinc-400 text-xs">Crie e gerencie mesas, envie convites e controle as travas de ficha dos jogadores.</p>
            </div>
            <button
              onClick={() => setIsCreatingCampaign(!isCreatingCampaign)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              {isCreatingCampaign ? 'Cancelar' : '+ Nova Aventura'}
            </button>
          </div>

          {isCreatingCampaign && (
            <form onSubmit={handleCreateCampaign} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col gap-4">
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
                <div key={camp.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-lg text-white">{camp.name}</h3>
                      <span className="text-xs bg-amber-950/60 border border-amber-800 text-amber-400 px-2.5 py-1 rounded-full uppercase font-mono">
                        {camp.system}
                      </span>
                    </div>
                    {camp.description && <p className="text-xs text-zinc-400 mt-2">{camp.description}</p>}
                    <p className="text-xs font-mono text-zinc-500 mt-2">
                      Código de Convite: <span className="text-amber-500 font-bold">{camp.inviteCode}</span>
                    </p>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEnterSession(camp.id, 'dm')}
                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-lg transition cursor-pointer"
                      >
                        Abrir Escudo do Mestre
                      </button>
                      <button
                        onClick={() => setInvitingCampaignId(camp.id)}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                        title="Convidar jogador pelo username"
                      >
                        ✉️ Convidar
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* ABA: ADMIN (COMPÊNDIO & REGRAS) */}
      {activeTab === 'admin' && <AdminPanel />}
    </div>
  );
}