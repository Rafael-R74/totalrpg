import { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { SheetContainer } from './components/sheets/SheetContainer';
import { DMScreen } from './components/DMScreen';
import { DiceRollModal } from './components/DiceRollModal';
import { AuthResponse } from './services/api';
import { io, Socket } from 'socket.io-client';
import {
  SystemId,
  DiceRollResult,
  SheetPermissions,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@totalrpg/shared';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3333');

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; email: string } | null>(() => {
    const saved = localStorage.getItem('totalrpg_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Guarda sessão ativa do Escudo do Mestre
  const [currentCampaignSession, setCurrentCampaignSession] = useState<{
    campaignId: string;
    role: 'dm' | 'player';
  } | null>(null);

  // Guarda qual personagem está aberto na tela (pelo Jogador ou Inspecionado pelo Mestre)
  const [openedCharacter, setOpenedCharacter] = useState<{
    characterId: string;
    campaignId?: string;
  } | null>(null);

  const [rollHistory, setRollHistory] = useState<DiceRollResult[]>([]);
  const [activeRollModal, setActiveRollModal] = useState<DiceRollResult | null>(null);

  // Estados de sincronização em tempo real (Socket.io -> Componentes)
  const [livePermissions, setLivePermissions] = useState<SheetPermissions | null>(null);
  const [lastUpdatedCharSignal, setLastUpdatedCharSignal] = useState<{
    characterId: string;
    timestamp: number;
  } | null>(null);

  const activeRoomId =
    currentCampaignSession?.campaignId ||
    openedCharacter?.campaignId ||
    (currentUser ? `vault-${currentUser.id}` : '');

  useEffect(() => {
    if (!currentUser || !activeRoomId) return;

    socket.emit('session:join', {
      campaignId: activeRoomId,
      role: currentCampaignSession?.role || 'player',
    });

    socket.on('dice:rolled', (newRoll) => {
      setRollHistory((prev) => [newRoll, ...prev]);

      // Abre o modal de dados animados para quem fez a rolagem (ou para o Mestre quando ele rola)
      if (openedCharacter || newRoll.characterName === '👑 Mestre') {
        setActiveRollModal(newRoll);
      }
    });

    socket.on('campaign:permissionsUpdated', (perms) => {
      setLivePermissions(perms);
    });

    socket.on('character:updated', ({ characterId }) => {
      setLastUpdatedCharSignal({ characterId, timestamp: Date.now() });
    });

    return () => {
      socket.off('dice:rolled');
      socket.off('campaign:permissionsUpdated');
      socket.off('character:updated');
    };
  }, [currentUser, activeRoomId, currentCampaignSession, openedCharacter]);

  function handleLogout() {
    localStorage.removeItem('totalrpg_token');
    localStorage.removeItem('totalrpg_user');
    setCurrentUser(null);
    setCurrentCampaignSession(null);
    setOpenedCharacter(null);
  }

  function triggerRoll(
    characterName: string,
    system: SystemId,
    label: string,
    count: number,
    sides: number,
    modifier: number,
    isSecret?: boolean
  ) {
    if (!activeRoomId) return;
    socket.emit('dice:roll', {
      campaignId: activeRoomId,
      characterName,
      label,
      count,
      sides,
      modifier,
      system,
      isSecret,
    });
  }

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(authData: AuthResponse) => setCurrentUser(authData.user)} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <DiceRollModal
        roll={activeRollModal}
        onClose={() => setActiveRollModal(null)}
      />

      {/* Barra de Topo Global */}
      <header className="border-b border-zinc-800 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold text-amber-500 tracking-wider">🎲 TotalRPG</h1>
          {(currentCampaignSession || openedCharacter) && (
            <button
              onClick={() => {
                // Se o Mestre estava inspecionando a ficha de um jogador, o botão do topo volta ao Dashboard ou ao Escudo
                setOpenedCharacter(null);
                setCurrentCampaignSession(null);
              }}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition cursor-pointer"
            >
              ← Voltar ao Dashboard
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
          <div className="text-right">
            <span className="block text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Conta</span>
            <span className="text-sm font-bold text-amber-400">{currentUser.username}</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-red-950 hover:text-red-300 text-zinc-400 rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Sair
          </button>
        </div>
      </header>

      {/* VISÃO 1: Ficha Completa Aberta (Pelo Jogador ou Inspecionada pelo Mestre) */}
      {openedCharacter ? (
        <SheetContainer
          characterId={openedCharacter.characterId}
          currentUserId={currentUser.id}
          onBack={() => setOpenedCharacter(null)}
          onRollDice={triggerRoll}
          externalPermissions={livePermissions}
          externalReloadSignal={lastUpdatedCharSignal}
          onCharacterSaved={(charId, campId) => {
            const room = campId || openedCharacter.campaignId;
            if (room) {
              socket.emit('character:sync', { campaignId: room, characterId: charId });
            }
          }}
        />
      ) : currentCampaignSession ? (
        /* VISÃO 2: Escudo do Mestre em Tempo Real */
        <DMScreen
          campaignId={currentCampaignSession.campaignId}
          rollHistory={rollHistory}
          onClearRolls={() => setRollHistory([])}
          onInspectCharacter={(charId) =>
            setOpenedCharacter({
              characterId: charId,
              campaignId: currentCampaignSession.campaignId,
            })
          }
          onRollDice={triggerRoll}
          onBroadcastPermissions={(permissions) =>
            socket.emit('campaign:syncPermissions', {
              campaignId: currentCampaignSession.campaignId,
              permissions,
            })
          }
          onBroadcastCharacterSync={(characterId) =>
            socket.emit('character:sync', {
              campaignId: currentCampaignSession.campaignId,
              characterId,
            })
          }
          lastUpdatedCharSignal={lastUpdatedCharSignal}
        />
      ) : (
        /* VISÃO 3: Dashboard Principal */
        <Dashboard
          currentUser={currentUser}
          onEnterSession={(campaignId, role) => {
            setRollHistory([]);
            setCurrentCampaignSession({ campaignId, role });
          }}
          onOpenCharacter={(characterId, campaignId) =>
            setOpenedCharacter({ characterId, campaignId })
          }
        />
      )}
    </div>
  );
}