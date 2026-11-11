import { useState, useEffect } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { AuthResponse } from './services/api';
import { io, Socket } from 'socket.io-client';
import {
  SystemId,
  VitalBar,
  DiceRollResult,
  ServerToClientEvents,
  ClientToServerEvents
} from '@totalrpg/shared';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3333');

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; email: string } | null>(() => {
    const saved = localStorage.getItem('totalrpg_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Estado que define se estamos navegando pelo Dashboard ou dentro de uma Mesa
  const [currentCampaignSession, setCurrentCampaignSession] = useState<{
    campaignId: string;
    role: 'dm' | 'player';
  } | null>(null);

  // Estados da sessão ativa em tempo real
  const [selectedSystem, setSelectedSystem] = useState<SystemId>('ordem-paranormal');
  const [rollHistory, setRollHistory] = useState<DiceRollResult[]>([]);
  const [hp, setHp] = useState<VitalBar>({
    id: 'pv',
    label: 'Pontos de Vida',
    current: 32,
    max: 40,
    color: '#dc2626'
  });

  useEffect(() => {
    if (!currentUser || !currentCampaignSession) return;

    // Conecta na sala da aventura escolhida no Dashboard
    socket.emit('session:join', {
      campaignId: currentCampaignSession.campaignId,
      role: currentCampaignSession.role
    });

    socket.on('vital:updated', (updatedBar) => setHp(updatedBar));
    socket.on('dice:rolled', (newRoll) => setRollHistory((prev) => [newRoll, ...prev]));

    return () => {
      socket.off('vital:updated');
      socket.off('dice:rolled');
    };
  }, [currentUser, currentCampaignSession]);

  function handleLogout() {
    localStorage.removeItem('totalrpg_token');
    localStorage.removeItem('totalrpg_user');
    setCurrentUser(null);
    setCurrentCampaignSession(null);
  }

  function rollDice(label: string, count: number, sides: number, modifier: number) {
    if (!currentCampaignSession) return;
    socket.emit('dice:roll', {
      campaignId: currentCampaignSession.campaignId,
      characterName: currentUser?.username || 'Anônimo',
      label,
      count,
      sides,
      modifier,
      system: selectedSystem
    });
  }

  function updateHp(newCurrent: number) {
    if (!currentCampaignSession) return;
    const clampedValue = Math.max(0, Math.min(hp.max, newCurrent));
    const updatedBar: VitalBar = { ...hp, current: clampedValue };
    setHp(updatedBar);
    socket.emit('vital:change', { campaignId: currentCampaignSession.campaignId, bar: updatedBar });
  }

  // 1. Se não estiver logado, exibe a tela de login/cadastro
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(authData: AuthResponse) => setCurrentUser(authData.user)} />;
  }

  const hpPercent = Math.max(0, Math.min(100, (hp.current / hp.max) * 100));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Barra de Topo Global */}
      <header className="border-b border-zinc-800 pb-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-extrabold text-amber-500 tracking-wider">🎲 TotalRPG</h1>
          {currentCampaignSession && (
            <button
              onClick={() => setCurrentCampaignSession(null)}
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

      {/* 2. Se não houver mesa aberta, exibe o Dashboard */}
      {!currentCampaignSession ? (
        <Dashboard
          currentUser={currentUser}
          onEnterSession={(campaignId, role) => setCurrentCampaignSession({ campaignId, role })}
        />
      ) : (
        /* 3. Se houver mesa aberta, exibe a sessão em tempo real */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-zinc-400">Papel na Mesa:</span>
                <span className="text-xs font-mono font-bold uppercase text-amber-500">
                  {currentCampaignSession.role === 'dm' ? '👑 Mestre' : '🛡️ Jogador'}
                </span>
              </div>
              <div className="flex gap-2">
                {(['ordem-paranormal', 'tormenta20', 'duna'] as SystemId[]).map((sys) => (
                  <button
                    key={sys}
                    onClick={() => setSelectedSystem(sys)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      selectedSystem === sys ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {sys.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{hp.label}</span>
                <span className="font-mono text-lg">{hp.current} / {hp.max}</span>
              </div>
              <div className="w-full h-5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                <div
                  className="h-full transition-all duration-300"
                  style={{ width: `${hpPercent}%`, backgroundColor: hp.color }}
                />
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => updateHp(hp.current - 5)}
                  className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg text-sm cursor-pointer"
                >
                  Dano (-5)
                </button>
                <button
                  onClick={() => updateHp(hp.current + 5)}
                  className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded-lg text-sm cursor-pointer"
                >
                  Curar (+5)
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col gap-3">
              <h2 className="font-semibold text-zinc-200">⚔️ Testar Rolagem com seu Usuário</h2>
              <button
                onClick={() => rollDice('Ataque com Katana (3d20+10)', 3, 20, 10)}
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex justify-between items-center cursor-pointer transition"
              >
                <span>Katana (Acerto)</span>
                <span className="text-xs font-mono text-amber-400">3d20 + 10</span>
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col h-[420px]">
            <h2 className="font-semibold text-zinc-200 mb-4">🎲 Últimas Rolagens da Mesa</h2>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
              {rollHistory.length === 0 ? (
                <p className="text-zinc-500 text-sm text-center my-auto">
                  Nenhuma rolagem feita ainda.
                </p>
              ) : (
                rollHistory.map((roll) => (
                  <div
                    key={roll.id}
                    className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-amber-500 text-sm">{roll.characterName}</span>
                        <span className="text-xs text-zinc-500">{roll.timestamp}</span>
                      </div>
                      <p className="text-xs text-zinc-300">{roll.label}</p>
                      <p className="text-xs font-mono text-zinc-500 mt-1">
                        Dados: [{roll.rolls.join(', ')}] ({roll.system})
                      </p>
                    </div>
                    <div className="text-2xl font-bold font-mono text-white bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-700">
                      {roll.total}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}