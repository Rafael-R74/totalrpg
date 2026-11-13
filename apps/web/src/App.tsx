import { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { SheetContainer } from './components/sheets/SheetContainer';
import { DMScreen } from './components/DMScreen';
import { DiceRollModal } from './components/DiceRollModal';
import { LootReceivedModal } from './components/LootReceivedModal';
import { FloatingPostItsLayer } from './components/dm/NotesAndPostItsManager';
import { AuthResponse } from './services/api';
import { io, Socket } from 'socket.io-client';
import { SecondMonitorScreen } from './components/SecondMonitorScreen';
import {
  SystemId,
  DiceRollResult,
  SheetPermissions,
  StickyPostIt,
  RPGItem,
  PreparedAttack,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@totalrpg/shared';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3333');

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; email: string } | null>(() => {
    const saved = localStorage.getItem('totalrpg_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [currentCampaignSession, setCurrentCampaignSession] = useState<{
    campaignId: string;
    role: 'dm' | 'player';
  } | null>(null);

  const [openedCharacter, setOpenedCharacter] = useState<{
    characterId: string;
    campaignId?: string;
  } | null>(null);

  const [rollHistory, setRollHistory] = useState<DiceRollResult[]>([]);
  const [activeRollModal, setActiveRollModal] = useState<DiceRollResult | null>(null);

  const [receivedLootModal, setReceivedLootModal] = useState<{
    item: RPGItem;
    attack?: PreparedAttack;
  } | null>(null);

  const [receivedPlayerPostIts, setReceivedPlayerPostIts] = useState<StickyPostIt[]>([]);
  const [dismissedPostItSignal, setDismissedPostItSignal] = useState<{
    postItId: string;
    characterId: string;
    timestamp: number;
  } | null>(null);

  const [livePermissions, setLivePermissions] = useState<SheetPermissions | null>(null);
  const [lastUpdatedCharSignal, setLastUpdatedCharSignal] = useState<{
    characterId: string;
    timestamp: number;
  } | null>(null);
  const [initiativeRequestSignal, setInitiativeRequestSignal] = useState<number>(0);
  const [lastInitiativeSubmission, setLastInitiativeSubmission] = useState<{
    characterId: string;
    characterName: string;
    initiative: number;
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

      if (newRoll.rollerUserId === currentUser.id) {
        setActiveRollModal(newRoll);
      }
    });

    socket.on('campaign:permissionsUpdated', (perms) => {
      setLivePermissions(perms);
    });

    socket.on('character:updated', ({ characterId }) => {
      setLastUpdatedCharSignal({ characterId, timestamp: Date.now() });
    });

    socket.on('combat:initiativeRequested', () => {
      setInitiativeRequestSignal(Date.now());
    });

    socket.on('combat:initiativeSubmitted', (payload) => {
      setLastInitiativeSubmission({ ...payload, timestamp: Date.now() });
    });

    // Recebe Post-its compartilhados pelo Mestre, filtra por múltiplos personagens e centraliza na tela do jogador!
    socket.on('postit:received', ({ postIt, action }) => {
      if (action === 'hide') {
        setReceivedPlayerPostIts((prev) => prev.filter((p) => p.id !== postIt.id));
        return;
      }

      const targetIds = Array.isArray(postIt.sharedWithCharacterIds)
        ? postIt.sharedWithCharacterIds
        : [];
      const isTargetedToMe =
        openedCharacter && targetIds.includes(openedCharacter.characterId);

      if (isTargetedToMe) {
        setReceivedPlayerPostIts((prev) => {
          const existing = prev.find((p) => p.id === postIt.id);

          // Se já estava aberto na tela do jogador, preserva a posição X/Y onde o jogador o arrastou!
          if (existing) {
            return prev.map((p) =>
              p.id === postIt.id
                ? { ...postIt, x: existing.x, y: existing.y, isPinned: true }
                : p
            );
          }

          // Se é novo na tela do jogador, calcula o centro exato da janela dele!
          const centeredX = Math.max(20, Math.floor((window.innerWidth - postIt.width) / 2));
          const centeredY = Math.max(20, Math.floor((window.innerHeight - postIt.height) / 2));

          return [
            ...prev,
            {
              ...postIt,
              x: centeredX,
              y: centeredY,
              isPinned: true,
            },
          ];
        });
      } else {
        setReceivedPlayerPostIts((prev) => prev.filter((p) => p.id !== postIt.id));
      }
    });

    socket.on('postit:dismissed', ({ postItId, characterId }) => {
      setDismissedPostItSignal({ postItId, characterId, timestamp: Date.now() });
    });

    socket.on('item:received', ({ targetCharacterId, item, attack }) => {
      if (openedCharacter && openedCharacter.characterId === targetCharacterId) {
        setReceivedLootModal({ item, attack });
      }
    });

    socket.on('scene:ended', () => {
      setLastUpdatedCharSignal({
        characterId: openedCharacter?.characterId || 'ALL',
        timestamp: Date.now(),
      });
    });

    return () => {
      socket.off('dice:rolled');
      socket.off('campaign:permissionsUpdated');
      socket.off('character:updated');
      socket.off('combat:initiativeRequested');
      socket.off('combat:initiativeSubmitted');
      socket.off('postit:received');
      socket.off('postit:dismissed');
      socket.off('item:received');
      socket.off('scene:ended');
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
    isSecret?: boolean,
    isInitiativeRoll?: boolean,
    characterId?: string
  ) {
    if (!activeRoomId || !currentUser) return;
    socket.emit('dice:roll', {
      campaignId: activeRoomId,
      rollerUserId: currentUser.id,
      characterId,
      isInitiativeRoll,
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

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(authData: AuthResponse) => setCurrentUser(authData.user)} />;
  }

  // Se esta janela foi aberta como Tela do 2º Monitor (?monitorCampaignId=...), renderiza em Tela Cheia Limpa!
  const monitorCampaignId = new URLSearchParams(window.location.search).get('monitorCampaignId');
  if (monitorCampaignId) {
    return <SecondMonitorScreen campaignId={monitorCampaignId} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <DiceRollModal
        roll={activeRollModal}
        onClose={() => setActiveRollModal(null)}
        onRerollOne={(rollResult, dieIndex) => {
          if (!activeRoomId) return;
          socket.emit('dice:rerollOne', {
            campaignId: activeRoomId,
            rollResult,
            dieIndex,
          });
        }}
      />

      <LootReceivedModal
        loot={receivedLootModal}
        onClose={() => setReceivedLootModal(null)}
      />

      {/* Camada de Post-its do Jogador: Agora com onUpdatePostIt para o jogador conseguir arrastar! */}
      {openedCharacter && !currentCampaignSession && (
        <FloatingPostItsLayer
          postIts={receivedPlayerPostIts}
          isDMView={false}
          onUpdatePostIt={(updated) => {
            setReceivedPlayerPostIts((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
          }}
          onClosePlayerPostIt={(id) => {
            setReceivedPlayerPostIts((prev) => prev.filter((p) => p.id !== id));
            if (activeRoomId && openedCharacter) {
              socket.emit('postit:dismiss', {
                campaignId: activeRoomId,
                postItId: id,
                characterId: openedCharacter.characterId,
              });
            }
          }}
        />
      )}

      {/* Barra de Topo Global */}
      <header className="border-b border-zinc-800 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold text-amber-500 tracking-wider">🎲 TotalRPG</h1>
          {(currentCampaignSession || openedCharacter) && (
            <button
              onClick={() => {
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

      {/* VISÃO 1: Ficha Completa Aberta */}
      {openedCharacter ? (
        <SheetContainer
          characterId={openedCharacter.characterId}
          currentUserId={currentUser.id}
          onBack={() => setOpenedCharacter(null)}
          onRollDice={triggerRoll}
          externalPermissions={livePermissions}
          externalReloadSignal={lastUpdatedCharSignal}
          initiativeRequestSignal={initiativeRequestSignal}
          onCharacterSaved={(charId, campId) => {
            const room = campId || openedCharacter.campaignId;
            if (room) {
              socket.emit('character:sync', { campaignId: room, characterId: charId });
            }
          }}
          onNotifyItemGiven={(targetCharacterId, item, attack) => {
            const room = openedCharacter.campaignId || activeRoomId;
            if (room) {
              socket.emit('item:giveNotify', {
                campaignId: room,
                targetCharacterId,
                item,
                attack,
              });
            }
          }}
        />
      ) : currentCampaignSession ? (
        /* VISÃO 2: Escudo do Mestre Completo */
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
          onRequestPlayersInitiative={() =>
            socket.emit('combat:requestInitiative', {
              campaignId: currentCampaignSession.campaignId,
            })
          }
          onSharePostIt={(postIt, action) =>
            socket.emit('postit:share', {
              campaignId: currentCampaignSession.campaignId,
              postIt,
              action,
            })
          }
          onNotifyItemGiven={(targetCharacterId, item, attack) =>
            socket.emit('item:giveNotify', {
              campaignId: currentCampaignSession.campaignId,
              targetCharacterId,
              item,
              attack,
            })
          }
          onSyncSecondMonitor={(director, combatState, merchants, postIts) =>
            socket.emit('monitor:sync', {
              campaignId: currentCampaignSession.campaignId,
              director,
              combatState,
              merchants,
              postIts,
            })
          }
          onBroadcastSceneEnd={() =>
            socket.emit('scene:end', {
              campaignId: currentCampaignSession.campaignId,
            })
          }
          lastUpdatedCharSignal={lastUpdatedCharSignal}
          lastInitiativeSubmission={lastInitiativeSubmission}
          dismissedPostItSignal={dismissedPostItSignal}
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