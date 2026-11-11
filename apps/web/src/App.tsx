import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  SystemId,
  VitalBar,
  DiceRollResult,
  ServerToClientEvents,
  ClientToServerEvents
} from '@totalrpg/shared';

// Conectamos ao nosso servidor Node na porta 3333
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3333');

// ID fixo de uma aventura de teste (na próxima etapa virá do Banco de Dados!)
const TEST_CAMPAIGN_ID = 'aventura-teste-01';

export default function App() {
  const [selectedSystem, setSelectedSystem] = useState<SystemId>('ordem-paranormal');
  const [characterName, setCharacterName] = useState('Arthur Cervero');
  const [rollHistory, setRollHistory] = useState<DiceRollResult[]>([]);

  const [hp, setHp] = useState<VitalBar>({
    id: 'pv',
    label: 'Pontos de Vida',
    current: 32,
    max: 40,
    color: '#dc2626'
  });

  // useEffect: Roda 1 única vez quando a tela abre
  useEffect(() => {
    // 1. Avisa o servidor que entramos na aventura de teste
    socket.emit('session:join', { campaignId: TEST_CAMPAIGN_ID, role: 'player' });

    // 2. Fica ouvindo quando alguém (você ou o Mestre em outra aba) muda a vida
    socket.on('vital:updated', (updatedBar) => {
      setHp(updatedBar);
    });

    // 3. Fica ouvindo quando alguém na mesa rola um dado
    socket.on('dice:rolled', (newRoll) => {
      // Coloca a rolagem nova no topo da lista de histórico
      setRollHistory((prev) => [newRoll, ...prev]);
    });

    // Limpa os ouvintes se a página for fechada
    return () => {
      socket.off('vital:updated');
      socket.off('dice:rolled');
    };
  }, []);

  // Função que altera a vida E avisa o servidor para atualizar todo mundo!
  function updateHp(newCurrent: number) {
    const clampedValue = Math.max(0, Math.min(hp.max, newCurrent));
    const updatedBar: VitalBar = { ...hp, current: clampedValue };
    setHp(updatedBar);
    socket.emit('vital:change', { campaignId: TEST_CAMPAIGN_ID, bar: updatedBar });
  }

  // Função para disparar uma rolagem de ataque/teste
  function rollDice(label: string, count: number, sides: number, modifier: number) {
    socket.emit('dice:roll', {
      campaignId: TEST_CAMPAIGN_ID,
      characterName,
      label,
      count,
      sides,
      modifier,
      system: selectedSystem
    });
  }

  const hpPercent = Math.max(0, Math.min(100, (hp.current / hp.max) * 100));

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto flex flex-col gap-6">
      <header className="border-b border-zinc-800 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-amber-500">🎲 TotalRPG</h1>
          <p className="text-zinc-400 text-sm">Teste Realtime (Abra em 2 abas lado a lado!)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">Personagem:</span>
          <input
            type="text"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COLUNA ESQUERDA: Controles da Ficha */}
        <div className="flex flex-col gap-6">
          {/* Seletor de Sistema */}
          <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
            <label className="block text-sm text-zinc-400 mb-2">Sistema da Rolagem:</label>
            <div className="flex gap-2">
              {(['ordem-paranormal', 'tormenta20', 'duna'] as SystemId[]).map((sys) => (
                <button
                  key={sys}
                  onClick={() => setSelectedSystem(sys)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    selectedSystem === sys
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {sys.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Barra Vital Sincronizada */}
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

          {/* Botões de Ataques Preparados (Teste) */}
          <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col gap-3">
            <h2 className="font-semibold text-zinc-200">⚔️ Ataques Rápidos</h2>
            <button
              onClick={() => rollDice('Ataque com Katana (3d20+10)', 3, 20, 10)}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex justify-between items-center cursor-pointer transition"
            >
              <span>Katana (Acerto)</span>
              <span className="text-xs font-mono text-amber-400">3d20 + 10</span>
            </button>
            <button
              onClick={() => rollDice('Dano da Katana (2d10+5)', 2, 10, 5)}
              className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex justify-between items-center cursor-pointer transition"
            >
              <span>Katana (Dano)</span>
              <span className="text-xs font-mono text-red-400">2d10 + 5</span>
            </button>
          </div>
        </div>

        {/* COLUNA DIREITA: Visualizador Global de Últimas Rolagens */}
        <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col h-[420px]">
          <h2 className="font-semibold text-zinc-200 mb-4">🎲 Últimas Rolagens da Mesa</h2>
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1">
            {rollHistory.length === 0 ? (
              <p className="text-zinc-500 text-sm text-center my-auto">
                Nenhuma rolagem feita ainda. Clique em um ataque ao lado!
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
    </div>
  );
}