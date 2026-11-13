import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  DiceRollResult,
  MonitorDirectorState,
  CampaignMerchant,
  StickyPostIt,
  CharacterAbility,
  ActiveCondition,
  calculateActiveBonuses,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@totalrpg/shared';
import { DMScreenCampaignData, fetchDMScreenData } from '../services/api';
import { CombatantEntry } from './DMScreen';
import { FloatingPostItsLayer } from './dm/NotesAndPostItsManager';

const monitorSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io('http://localhost:3333');

interface SecondMonitorScreenProps {
  campaignId: string;
}

const DEFAULT_DIRECTOR: MonitorDirectorState = {
  showCombatTracker: true,
  enemyHpVisibility: 'narrative',
  activeMerchantId: null,
  activeProjection: null,
  sceneTitle: '',
  sceneSubtitle: '',
  backgroundUrl: '',
  handoutTitle: '',
  handoutImageUrl: '',
  handoutText: '',
};

type DensityTier = 0 | 1 | 2 | 3;

function getNarrativeHealthStatus(current?: number, max?: number): {
  label: string;
  colorClass: string;
  barColor: string;
  visualPercent: number;
} {
  if (current === undefined || max === undefined || max <= 0) {
    return {
      label: '👹 Ameaça',
      colorClass: 'text-zinc-300 border-zinc-700 bg-zinc-900',
      barColor: '#ef4444',
      visualPercent: 100,
    };
  }
  const ratio = Math.max(0, Math.min(1, current / max));
  if (current <= 0) {
    return {
      label: '💀 Derrotado',
      colorClass: 'text-zinc-500 border-zinc-800 bg-zinc-950 line-through',
      barColor: '#3f3f46',
      visualPercent: 0,
    };
  }
  if (ratio <= 0.25) {
    return {
      label: '🔴 Gravemente Ferido',
      colorClass: 'text-red-200 border-red-500 bg-red-950/90 animate-pulse',
      barColor: '#dc2626',
      visualPercent: 22,
    };
  }
  if (ratio <= 0.5) {
    return {
      label: '🟠 Machucado',
      colorClass: 'text-orange-200 border-orange-600 bg-orange-950/80',
      barColor: '#ea580c',
      visualPercent: 48,
    };
  }
  if (ratio < 1) {
    return {
      label: '🟡 Ferido',
      colorClass: 'text-amber-200 border-amber-600 bg-amber-950/70',
      barColor: '#d97706',
      visualPercent: 75,
    };
  }
  return {
    label: '🟢 Intacto',
    colorClass: 'text-emerald-200 border-emerald-600 bg-emerald-950/70',
    barColor: '#10b981',
    visualPercent: 100,
  };
}

// Retorna as classes de grade conforme o Nível de Compactação (Só comprime quando necessário!)
function getTierGridClasses(tier: DensityTier, isSplitHorizontal: boolean): string {
  if (!isSplitHorizontal) {
    if (tier === 0) return 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 content-start';
    if (tier === 1) return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4 content-start';
    if (tier === 2) return 'grid-cols-2 md:grid-cols-4 xl:grid-cols-5 content-start';
    return 'grid-cols-3 md:grid-cols-5 auto-rows-fr';
  }

  if (tier === 0) return 'grid-cols-1 xl:grid-cols-2 content-start';
  if (tier === 1) return 'grid-cols-2 content-start';
  if (tier === 2) return 'grid-cols-2 xl:grid-cols-3 content-start';
  return 'grid-cols-3 auto-rows-fr';
}

export function SecondMonitorScreen({ campaignId }: SecondMonitorScreenProps) {
  const [campaign, setCampaign] = useState<DMScreenCampaignData | null>(null);
  const [director, setDirector] = useState<MonitorDirectorState>(DEFAULT_DIRECTOR);
  const [combatants, setCombatants] = useState<CombatantEntry[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [merchants, setMerchants] = useState<CampaignMerchant[]>([]);
  const [allPostIts, setAllPostIts] = useState<StickyPostIt[]>([]);

  const [publicRolls, setPublicRolls] = useState<DiceRollResult[]>([]);
  const [spotlightRoll, setSpotlightRoll] = useState<DiceRollResult | null>(null);
  const [isAnimatingRoll, setIsAnimatingRoll] = useState(false);
  const [fakeRollNumber, setFakeRollNumber] = useState(20);

  const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState(false);
  const [initiativeEntries, setInitiativeEntries] = useState<
    Record<
      string,
      {
        roll: DiceRollResult;
        isSpinning: boolean;
      }
    >
  >({});
  const [allRevealedCountdown, setAllRevealedCountdown] = useState<boolean>(false);

  // Referências e Níveis de Adaptação (0 = Tamanho Natural; só sobe se scrollHeight > clientHeight)
  const playersGridRef = useRef<HTMLDivElement | null>(null);
  const threatsGridRef = useRef<HTMLDivElement | null>(null);
  const merchantGridRef = useRef<HTMLDivElement | null>(null);

  const [playerTier, setPlayerTier] = useState<DensityTier>(0);
  const [threatTier, setThreatTier] = useState<DensityTier>(0);
  const [merchantTier, setMerchantTier] = useState<DensityTier>(0);
  const [viewportTick, setViewportTick] = useState(0);

  async function fetchCharactersOnly() {
    try {
      const data = await fetchDMScreenData(campaignId);
      setCampaign(data);
    } catch (err) {
      console.error('Erro ao buscar personagens no 2º Monitor:', err);
    }
  }

  useEffect(() => {
    function handleResize() {
      setViewportTick((t) => t + 1);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function initialHydrate() {
      try {
        const data = await fetchDMScreenData(campaignId);
        setCampaign(data);

        if (data.combatState) {
          setCombatants(
            Array.isArray(data.combatState.combatants) ? data.combatState.combatants : []
          );
          setCurrentTurnIndex(
            typeof data.combatState.currentTurnIndex === 'number'
              ? data.combatState.currentTurnIndex
              : 0
          );
          setRoundNumber(
            typeof data.combatState.roundNumber === 'number'
              ? data.combatState.roundNumber
              : 1
          );
          if (data.combatState.director) {
            setDirector({ ...DEFAULT_DIRECTOR, ...data.combatState.director });
          }
        }
        if (Array.isArray(data.merchants)) setMerchants(data.merchants);
        if (Array.isArray(data.postIts)) setAllPostIts(data.postIts);
      } catch (err) {
        console.error(err);
      }
    }

    initialHydrate();

    monitorSocket.emit('session:join', { campaignId, role: 'monitor' });

    monitorSocket.on('character:updated', () => {
      fetchCharactersOnly();
    });

    monitorSocket.on(
      'monitor:updated',
      ({
        director: nextDirector,
        combatState,
        merchants: nextMerchants,
        postIts: nextPostIts,
      }) => {
        setDirector(nextDirector);
        setCombatants(Array.isArray(combatState.combatants) ? combatState.combatants : []);
        setCurrentTurnIndex(
          typeof combatState.currentTurnIndex === 'number' ? combatState.currentTurnIndex : 0
        );
        setRoundNumber(typeof combatState.roundNumber === 'number' ? combatState.roundNumber : 1);
        if (Array.isArray(nextMerchants)) setMerchants(nextMerchants);
        if (Array.isArray(nextPostIts)) setAllPostIts(nextPostIts);
      }
    );

    monitorSocket.on('combat:initiativeRequested', () => {
      setSpotlightRoll(null);
      setInitiativeEntries({});
      setAllRevealedCountdown(false);
      setIsInitiativeModalOpen(true);
    });

    monitorSocket.on('dice:rolled', (newRoll) => {
      if (newRoll.isSecret) return;

      setPublicRolls((prev) => [newRoll, ...prev.slice(0, 9)]);

      if (newRoll.isInitiativeRoll && newRoll.characterId) {
        setIsInitiativeModalOpen(true);
        const charId = newRoll.characterId;

        setInitiativeEntries((prev) => ({
          ...prev,
          [charId]: { roll: newRoll, isSpinning: true },
        }));

        setTimeout(() => {
          setInitiativeEntries((prev) => {
            if (!prev[charId]) return prev;
            return {
              ...prev,
              [charId]: { ...prev[charId], isSpinning: false },
            };
          });
        }, 800);
        return;
      }

      setSpotlightRoll(newRoll);
    });

    return () => {
      monitorSocket.off('character:updated');
      monitorSocket.off('monitor:updated');
      monitorSocket.off('combat:initiativeRequested');
      monitorSocket.off('dice:rolled');
    };
  }, [campaignId]);

  const activeMerchant =
    merchants.find((m) => m.id === director.activeMerchantId) || null;
  const activeThreatsInCombat = combatants.filter((c) => c.isNPC);
  const showThreatsBlock = director.showCombatTracker && activeThreatsInCombat.length > 0;
  const hasRightCompanionPanel = Boolean(activeMerchant) || showThreatsBlock;

  // Sempre que a quantidade de blocos ou divisão da tela mudar, volta ao tamanho natural (Tier 0) para medir se cabe!
  useLayoutEffect(() => {
    setPlayerTier(0);
  }, [campaign?.characters.length, hasRightCompanionPanel, showThreatsBlock, viewportTick]);

  useLayoutEffect(() => {
    setThreatTier(0);
  }, [activeThreatsInCombat.length, Boolean(activeMerchant), showThreatsBlock, viewportTick]);

  useLayoutEffect(() => {
    setMerchantTier(0);
  }, [activeMerchant?.id, activeMerchant?.stock.length, showThreatsBlock, viewportTick]);

  // Se no Tier atual o conteúdo passar da altura visível (criaria scroll), reduz um degrau até caber!
  useLayoutEffect(() => {
    const el = playersGridRef.current;
    if (!el || playerTier >= 3) return;
    if (el.scrollHeight > el.clientHeight + 2) {
      setPlayerTier((t) => Math.min(3, t + 1) as DensityTier);
    }
  }, [playerTier, campaign?.characters, hasRightCompanionPanel, viewportTick]);

  useLayoutEffect(() => {
    const el = threatsGridRef.current;
    if (!el || threatTier >= 3) return;
    if (el.scrollHeight > el.clientHeight + 2) {
      setThreatTier((t) => Math.min(3, t + 1) as DensityTier);
    }
  }, [threatTier, activeThreatsInCombat, Boolean(activeMerchant), viewportTick]);

  useLayoutEffect(() => {
    const el = merchantGridRef.current;
    if (!el || merchantTier >= 3) return;
    if (el.scrollHeight > el.clientHeight + 2) {
      setMerchantTier((t) => Math.min(3, t + 1) as DensityTier);
    }
  }, [merchantTier, activeMerchant, showThreatsBlock, viewportTick]);

  useEffect(() => {
    if (!isInitiativeModalOpen || !campaign || campaign.characters.length === 0) return;

    const allCharactersRevealed = campaign.characters.every((ch) => {
      const entry = initiativeEntries[ch.id];
      return entry && !entry.isSpinning;
    });

    if (allCharactersRevealed) {
      setAllRevealedCountdown(true);
      const closeTimer = setTimeout(() => {
        setIsInitiativeModalOpen(false);
        setAllRevealedCountdown(false);
      }, 3000);

      return () => clearTimeout(closeTimer);
    }
  }, [isInitiativeModalOpen, initiativeEntries, campaign]);

  useEffect(() => {
    if (!spotlightRoll) return;
    setIsAnimatingRoll(true);

    const spinInterval = setInterval(() => {
      setFakeRollNumber(Math.floor(Math.random() * 20) + 1);
    }, 60);

    const revealTimer = setTimeout(() => {
      clearInterval(spinInterval);
      setIsAnimatingRoll(false);
    }, 750);

    const autoDismissTimer = setTimeout(() => {
      setSpotlightRoll(null);
    }, 4500);

    return () => {
      clearInterval(spinInterval);
      clearTimeout(revealTimer);
      clearTimeout(autoDismissTimer);
    };
  }, [spotlightRoll]);

  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-400 flex items-center justify-center font-mono text-sm">
        Conectando 2º Monitor à sessão ao vivo...
      </div>
    );
  }

  const monitorPostIts = allPostIts
    .filter((p) => p.sharedOnMonitor)
    .map((p) => ({ ...p, isPinned: true }));

  const defaultCurrency = campaign.system === 'ordem-paranormal' ? 'Cat.' : 'T$';

  return (
    <div
      className="h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col justify-between relative overflow-hidden select-none"
      style={
        director.backgroundUrl
          ? {
              backgroundImage: `linear-gradient(to bottom, rgba(9, 9, 11, 0.86), rgba(9, 9, 11, 0.96)), url(${director.backgroundUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {/* CAMADA DE POST-ITS MARCADOS COM "🖥️ 2º MONITOR" */}
      <FloatingPostItsLayer
        postIts={monitorPostIts}
        isDMView={false}
        onUpdatePostIt={(updated) =>
          setAllPostIts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
        }
        onClosePlayerPostIt={(id) =>
          setAllPostIts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, sharedOnMonitor: false } : p))
          )
        }
      />

      {/* MODAL ESPECIAL 1: CONVOCAÇÃO COLETIVA DE INICIATIVA */}
      {isInitiativeModalOpen && (
        <div
          onClick={() => setIsInitiativeModalOpen(false)}
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-6 backdrop-blur-md"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border-2 border-amber-500 rounded-3xl max-w-5xl w-full p-8 shadow-2xl flex flex-col gap-6"
          >
            <div className="text-center">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-extrabold">
                ⚔️ Combate Iniciado • Testes de Iniciativa da Mesa
              </span>
              <h2 className="text-3xl font-extrabold text-white mt-1">
                {allRevealedCountdown
                  ? '✨ Iniciativas Definidas! Preparando Turnos...'
                  : '🎲 Rolando Iniciativa dos Personagens...'}
              </h2>
            </div>

            <div
              className={`grid gap-4 ${
                campaign.characters.length <= 3
                  ? 'grid-cols-1 sm:grid-cols-3'
                  : 'grid-cols-2 sm:grid-cols-4'
              }`}
            >
              {campaign.characters.map((char) => {
                const entry = initiativeEntries[char.id];

                return (
                  <div
                    key={char.id}
                    className={`p-4 rounded-2xl border-2 flex flex-col items-center text-center justify-between gap-3 transition-all ${
                      entry && !entry.isSpinning
                        ? 'bg-amber-950/30 border-amber-500 shadow-lg shadow-amber-950/40'
                        : entry && entry.isSpinning
                        ? 'bg-zinc-950 border-amber-400 animate-pulse'
                        : 'bg-zinc-950/80 border-zinc-800 opacity-75'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      {char.portraitUrl ? (
                        <img
                          src={char.portraitUrl}
                          alt={char.name}
                          className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500/70 shadow-lg"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-zinc-900 border-2 border-amber-500/50 flex items-center justify-center text-2xl font-extrabold text-amber-400">
                          {char.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                          @{char.owner.username}
                        </span>
                        <h3 className="text-lg font-extrabold text-white">{char.name}</h3>
                      </div>
                    </div>

                    {!entry ? (
                      <div className="py-5 flex flex-col items-center gap-2">
                        <span className="text-3xl opacity-40 animate-pulse">⏳</span>
                        <span className="text-xs font-mono text-zinc-400">
                          Aguardando rolagem...
                        </span>
                      </div>
                    ) : entry.isSpinning ? (
                      <div className="py-4 flex flex-col items-center gap-2">
                        <span className="text-5xl animate-bounce">🎲</span>
                        <span className="text-xs font-mono text-amber-400 font-bold">
                          Girando dados...
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className="w-20 h-20 rounded-2xl bg-zinc-950 border-2 border-amber-400 flex flex-col items-center justify-center shadow-inner">
                          <span className="text-[9px] uppercase text-zinc-500 font-bold">
                            Total
                          </span>
                          <span className="text-3xl font-mono font-extrabold text-white">
                            {entry.roll.total}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400">
                          {entry.roll.formula} → [{entry.roll.rolls.join(', ')}]
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESPECIAL 2: PROJEÇÃO UNIVERSAL EM DESTAQUE */}
      {director.activeProjection && !isInitiativeModalOpen && (
        <div className="fixed inset-0 bg-black/90 z-40 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-zinc-900 border-2 border-amber-500 rounded-3xl max-w-5xl w-full p-8 shadow-2xl flex flex-col items-center text-center gap-6">
            <div>
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-extrabold">
                {director.activeProjection.subtitle || '🔍 Em Exibição pelo Mestre'}
              </span>
              <h2 className="text-3xl font-extrabold text-white mt-1">
                {director.activeProjection.title}
              </h2>
            </div>

            {director.activeProjection.imageUrl && (
              <div className="w-full max-h-[68vh] flex justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-inner">
                <img
                  src={director.activeProjection.imageUrl}
                  alt={director.activeProjection.title}
                  className="max-h-[64vh] w-auto object-contain rounded-xl shadow-2xl"
                />
              </div>
            )}

            {director.activeProjection.description && (
              <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 p-5 rounded-2xl">
                <p className="text-base text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {director.activeProjection.description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ESPECIAL 3: HOLOFOTE DE ROLAGEM PÚBLICA INDIVIDUAL */}
      {spotlightRoll && !isInitiativeModalOpen && (
        <div
          onClick={() => setSpotlightRoll(null)}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6 backdrop-blur-sm"
        >
          <div className="bg-zinc-900 border-2 border-amber-500 rounded-3xl max-w-lg w-full p-8 shadow-2xl shadow-amber-950/60 flex flex-col items-center text-center gap-5">
            <div>
              <span className="text-sm font-mono uppercase tracking-widest text-amber-400 font-extrabold">
                🎲 {spotlightRoll.characterName}
              </span>
              <h2 className="text-2xl font-extrabold text-white mt-1">{spotlightRoll.label}</h2>
              <span className="text-xs font-mono text-zinc-400">
                Fórmula: {spotlightRoll.formula}
              </span>
            </div>

            {isAnimatingRoll ? (
              <div className="py-10 flex flex-col items-center gap-4">
                <div className="text-7xl animate-bounce">🎲</div>
                <div className="text-5xl font-extrabold font-mono text-amber-400 animate-pulse">
                  {fakeRollNumber}
                </div>
                <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                  Sorteando destino...
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5 w-full">
                <div className="w-36 h-36 rounded-3xl bg-zinc-950 border-4 border-amber-500 flex flex-col items-center justify-center shadow-2xl shadow-amber-900/50">
                  <span className="text-xs uppercase font-bold text-zinc-500">Resultado</span>
                  <span className="text-6xl font-extrabold font-mono text-white">
                    {spotlightRoll.total}
                  </span>
                </div>

                <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
                  <span className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                    Dados Rolados ({spotlightRoll.rolls.length})
                  </span>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    {spotlightRoll.rolls.map((val, idx) => (
                      <span
                        key={idx}
                        className={`w-11 h-11 rounded-xl font-mono font-extrabold text-base flex items-center justify-center border-2 ${
                          val === 20
                            ? 'bg-amber-500/30 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20'
                            : val === 1
                            ? 'bg-red-950/80 border-red-600 text-red-300'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-200'
                        }`}
                      >
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. TOPO DO 2º MONITOR: TÍTULO DA CENA + BARRA DE ORDEM DE TURNOS */}
      <header className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md flex flex-col gap-2.5 shrink-0">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3.5">
            <span className="text-xs font-mono uppercase bg-amber-950/80 text-amber-400 border border-amber-700/60 px-3 py-1 rounded-full font-extrabold">
              {campaign.system === 'ordem-paranormal' ? 'Ordem Paranormal' : 'Tormenta 20'}
            </span>
            <div>
              <h1 className="text-lg font-extrabold text-white tracking-wide">
                {director.sceneTitle || campaign.name}
              </h1>
              {director.sceneSubtitle && (
                <p className="text-xs text-amber-400/90 font-medium">{director.sceneSubtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={toggleFullScreen}
            className="px-3 py-1 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            ⛶ Tela Cheia
          </button>
        </div>

        {/* BARRA DE ORDEM DE TURNOS */}
        {director.showCombatTracker && combatants.length > 0 && (
          <div className="bg-zinc-900/90 border border-amber-500/40 rounded-2xl p-2 flex items-center gap-2.5 overflow-hidden">
            <div className="bg-amber-500 text-zinc-950 px-3.5 py-2 rounded-xl text-center shrink-0">
              <span className="block text-[9px] uppercase font-extrabold tracking-wider">
                Combate
              </span>
              <span className="font-mono text-sm font-extrabold">Rodada {roundNumber}</span>
            </div>

            <div className="flex-1 flex items-center gap-2.5 overflow-hidden">
              {combatants.map((c, index) => {
                const isTurn = index === currentTurnIndex;
                const narrativeState = getNarrativeHealthStatus(c.hpCurrent, c.hpMax);
                const matchedPlayerChar = !c.isNPC
                  ? campaign.characters.find((ch) => ch.id === c.characterId)
                  : undefined;
                const avatarUrl = c.imageUrl || matchedPlayerChar?.portraitUrl;

                return (
                  <div
                    key={c.id}
                    className={`px-3.5 py-2 rounded-xl border-2 flex items-center gap-3 flex-initial shrink min-w-0 transition-colors ${
                      isTurn
                        ? 'bg-amber-950/90 border-amber-400 shadow-md shadow-amber-950/60'
                        : 'bg-zinc-950/90 border-zinc-800 opacity-75'
                    }`}
                  >
                    <span className="font-mono text-sm font-extrabold text-amber-400 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 shrink-0">
                      {c.initiative}
                    </span>

                    {avatarUrl && (
                      <img
                        src={avatarUrl}
                        alt={c.name}
                        className="w-11 h-11 rounded-xl object-cover border border-amber-500/60 shrink-0"
                      />
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {isTurn && (
                          <span className="text-[10px] font-extrabold uppercase bg-amber-500 text-zinc-950 px-1.5 py-0.5 rounded shrink-0">
                            🔥 VEZ
                          </span>
                        )}
                        <span className="font-extrabold text-sm text-white truncate">
                          {c.name}
                        </span>
                      </div>

                      {c.isNPC ? (
                        director.enemyHpVisibility === 'narrative' ? (
                          <span
                            className={`inline-block truncate max-w-full text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 ${narrativeState.colorClass}`}
                          >
                            {narrativeState.label}
                          </span>
                        ) : director.enemyHpVisibility === 'exact' &&
                          c.hpCurrent !== undefined &&
                          c.hpMax !== undefined ? (
                          <span className="inline-block truncate text-[10px] font-mono font-bold text-red-400 mt-0.5">
                            ❤️ {c.hpCurrent} / {c.hpMax} PV
                          </span>
                        ) : null
                      ) : (
                        <span className="inline-block truncate text-[10px] font-mono text-emerald-400 mt-0.5">
                          🛡️ Jogador
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* 2. PALCO CENTRAL */}
      <main className="flex-1 p-5 min-h-0 overflow-hidden">
        <div
          className={`max-w-[1700px] mx-auto h-full min-h-0 grid grid-cols-1 ${
            hasRightCompanionPanel ? 'lg:grid-cols-2' : 'lg:grid-cols-1'
          } gap-5 items-stretch`}
        >
          {/* Grupo de Personagens*/}
          <section className="bg-zinc-900/65 border-2 border-zinc-800/90 rounded-3xl p-4 flex flex-col gap-3.5 h-full min-h-0 overflow-hidden shadow-2xl">

            <div
              ref={playersGridRef}
              className={`flex-1 min-h-0 overflow-hidden grid ${getTierGridClasses(
                playerTier,
                hasRightCompanionPanel
              )} ${playerTier >= 2 ? 'gap-2.5' : 'gap-3.5'}`}
            >
              {campaign.characters.map((char) => {
                const raw = (char.sheetData || {}) as Record<string, any>;
                const abilities: CharacterAbility[] = Array.isArray(raw.abilities)
                  ? raw.abilities
                  : [];
                const conditions: ActiveCondition[] = Array.isArray(raw.conditions)
                  ? raw.conditions
                  : [];
                const levelOrNex =
                  char.system === 'ordem-paranormal'
                    ? Number(raw.nex ?? 5)
                    : Number(raw.level ?? 1);

                const bonuses = calculateActiveBonuses(
                  char.system,
                  levelOrNex,
                  abilities,
                  char.inventory || [],
                  conditions
                );

                const agiOrDes =
                  char.system === 'ordem-paranormal'
                    ? Number(raw.attributes?.agi ?? 1) + (bonuses.attributes['agi'] || 0)
                    : Number(raw.attributes?.destreza ?? 1) + (bonuses.attributes['destreza'] || 0);
                const totalDefense = 10 + agiOrDes + bonuses.defense;

                const pvBar = char.vitals.find((b) => b.id === 'pv');
                const pvMax = pvBar ? Math.max(1, pvBar.max + (bonuses.vitalMax['pv'] || 0)) : 1;
                const pvCurrent = pvBar ? pvBar.current : 1;
                const isDying = pvCurrent <= 0;
                const isBloodied = !isDying && pvCurrent <= pvMax / 2;

                const activeTurnCombatant = combatants[currentTurnIndex];
                const isMyTurnInCombat =
                  director.showCombatTracker &&
                  combatants.length > 0 &&
                  activeTurnCombatant?.characterId === char.id;

                const isCompact = playerTier >= 1;
                const isUltra = playerTier >= 2;

                return (
                  <div
                    key={char.id}
                    className={`rounded-2xl ${
                      isUltra ? 'p-2.5 gap-2' : isCompact ? 'p-3.5 gap-2.5' : 'p-4 gap-3.5'
                    } border-2 flex flex-col justify-between min-h-0 overflow-hidden transition-all shadow-lg ${
                      isMyTurnInCombat
                        ? 'bg-amber-950/35 border-amber-400 shadow-amber-950/50'
                        : isDying
                        ? 'bg-red-950/60 border-red-500 animate-pulse'
                        : isBloodied
                        ? 'bg-zinc-950/95 border-red-800/80'
                        : 'bg-zinc-950/90 border-zinc-800/90'
                    }`}
                  >
                    <div className="flex flex-col gap-2 min-h-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3.5 min-w-0">
                          {char.portraitUrl ? (
                            <img
                              src={char.portraitUrl}
                              alt={char.name}
                              className={`${
                                isUltra ? 'w-14 h-14' : isCompact ? 'w-20 h-20' : 'w-28 h-28'
                              } rounded-2xl object-cover border-2 border-amber-500/70 shadow-lg shrink-0`}
                            />
                          ) : (
                            <div
                              className={`${
                                isUltra
                                  ? 'w-14 h-14 text-base'
                                  : isCompact
                                  ? 'w-20 h-20 text-xl'
                                  : 'w-28 h-28 text-3xl'
                              } rounded-2xl bg-zinc-900 border-2 border-amber-500/50 flex items-center justify-center font-extrabold text-amber-400 shrink-0`}
                            >
                              {char.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold truncate">
                                @{char.owner.username}
                              </span>
                              {isMyTurnInCombat && (
                                <span className="text-[9px] font-extrabold uppercase bg-amber-500 text-zinc-950 px-1.5 py-0.5 rounded shrink-0">
                                  🔥 Turno
                                </span>
                              )}
                            </div>
                            <h3
                              className={`${
                                isUltra ? 'text-xs' : isCompact ? 'text-sm' : 'text-base'
                              } font-extrabold text-white truncate`}
                            >
                              {char.name}
                            </h3>
                            {playerTier < 3 && (
                              <span className="text-[11px] text-zinc-400 block truncate">
                                {char.system === 'ordem-paranormal'
                                  ? `${raw.characterClass || 'Combatente'} • NEX ${levelOrNex}%`
                                  : `${raw.race || 'Humano'} ${raw.characterClass || 'Guerreiro'} • Nv ${levelOrNex}`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-xl text-center shrink-0">
                          <span className="block text-[8px] uppercase text-zinc-500 font-bold">
                            Defesa
                          </span>
                          <span
                            className={`font-mono ${
                              isUltra ? 'text-xs' : 'text-sm'
                            } font-extrabold text-amber-400`}
                          >
                            🛡️ {totalDefense}
                          </span>
                        </div>
                      </div>

                      {(isDying || isBloodied || conditions.length > 0) && (
                        <div className="flex flex-wrap gap-1 overflow-hidden">
                          {isDying && (
                            <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-extrabold uppercase">
                              💀 Morrendo
                            </span>
                          )}
                          {isBloodied && (
                            <span className="px-2 py-0.5 bg-red-950 border border-red-700 text-red-300 rounded-full text-[10px] font-bold">
                              🩸 Machucado
                            </span>
                          )}
                          {conditions.map((cond) => (
                            <span
                              key={cond.id}
                              className="px-2 py-0.5 bg-red-950/90 border border-red-600 text-red-200 rounded-full text-[10px] font-bold"
                            >
                              🩸 {cond.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex flex-col ${
                        isUltra ? 'gap-1.5 p-2' : 'gap-2 p-3'
                      } bg-zinc-900/90 rounded-xl border border-zinc-800/80 shrink-0`}
                    >
                      {char.vitals.map((bar) => {
                        const effectiveMax = Math.max(
                          1,
                          bar.max + (bonuses.vitalMax[bar.id] || 0)
                        );
                        const pct = Math.max(
                          0,
                          Math.min(100, (bar.current / effectiveMax) * 100)
                        );

                        return (
                          <div key={bar.id} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-bold uppercase tracking-wider text-zinc-300 truncate">
                                {bar.label}
                              </span>
                              <span className="font-mono font-extrabold text-white">
                                {bar.current} / {effectiveMax}
                              </span>
                            </div>
                            <div
                              className={`w-full ${
                                isUltra ? 'h-2' : 'h-2.5'
                              } bg-zinc-950 rounded-full overflow-hidden border border-zinc-800`}
                            >
                              <div
                                className="h-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: bar.color }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* =================================================================
              PAINEL DIREITO DEMARCADO: AMEAÇAS E/OU LOJA VIRTUAL
             ================================================================= */}
          {hasRightCompanionPanel && (
            <div className="flex flex-col gap-5 h-full min-h-0 overflow-hidden">
              {/* 1. SETOR DE AMEAÇAS NO COMBATE */}
              {showThreatsBlock && (
                <section
                  className={`bg-zinc-900/65 border-2 border-red-900/70 rounded-3xl p-4 flex flex-col gap-3.5 ${
                    activeMerchant ? 'shrink-0 max-h-[46%]' : 'flex-1'
                  } min-h-0 overflow-hidden shadow-2xl backdrop-blur-md`}
                >
                  <div className="flex justify-between items-center border-b border-zinc-800 pb-2.5 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-xl bg-red-500/10 border border-red-500/40 flex items-center justify-center text-sm">
                        👹
                      </span>
                      <div>
                        <span className="block text-[9px] font-mono uppercase tracking-widest text-red-400 font-bold">
                          Oponentes Hostis na Cena
                        </span>
                        <h3 className="text-sm font-extrabold text-white">
                          Ameaças em Combate ({activeThreatsInCombat.length})
                        </h3>
                      </div>
                    </div>
                  </div>

                  <div
                    ref={threatsGridRef}
                    className={`flex-1 min-h-0 overflow-hidden grid ${getTierGridClasses(
                      threatTier,
                      true
                    )} ${threatTier >= 2 ? 'gap-2.5' : 'gap-3.5'}`}
                  >
                    {activeThreatsInCombat.map((threat) => {
                      const activeTurnCombatant = combatants[currentTurnIndex];
                      const isThreatTurn = activeTurnCombatant?.id === threat.id;
                      const narrative = getNarrativeHealthStatus(
                        threat.hpCurrent,
                        threat.hpMax
                      );
                      const exactPct =
                        threat.hpCurrent !== undefined && threat.hpMax
                          ? Math.max(0, Math.min(100, (threat.hpCurrent / threat.hpMax) * 100))
                          : 100;

                      const isUltra = threatTier >= 2;

                      return (
                        <div
                          key={threat.id}
                          className={`${
                            isUltra ? 'p-2.5 gap-2' : 'p-4 gap-3'
                          } rounded-2xl border-2 flex flex-col justify-between min-h-0 overflow-hidden transition-all ${
                            isThreatTurn
                              ? 'bg-red-950/45 border-amber-400 shadow-lg'
                              : 'bg-zinc-950/90 border-zinc-800/90'
                          }`}
                        >
                          <div className="flex justify-between items-center gap-3 min-w-0">
                            <div className="flex items-center gap-3.5 min-w-0">
                              {threat.imageUrl ? (
                                <img
                                  src={threat.imageUrl}
                                  alt={threat.name}
                                  className={`${
                                    isUltra ? 'w-14 h-14' : threatTier === 1 ? 'w-20 h-20' : 'w-28 h-28'
                                  } rounded-2xl object-cover border-2 border-red-600/80 shadow-lg shrink-0`}
                                />
                              ) : (
                                <div
                                  className={`${
                                    isUltra
                                      ? 'w-14 h-14 text-xl'
                                      : threatTier === 1
                                      ? 'w-20 h-20 text-3xl'
                                      : 'w-28 h-28 text-4xl'
                                  } rounded-2xl bg-red-950/80 border-2 border-red-800 flex items-center justify-center shrink-0`}
                                >
                                  👹
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4
                                    className={`font-extrabold ${
                                      isUltra ? 'text-xs' : 'text-base'
                                    } text-white truncate`}
                                  >
                                    {threat.name}
                                  </h4>
                                  {isThreatTurn && (
                                    <span className="text-[9px] font-extrabold uppercase bg-amber-500 text-zinc-950 px-1.5 py-0.5 rounded shrink-0">
                                      🔥 Agindo
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-mono text-zinc-400 block">
                                  ⚡ Iniciativa:{' '}
                                  <strong className="text-amber-400">{threat.initiative}</strong>
                                </span>
                              </div>
                            </div>

                            {director.enemyHpVisibility === 'narrative' && (
                              <span
                                className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border shrink-0 ${narrative.colorClass}`}
                              >
                                {narrative.label}
                              </span>
                            )}
                            {director.enemyHpVisibility === 'exact' &&
                              threat.hpCurrent !== undefined &&
                              threat.hpMax !== undefined && (
                                <span className="text-xs font-mono font-extrabold text-red-400 bg-zinc-900 px-2.5 py-1 rounded-xl border border-zinc-800 shrink-0">
                                  ❤️ {threat.hpCurrent} / {threat.hpMax} PV
                                </span>
                              )}
                          </div>

                          {director.enemyHpVisibility !== 'hidden' && (
                            <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                              <div
                                className="h-full transition-all duration-500"
                                style={{
                                  width: `${
                                    director.enemyHpVisibility === 'exact'
                                      ? exactPct
                                      : narrative.visualPercent
                                  }%`,
                                  backgroundColor:
                                    director.enemyHpVisibility === 'exact'
                                      ? '#dc2626'
                                      : narrative.barColor,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 2. VITRINE DE LOJA VIRTUAL DO MERCADOR */}
              {activeMerchant && (
                <section className="bg-zinc-900/75 border-2 border-amber-500/50 rounded-3xl p-4 flex flex-col gap-3.5 flex-1 min-h-0 overflow-hidden shadow-2xl backdrop-blur-md">
                  <div className="bg-gradient-to-r from-amber-950/60 via-zinc-900 to-zinc-950 border border-amber-500/40 rounded-2xl px-4 py-3 flex justify-between items-center gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-xl shrink-0">
                        🏪
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[9px] font-mono uppercase tracking-widest text-amber-400 font-extrabold">
                          Vitrine de Comércio • Loja Aberta
                        </span>
                        <h3 className="text-lg font-extrabold text-white truncate">
                          {activeMerchant.name}
                        </h3>
                        {activeMerchant.description && (
                          <p className="text-xs text-zinc-300 truncate">
                            {activeMerchant.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-zinc-950/90 border border-zinc-800 px-3 py-1.5 rounded-xl text-right shrink-0">
                      <span className="block text-[8px] uppercase text-zinc-500 font-bold">
                        Catálogo
                      </span>
                      <span className="font-mono text-xs font-extrabold text-amber-400">
                        {activeMerchant.stock.length}{' '}
                        {activeMerchant.stock.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                  </div>

                  {activeMerchant.stock.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center border border-dashed border-zinc-800 rounded-2xl p-6">
                      <p className="text-xs text-zinc-500 text-center">
                        O catálogo desta loja está vazio no momento.
                      </p>
                    </div>
                  ) : (
                    <div
                      ref={merchantGridRef}
                      className={`flex-1 min-h-0 overflow-hidden grid ${getTierGridClasses(
                        merchantTier,
                        true
                      )} ${merchantTier >= 2 ? 'gap-2.5' : 'gap-3.5'}`}
                    >
                      {activeMerchant.stock.map((st) => {
                        const displayCurrency = st.currency || defaultCurrency;
                        const isWeapon = Boolean(st.attack);
                        const isCompact = merchantTier >= 1;
                        const isUltra = merchantTier >= 2;

                        return (
                          <div
                            key={st.id}
                            className="bg-zinc-950/95 border border-zinc-800 rounded-2xl flex flex-col justify-between min-h-0 overflow-hidden shadow-lg"
                          >
                            <div
                              className={`${
                                isUltra ? 'p-2.5 gap-1.5' : isCompact ? 'p-3 gap-2' : 'p-4 gap-2.5'
                              } flex flex-col min-h-0 overflow-hidden`}
                            >
                              <div className="flex items-start gap-3.5 min-w-0">
                                {st.item.imageUrl ? (
                                  <img
                                    src={st.item.imageUrl}
                                    alt={st.item.name}
                                    className={`${
                                      isUltra ? 'w-12 h-12' : isCompact ? 'w-16 h-16' : 'w-24 h-24'
                                    } rounded-2xl object-cover border-2 border-amber-500/50 shadow-md shrink-0`}
                                  />
                                ) : (
                                  <div
                                    className={`${
                                      isUltra
                                        ? 'w-12 h-12 text-lg'
                                        : isCompact
                                        ? 'w-16 h-16 text-2xl'
                                        : 'w-24 h-24 text-3xl'
                                    } rounded-2xl border flex items-center justify-center shrink-0 ${
                                      isWeapon
                                        ? 'bg-red-950/50 border-red-800/70 text-red-300'
                                        : 'bg-zinc-900 border-zinc-800 text-amber-400'
                                    }`}
                                  >
                                    {isWeapon ? '⚔️' : '🎒'}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                                        isWeapon
                                          ? 'bg-red-950 text-red-300 border border-red-800/70'
                                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                                      }`}
                                    >
                                      {isWeapon ? 'Arma' : 'Equipamento'}
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-500">
                                      • {st.item.slots} esp.
                                    </span>
                                  </div>
                                  <h4
                                    className={`font-extrabold ${
                                      isUltra ? 'text-xs' : 'text-sm'
                                    } text-white mt-1 truncate`}
                                  >
                                    {st.item.name}
                                  </h4>
                                </div>
                              </div>

                              {st.attack && (
                                <div className="flex items-center gap-2 bg-zinc-900/90 border border-zinc-800/80 px-2.5 py-1 rounded-lg text-[11px] font-mono">
                                  <span className="text-red-400 font-bold">
                                    🩸 Dano: {st.attack.damageFormula}
                                  </span>
                                  <span className="text-zinc-600">|</span>
                                  <span className="text-amber-400">
                                    🎯 Crítico: {st.attack.critRange}
                                  </span>
                                </div>
                              )}

                              {merchantTier < 3 && st.item.description && (
                                <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                  {st.item.description}
                                </p>
                              )}
                            </div>

                            <div
                              className={`bg-zinc-900/90 border-t border-zinc-800/90 ${
                                isUltra ? 'px-3 py-1.5' : 'px-4 py-2'
                              } flex justify-between items-center shrink-0`}
                            >
                              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold">
                                Valor Unitário
                              </span>
                              <div className="flex items-center gap-1.5 bg-amber-950/90 border border-amber-500/70 px-2.5 py-0.5 rounded-xl shadow">
                                <span className="text-xs">🪙</span>
                                <span
                                  className={`font-mono ${
                                    isUltra ? 'text-xs' : 'text-sm'
                                  } font-extrabold text-amber-300`}
                                >
                                  {st.price} {displayCurrency}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 3. RODAPÉ AO VIVO: ÚLTIMAS ROLAGENS DA MESA */}
      <footer className="px-6 py-2.5 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md flex items-center gap-4 overflow-x-auto overflow-y-hidden shrink-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-500 shrink-0">
          🎲 Últimas Rolagens:
        </span>

        {publicRolls.length === 0 ? (
          <span className="text-xs text-zinc-500 italic">
            Aguardando rolagens públicas da sessão...
          </span>
        ) : (
          <div className="flex items-center gap-3 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {publicRolls.map((roll) => (
              <div
                key={roll.id}
                onClick={() => setSpotlightRoll(roll)}
                className="bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-xl flex items-center gap-3 shrink-0 cursor-pointer hover:border-amber-500/60 transition"
              >
                <div>
                  <span className="text-xs font-extrabold text-amber-400">
                    {roll.characterName}
                  </span>
                  <span className="text-xs text-zinc-300 ml-1.5">{roll.label}</span>
                  <span className="text-[10px] font-mono text-zinc-500 ml-1.5">
                    [{roll.rolls.join(', ')}]
                  </span>
                </div>
                <span className="text-sm font-extrabold font-mono text-white bg-zinc-950 px-2 py-0.5 rounded-lg border border-zinc-700">
                  {roll.total}
                </span>
              </div>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}