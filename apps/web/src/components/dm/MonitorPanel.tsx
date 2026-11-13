import { MonitorDirectorState, CampaignMerchant } from '@totalrpg/shared';
import { ImageUploadField } from '../ImageUploadField';

interface MonitorDirectorPanelProps {
  campaignId: string;
  director: MonitorDirectorState;
  merchants: CampaignMerchant[];
  onChangeDirector: (updated: MonitorDirectorState) => void;
}

export function MonitorDirectorPanel({
  campaignId,
  director,
  merchants,
  onChangeDirector,
}: MonitorDirectorPanelProps) {
  function handleOpenSecondMonitorWindow() {
    const url = `${window.location.origin}/?monitorCampaignId=${campaignId}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="bg-zinc-900 border border-amber-500/40 rounded-2xl p-5 flex flex-col gap-5 shadow-xl">
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-amber-400">
              🖥️ Diretor do 2º Monitor (Tela Pública dos Jogadores)
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Esquerda da TV: Grupo de Jogadores • Direita da TV: Ameaças em Luta e/ou Mercador Ativo • Centro: Projeções!
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenSecondMonitorWindow}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-extrabold transition cursor-pointer shadow-lg shadow-amber-900/40 flex items-center gap-2"
        >
          <span>🖥️ Abrir Tela do 2º Monitor</span>
          <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded font-mono">Nova Janela ↗</span>
        </button>
      </div>

      {director.activeProjection && (
        <div className="bg-amber-950/50 border-2 border-amber-500 p-4 rounded-xl flex justify-between items-center gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase text-amber-300 font-bold">
              🔍 Projeção em Destaque Ativa no 2º Monitor ({director.activeProjection.type.toUpperCase()})
            </span>
            <h4 className="text-base font-extrabold text-white">
              {director.activeProjection.title}
            </h4>
          </div>
          <button
            type="button"
            onClick={() => onChangeDirector({ ...director, activeProjection: null })}
            className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-xs font-extrabold cursor-pointer"
          >
            ✕ Encerrar Projeção na TV
          </button>
        </div>
      )}

      {/* 1. REGRAS DE COMBATE E VISIBILIDADE DE PV DAS AMEAÇAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
        <div className="flex flex-col justify-between gap-2">
          <span className="text-xs font-bold text-zinc-300">
            ⚔️ Barra de Turnos & Bloco de Ameaças no Combate
          </span>
          <label className="flex items-center gap-2 text-xs text-amber-400 font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={director.showCombatTracker}
              onChange={(e) =>
                onChangeDirector({ ...director, showCombatTracker: e.target.checked })
              }
            />
            Exibir Barra de Turnos e Bloco Lateral de Ameaças quando houver combate
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-zinc-300">
            👹 Regra de Visibilidade do PV das Ameaças (No Topo e nos Blocos de Luta):
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'narrative', label: '🎭 Narrativo' },
                { id: 'exact', label: '🔢 PV Exato' },
                { id: 'hidden', label: '🔒 Oculto' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() =>
                  onChangeDirector({ ...director, enemyHpVisibility: opt.id })
                }
                className={`py-2 px-2 rounded-lg text-xs font-extrabold border transition cursor-pointer ${
                  director.enemyHpVisibility === opt.id
                    ? 'bg-red-700 border-red-400 text-white shadow'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. SELETOR DE MERCADOR NA LATERAL DIREITA DO 2º MONITOR */}
      <div className="bg-zinc-950 border border-blue-900/50 p-4 rounded-xl flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-blue-400 uppercase">
            🪙 Exibir Mercador no Lado Direito do 2º Monitor:
          </span>
          {director.activeMerchantId && (
            <button
              type="button"
              onClick={() => onChangeDirector({ ...director, activeMerchantId: null })}
              className="px-3 py-1 bg-zinc-800 hover:bg-red-900 text-zinc-300 hover:text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Fechar Loja na TV
            </button>
          )}
        </div>

        {merchants.length === 0 ? (
          <p className="text-xs text-zinc-500">
            Nenhum mercador criado na aba "🎒 Itens & Mercadores".
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {merchants.map((m) => {
              const isSelected = director.activeMerchantId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    onChangeDirector({
                      ...director,
                      activeMerchantId: isSelected ? null : m.id,
                    })
                  }
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 border-blue-300 text-white shadow'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  🪙 {m.name} ({m.stock.length} itens) {isSelected ? '• NA TV' : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. AMBIENTAÇÃO DA CENA E PROJEÇÃO DE IMAGEM COM UPLOAD DIRETO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
          <span className="text-xs font-bold text-amber-400 uppercase">
            🌄 Ambientação da Cena Atual
          </span>
          <input
            type="text"
            value={director.sceneTitle || ''}
            onChange={(e) => onChangeDirector({ ...director, sceneTitle: e.target.value })}
            placeholder="Título do Local (Ex: Mansão Endiabrada)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
          />
          <input
            type="text"
            value={director.sceneSubtitle || ''}
            onChange={(e) => onChangeDirector({ ...director, sceneSubtitle: e.target.value })}
            placeholder="Subtítulo / Clima (Ex: Meia-noite • Chuva Forte)"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
          />
          <ImageUploadField
            label="Imagem de Ambiente / Fundo do 2º Monitor"
            value={director.backgroundUrl || ''}
            onChange={(newUrl) => onChangeDirector({ ...director, backgroundUrl: newUrl })}
          />
        </div>

        <div className="bg-zinc-950 border border-purple-900/50 p-4 rounded-xl flex flex-col justify-between gap-3">
          <span className="text-xs font-bold text-purple-400 uppercase">
            🖼️ Projetar Imagem / Mapa / Pista Livre
          </span>
          <input
            type="text"
            value={director.handoutTitle || ''}
            onChange={(e) => onChangeDirector({ ...director, handoutTitle: e.target.value })}
            placeholder="Título da Pista / Mapa"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white"
          />
          <ImageUploadField
            label="Arquivo de Imagem da Pista / Mapa"
            value={director.handoutImageUrl || ''}
            onChange={(newUrl) => onChangeDirector({ ...director, handoutImageUrl: newUrl })}
          />
          <button
            type="button"
            onClick={() =>
              onChangeDirector({
                ...director,
                activeProjection: {
                  type: 'handout',
                  id: 'custom-handout',
                  title: director.handoutTitle || 'Evidência / Pista',
                  description: director.handoutText,
                  imageUrl: director.handoutImageUrl,
                },
              })
            }
            className="w-full py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl text-xs font-extrabold cursor-pointer"
          >
            🖥️ Projetar Imagem no 2º Monitor
          </button>
        </div>
      </div>
    </div>
  );
}