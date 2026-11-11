import { useState } from 'react';
import { SystemId, VitalBar } from '@totalrpg/shared';

export default function App() {
  // 1. Estado para guardar qual sistema de RPG está selecionado na tela
  const [selectedSystem, setSelectedSystem] = useState<SystemId>('ordem-paranormal');

  // 2. Estado para guardar uma Barra de Vida usando o nosso molde VitalBar lá do @totalrpg/shared!
  const [hp, setHp] = useState<VitalBar>({
    id: 'pv',
    label: 'Pontos de Vida',
    current: 32,
    max: 40,
    color: '#dc2626'
  });

  // Conta matemática simples para descobrir a % da barra (entre 0% e 100%)
  const hpPercent = Math.max(0, Math.min(100, (hp.current / hp.max) * 100));

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto flex flex-col gap-6">
      <header className="border-b border-zinc-800 pb-4">
        <h1 className="text-3xl font-bold text-amber-500">🎲 TotalRPG</h1>
        <p className="text-zinc-400 text-sm">Prototipando Estados do React + Pacote Shared</p>
      </header>

      {/* Caixa de Seleção de Sistema */}
      <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
        <label className="block text-sm text-zinc-400 mb-2">Módulo de Sistema Ativo:</label>
        <div className="flex gap-2">
          {(['ordem-paranormal', 'tormenta20', 'duna'] as SystemId[]).map((sys) => (
            <button
              key={sys}
              onClick={() => setSelectedSystem(sys)}
              className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer ${
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

      {/* Protótipo de Barra Vital Interativa */}
      <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold">{hp.label} ({selectedSystem})</span>
          <span className="font-mono text-lg">{hp.current} / {hp.max}</span>
        </div>

        {/* Fundo escuro da Barra */}
        <div className="w-full h-5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
          {/* Preenchimento colorido que cresce/diminui conforme o hpPercent */}
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${hpPercent}%`, backgroundColor: hp.color }}
          />
        </div>

        {/* Botões de Dano e Cura */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setHp({ ...hp, current: Math.max(0, hp.current - 5) })}
            className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 rounded-lg text-sm cursor-pointer"
          >
            Levar 5 de Dano (-5)
          </button>
          <button
            onClick={() => setHp({ ...hp, current: Math.min(hp.max, hp.current + 5) })}
            className="px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded-lg text-sm cursor-pointer"
          >
            Curar (+5)
          </button>
        </div>
      </div>
    </div>
  );
}