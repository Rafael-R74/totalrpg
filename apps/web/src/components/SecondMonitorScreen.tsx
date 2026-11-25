import { useState, useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  DiceRollResult,
  MonitorDirectorState,
  CampaignMerchant,
  StickyPostIt,
  CharacterAbility,
  ActiveCondition,
  SceneEffect,
  CharacterLivePatch,
  calculateActiveBonuses,
  ServerToClientEvents,
  ClientToServerEvents,
} from '@totalrpg/shared';
import { DMScreenCampaignData, DMScreenCharacter, fetchDMScreenData } from '../services/api';
import { CombatantEntry } from './DMScreen';
import { FloatingPostItsLayer } from './dm/NotesAndPostItsManager';
import { TempVitalBar } from './TempVitalBar';
import { useTheme } from '../theme/themeEngine';

import { Icon, stripEmoji } from './ui/Icon';
import { DiceStage } from './dice/DiceStage';
import { BACKEND_ORIGIN } from '../config';
import './monitor/monitor.css';

const monitorSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(BACKEND_ORIGIN, {
  autoConnect: false,
});

/** Dados de demonstração só em desenvolvimento (?monitorCampaignId=demo). Arquivo fora do git. */
const demoModules = import.meta.env.DEV
  ? import.meta.glob<{ buildMonitorDemo: (search: URLSearchParams) => MonitorDemo }>('./monitor/monitorDemo.ts')
  : {};
const loadDemo = demoModules['./monitor/monitorDemo.ts'];

export interface MonitorDemo {
  campaign: DMScreenCampaignData;
  director: MonitorDirectorState;
  combatants: CombatantEntry[];
  currentTurnIndex: number;
  roundNumber: number;
  merchants: CampaignMerchant[];
  rolls: DiceRollResult[];
  initiative?: Record<string, { roll: DiceRollResult; isSpinning: boolean }>;
  spotlights?: DiceRollResult[];
  batch?: {
    batchId: string;
    characterName: string;
    weaponName: string;
    attackRolls: DiceRollResult[];
    damageRolls: DiceRollResult[];
  };
}

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

/** Modo palco: tela grande e deitada, onde tudo deve caber sem rolar a página. */
const STAGE_QUERY = '(min-width: 1024px) and (min-height: 560px) and (orientation: landscape)';

/** 0 = maior … 6 = mais compacto; 2 é o tamanho natural. */
type Density = 0 | 1 | 2 | 3 | 4 | 5 | 6;
const MAX_DENSITY: Density = 6;

function getNarrativeHealthStatus(current?: number, max?: number): {
  label: string;
  tone: string;
  visualPercent: number;
  down: boolean;
} {
  if (current === undefined || max === undefined || max <= 0) {
    return { label: 'Ameaça', tone: 'var(--trpg-muted)', visualPercent: 100, down: false };
  }
  const ratio = Math.max(0, Math.min(1, current / max));
  if (current <= 0) return { label: 'Derrotado', tone: 'var(--trpg-muted-dim)', visualPercent: 0, down: true };
  if (ratio <= 0.25) return { label: 'Gravemente ferido', tone: 'var(--trpg-pv)', visualPercent: 22, down: false };
  if (ratio <= 0.5) return { label: 'Machucado', tone: 'oklch(0.72 0.16 50)', visualPercent: 48, down: false };
  if (ratio < 1) return { label: 'Ferido', tone: 'var(--trpg-gold)', visualPercent: 75, down: false };
  return { label: 'Intacto', tone: 'var(--trpg-heal)', visualPercent: 100, down: false };
}

function vitalColor(id: string, fallback?: string) {
  if (id === 'pv') return 'var(--trpg-pv)';
  if (id === 'san') return 'var(--trpg-san)';
  if (id === 'pe') return 'var(--trpg-pe)';
  return fallback || 'var(--trpg-muted)';
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/**
 * Escala da grade no modo palco: experimenta do maior (`start`) ao mais compacto e fica
 * com o primeiro que cabe na altura disponível. Mede direto no DOM (sem renderizar cada
 * degrau) e mede de novo sempre que a grade ou os cards mudam de tamanho — fontes que
 * chegam depois, PV que mudam, personagens que entram. Fora do palco a página rola.
 */
function useFitDensity(
  ref: RefObject<HTMLElement>,
  resetKey: string,
  enabled: boolean,
  start: Density = 2
): Density {
  const [density, setDensity] = useState<Density>(start);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el) return;
    let timer = 0;
    const measure = () => {
      const before = el.dataset.density;
      let chosen: Density = MAX_DENSITY;
      for (let d = start; d <= MAX_DENSITY; d++) {
        el.dataset.density = String(d);
        if (el.scrollHeight <= el.clientHeight + 1) {
          chosen = d as Density;
          break;
        }
      }
      el.dataset.density = String(chosen);
      if (before !== String(chosen)) setDensity(chosen);
    };
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, 40);
    };
    measure();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    Array.from(el.children).forEach((c) => ro.observe(c));
    const mo = new MutationObserver(() => {
      Array.from(el.children).forEach((c) => ro.observe(c));
      schedule();
    });
    mo.observe(el, { childList: true });
    document.fonts?.ready.then(schedule).catch(() => {});
    return () => {
      window.clearTimeout(timer);
      ro.disconnect();
      mo.disconnect();
    };
  }, [resetKey, enabled, start]);
  return enabled ? density : 2;
}

function MonitorPortrait({ url, name, fallbackIcon }: { url?: string | null; name: string; fallbackIcon?: 'ghost' }) {
  if (url) return <img src={url} alt="" className="mon-portrait" />;
  if (fallbackIcon) {
    return (
      <div className="mon-portrait" aria-hidden>
        <Icon name={fallbackIcon} />
      </div>
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <div className="mon-portrait" aria-hidden>
      <span className="mon-portrait-initials">{initials}</span>
    </div>
  );
}

export function SecondMonitorScreen({ campaignId }: SecondMonitorScreenProps) {
  const { setActiveSystem } = useTheme();
  const [campaign, setCampaign] = useState<DMScreenCampaignData | null>(null);
  const [director, setDirector] = useState<MonitorDirectorState>(DEFAULT_DIRECTOR);
  const [combatants, setCombatants] = useState<CombatantEntry[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [merchants, setMerchants] = useState<CampaignMerchant[]>([]);
  const [allPostIts, setAllPostIts] = useState<StickyPostIt[]>([]);

  const [publicRolls, setPublicRolls] = useState<DiceRollResult[]>([]);
  // Rolagens em destaque: várias ao mesmo tempo ficam lado a lado, cada uma some no seu tempo.
  const [spotlightRolls, setSpotlightRolls] = useState<DiceRollResult[]>([]);

  const [isInitiativeModalOpen, setIsInitiativeModalOpen] = useState(false);
  const [initiativeEntries, setInitiativeEntries] = useState<
    Record<string, { roll: DiceRollResult; isSpinning: boolean }>
  >({});
  const [allRevealedCountdown, setAllRevealedCountdown] = useState<boolean>(false);

  const [batchSpotlight, setBatchSpotlight] = useState<{
    batchId: string;
    characterName: string;
    weaponName: string;
    attackRolls: DiceRollResult[];
    damageRolls: DiceRollResult[];
  } | null>(null);
  const [spinningBatchRollIds, setSpinningBatchRollIds] = useState<Record<string, boolean>>({});
  const batchCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recentLivePatchedCharsRef = useRef<Record<string, number>>({});
  const recentBatchPatchAtRef = useRef<number>(0);
  const fetchDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const partyGridRef = useRef<HTMLDivElement | null>(null);
  const threatsGridRef = useRef<HTMLDivElement | null>(null);
  const shopGridRef = useRef<HTMLDivElement | null>(null);
  const railTrackRef = useRef<HTMLDivElement | null>(null);
  const railPositionedRef = useRef(false);
  const [viewportTick, setViewportTick] = useState(0);
  const stageMode = useMediaQuery(STAGE_QUERY);
  const isNarrow = useMediaQuery('(max-width: 639px)');

  async function fetchCharactersOnly() {
    try {
      const data = await fetchDMScreenData(campaignId);
      setCampaign(data);
    } catch (err) {
      console.error('Erro ao buscar personagens no 2º Monitor:', err);
    }
  }

  useEffect(() => {
    if (campaign?.system) {
      setActiveSystem(campaign.system);
    }
    return () => {
      setActiveSystem(null);
    };
  }, [campaign?.system, setActiveSystem]);

  useEffect(() => {
    function handleResize() {
      setViewportTick((t) => t + 1);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Demonstração local (sem servidor): só em desenvolvimento.
    if (campaignId === 'demo' && loadDemo) {
      loadDemo().then(({ buildMonitorDemo }) => {
        const demo = buildMonitorDemo(new URLSearchParams(window.location.search));
        setCampaign(demo.campaign);
        setDirector(demo.director);
        setCombatants(demo.combatants);
        setCurrentTurnIndex(demo.currentTurnIndex);
        setRoundNumber(demo.roundNumber);
        setMerchants(demo.merchants);
        setPublicRolls(demo.rolls);
        if (demo.initiative) {
          setInitiativeEntries(demo.initiative);
          setIsInitiativeModalOpen(true);
        }
        if (demo.batch) setBatchSpotlight(demo.batch);
        if (demo.spotlights) setSpotlightRolls(demo.spotlights);
      });
      return;
    }

    async function initialHydrate() {
      try {
        const data = await fetchDMScreenData(campaignId);
        setCampaign(data);

        if (data.combatState) {
          setCombatants(Array.isArray(data.combatState.combatants) ? data.combatState.combatants : []);
          setCurrentTurnIndex(
            typeof data.combatState.currentTurnIndex === 'number' ? data.combatState.currentTurnIndex : 0
          );
          setRoundNumber(typeof data.combatState.roundNumber === 'number' ? data.combatState.roundNumber : 1);
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

    function applySinglePatchToCampaign(
      prev: DMScreenCampaignData | null,
      patch: CharacterLivePatch
    ): DMScreenCampaignData | null {
      if (!prev) return prev;
      let matched = false;
      const nextCharacters = prev.characters.map((ch) => {
        if (ch.id !== patch.characterId) return ch;
        matched = true;
        const prevRaw = (ch.sheetData || {}) as Record<string, any>;
        const nextRaw: Record<string, any> = { ...prevRaw };
        if (patch.tempHp !== undefined) nextRaw.tempHp = patch.tempHp;
        if (patch.tempHpMax !== undefined) nextRaw.tempHpMax = patch.tempHpMax;
        if (patch.tempPe !== undefined) nextRaw.tempPe = patch.tempPe;
        if (patch.tempPeMax !== undefined) nextRaw.tempPeMax = patch.tempPeMax;
        if (patch.conditions !== undefined) nextRaw.conditions = patch.conditions;
        if (patch.sceneEffects !== undefined) nextRaw.sceneEffects = patch.sceneEffects;
        if (patch.pendingInterlude !== undefined) nextRaw.pendingInterlude = patch.pendingInterlude;

        return {
          ...ch,
          vitals: patch.vitals ?? ch.vitals,
          inventory: patch.inventory ?? ch.inventory,
          sheetData: nextRaw,
        };
      });
      return matched ? { ...prev, characters: nextCharacters } : prev;
    }

    if (!monitorSocket.connected) monitorSocket.connect();
    const joinSession = () => monitorSocket.emit('session:join', { campaignId, role: 'monitor' });
    joinSession();
    // Se a conexão cair e voltar, entra de novo na sala da mesa.
    monitorSocket.io.on('reconnect', joinSession);

    monitorSocket.on('character:patched', (patch) => {
      if (!patch || patch.campaignId !== campaignId) return;
      recentLivePatchedCharsRef.current[patch.characterId] = Date.now();
      setCampaign((prev) => applySinglePatchToCampaign(prev, patch));
    });

    monitorSocket.on('characters:batchPatched', ({ campaignId: cId, patches }) => {
      if (cId !== campaignId || !Array.isArray(patches)) return;
      const now = Date.now();
      recentBatchPatchAtRef.current = now;
      for (const p of patches) {
        recentLivePatchedCharsRef.current[p.characterId] = now;
      }
      setCampaign((prev) => {
        let acc = prev;
        for (const p of patches) {
          acc = applySinglePatchToCampaign(acc, p);
        }
        return acc;
      });
    });

    monitorSocket.on('character:updated', ({ characterId }) => {
      const now = Date.now();
      if (characterId === 'ALL' && now - recentBatchPatchAtRef.current < 2200) {
        return;
      }
      if (
        characterId &&
        characterId !== 'ALL' &&
        now - (recentLivePatchedCharsRef.current[characterId] || 0) < 2200
      ) {
        return;
      }
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
      }
      fetchDebounceTimerRef.current = setTimeout(() => {
        fetchDebounceTimerRef.current = null;
        fetchCharactersOnly();
      }, 180);
    });

    monitorSocket.on(
      'monitor:updated',
      ({ director: nextDirector, combatState, merchants: nextMerchants, postIts: nextPostIts }) => {
        setDirector(nextDirector);
        setCombatants(Array.isArray(combatState.combatants) ? combatState.combatants : []);
        setCurrentTurnIndex(typeof combatState.currentTurnIndex === 'number' ? combatState.currentTurnIndex : 0);
        setRoundNumber(typeof combatState.roundNumber === 'number' ? combatState.roundNumber : 1);
        if (Array.isArray(nextMerchants)) setMerchants(nextMerchants);
        if (Array.isArray(nextPostIts)) setAllPostIts(nextPostIts);
      }
    );

    monitorSocket.on('combat:initiativeRequested', () => {
      setSpotlightRolls([]);
      setBatchSpotlight(null);
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

        // Os dados do card avisam quando pararam (onSettled); isto é só uma rede de segurança.
        setTimeout(() => settleInitiative(charId, newRoll.id), 7000);
        return;
      }

      if (newRoll.batchId) {
        setSpotlightRolls([]);
        setSpinningBatchRollIds((prev) => ({ ...prev, [newRoll.id]: true }));
        setTimeout(() => {
          setSpinningBatchRollIds((prev) => {
            const next = { ...prev };
            delete next[newRoll.id];
            return next;
          });
        }, 700);

        setBatchSpotlight((prev) => {
          const isDamage = newRoll.batchRole === 'segurar_gatilho_damage';
          const upsert = (arr: DiceRollResult[]) => {
            const idx = arr.findIndex((r) => r.id === newRoll.id);
            if (idx >= 0) {
              const copy = [...arr];
              copy[idx] = newRoll;
              return copy;
            }
            return [...arr, newRoll];
          };

          if (prev && prev.batchId === newRoll.batchId) {
            return {
              ...prev,
              attackRolls: isDamage ? prev.attackRolls : upsert(prev.attackRolls),
              damageRolls: isDamage ? upsert(prev.damageRolls) : prev.damageRolls,
            };
          }

          return {
            batchId: newRoll.batchId!,
            characterName: newRoll.characterName,
            weaponName: newRoll.attackDamagePayload?.weaponName || newRoll.label,
            attackRolls: isDamage ? [] : [newRoll],
            damageRolls: isDamage ? [newRoll] : [],
          };
        });

        if (batchCloseTimerRef.current) {
          clearTimeout(batchCloseTimerRef.current);
        }
        const closeDelay = newRoll.batchRole === 'segurar_gatilho_damage' ? 7500 : 12000;
        batchCloseTimerRef.current = setTimeout(() => {
          setBatchSpotlight(null);
        }, closeDelay);
        return;
      }

      setBatchSpotlight(null);
      showSpotlight(newRoll);
    });

    return () => {
      if (batchCloseTimerRef.current) {
        clearTimeout(batchCloseTimerRef.current);
      }
      if (fetchDebounceTimerRef.current) {
        clearTimeout(fetchDebounceTimerRef.current);
      }
      monitorSocket.io.off('reconnect', joinSession);
      monitorSocket.off('character:patched');
      monitorSocket.off('characters:batchPatched');
      monitorSocket.off('character:updated');
      monitorSocket.off('monitor:updated');
      monitorSocket.off('combat:initiativeRequested');
      monitorSocket.off('dice:rolled');
    };
  }, [campaignId]);

  const activeMerchant = merchants.find((m) => m.id === director.activeMerchantId) || null;
  const showTurnRail = director.showCombatTracker && combatants.length > 0;
  const activeThreatsInCombat = combatants.filter((c) => c.isNPC);
  const showThreatsBlock = director.showCombatTracker && activeThreatsInCombat.length > 0;
  const hasSide = Boolean(activeMerchant) || showThreatsBlock;
  const activeTurnCombatant = showTurnRail ? combatants[currentTurnIndex] : undefined;

  const layoutKey = `${viewportTick}|${hasSide}|${showTurnRail}|${director.sceneSubtitle ? 1 : 0}`;
  const partyDensity = useFitDensity(
    partyGridRef,
    `${layoutKey}|${campaign?.characters.length ?? 0}`,
    stageMode,
    0
  );
  const threatDensity = useFitDensity(
    threatsGridRef,
    `${layoutKey}|${activeThreatsInCombat.length}|${activeMerchant?.id ?? ''}`,
    stageMode
  );
  const shopDensity = useFitDensity(
    shopGridRef,
    `${layoutKey}|${activeMerchant?.id ?? ''}|${activeMerchant?.stock.length ?? 0}|${showThreatsBlock}`,
    stageMode
  );

  // A faixa de turnos acompanha quem está agindo.
  useEffect(() => {
    const track = railTrackRef.current;
    if (!track) return;
    const active = track.querySelector<HTMLElement>('[data-turn="true"]');
    if (!active) return;
    const target = active.offsetLeft - track.clientWidth / 2 + active.offsetWidth / 2;
    // Primeira vez: posiciona direto; depois, desliza até o próximo turno.
    track.scrollTo({ left: Math.max(0, target), behavior: railPositionedRef.current ? 'smooth' : 'auto' });
    railPositionedRef.current = true;
  }, [currentTurnIndex, combatants.length, viewportTick, campaign !== null]);

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

  // O holofote some sozinho alguns segundos depois que o total aparece (ver onSettled do DiceStage).
  const spotlightTimers = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const timers = spotlightTimers.current;
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
  /** Até 4 rolagens em destaque; a mais antiga sai se chegar uma quinta. */
  function showSpotlight(roll: DiceRollResult) {
    setSpotlightRolls((prev) => [...prev.filter((r) => r.id !== roll.id), roll].slice(-4));
  }
  function removeSpotlight(rollId: string) {
    window.clearTimeout(spotlightTimers.current.get(rollId));
    spotlightTimers.current.delete(rollId);
    setSpotlightRolls((prev) => prev.filter((r) => r.id !== rollId));
  }
  function clearSpotlights() {
    spotlightTimers.current.forEach((t) => window.clearTimeout(t));
    spotlightTimers.current.clear();
    setSpotlightRolls([]);
  }
  function handleSpotlightSettled(rollId: string) {
    window.clearTimeout(spotlightTimers.current.get(rollId));
    spotlightTimers.current.set(
      rollId,
      window.setTimeout(() => removeSpotlight(rollId), 3800)
    );
  }
  function settleInitiative(charId: string, rollId: string) {
    setInitiativeEntries((prev) => {
      const entry = prev[charId];
      if (!entry || entry.roll.id !== rollId || !entry.isSpinning) return prev;
      return { ...prev, [charId]: { ...entry, isSpinning: false } };
    });
  }

  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  if (!campaign) {
    return <div className="mon-loading">Conectando à mesa…</div>;
  }

  const monitorPostIts = allPostIts.filter((p) => p.sharedOnMonitor).map((p) => ({ ...p, isPinned: true }));
  const defaultCurrency = campaign.system === 'ordem-paranormal' ? 'Cat.' : 'T$';
  const systemName =
    campaign.system === 'ordem-paranormal' ? 'Ordem Paranormal' : campaign.system === 'tormenta20' ? 'Tormenta 20' : 'Duna';
  const sceneTitle = director.sceneTitle || campaign.name;

  return (
    <div
      className="mon-root"
      style={
        director.backgroundUrl
          ? {
              backgroundImage: `linear-gradient(to bottom, rgb(9 9 11 / 0.84), rgb(9 9 11 / 0.95)), url(${director.backgroundUrl})`,
            }
          : undefined
      }
    >
      {/* Post-its marcados para o 2º monitor */}
      <FloatingPostItsLayer
        postIts={monitorPostIts}
        isDMView={false}
        onUpdatePostIt={(updated) => setAllPostIts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
        onClosePlayerPostIt={(id) =>
          setAllPostIts((prev) => prev.map((p) => (p.id === id ? { ...p, sharedOnMonitor: false } : p)))
        }
      />

      {isInitiativeModalOpen && (
        <InitiativeOverlay
          characters={campaign.characters}
          entries={initiativeEntries}
          allRevealed={allRevealedCountdown}
          onSettled={settleInitiative}
          onClose={() => setIsInitiativeModalOpen(false)}
        />
      )}

      {director.activeProjection && !isInitiativeModalOpen && (() => {
        const proj = director.activeProjection;
        // Imagem sem título: projeta a imagem pura, sem moldura nem textos.
        if (!proj.title?.trim() && proj.imageUrl) {
          return (
            <div className="mon-overlay is-projection is-bare">
              <img src={proj.imageUrl} alt="" className="mon-projection-bare" />
            </div>
          );
        }
        return (
          <div className="mon-overlay is-projection">
            <div className="mon-sheet is-narrow" role="dialog" aria-label={proj.title || 'Projeção'}>
              {proj.title?.trim() && (
                <div className="mon-sheet-head">
                  <p>{proj.subtitle || 'Em exibição pelo mestre'}</p>
                  <h2>{proj.title}</h2>
                </div>
              )}
              {proj.imageUrl && <img src={proj.imageUrl} alt="" className="mon-projection-img" />}
              {proj.description && <p className="mon-projection-text">{proj.description}</p>}
            </div>
          </div>
        );
      })()}

      {spotlightRolls.length > 0 && !isInitiativeModalOpen && (
        <div className="mon-overlay" onClick={clearSpotlights}>
          <div className="mon-spotlights" data-count={spotlightRolls.length}>
            {spotlightRolls.map((roll) => (
              <div
                key={roll.id}
                className="mon-sheet is-narrow is-spotlight"
                role="dialog"
                aria-label={`${roll.characterName}: ${stripEmoji(roll.label)}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mon-sheet-head">
                  <p>{roll.characterName}</p>
                  <h2>{stripEmoji(roll.label)}</h2>
                  <p className="trpg-num">{roll.formula}</p>
                </div>
                <DiceStage
                  roll={roll}
                  size={isNarrow && spotlightRolls.length > 1 ? 'modal' : 'tv'}
                  className="w-full"
                  onSettled={() => handleSpotlightSettled(roll.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {batchSpotlight && !isInitiativeModalOpen && (
        <BatchOverlay batch={batchSpotlight} spinning={spinningBatchRollIds} onClose={() => setBatchSpotlight(null)} />
      )}

      {/* Cabeçalho: cena + faixa de turnos */}
      <header className="mon-head">
        <div className="mon-head-top">
          <div className="mon-scene">
            <p className="mon-system">{systemName}</p>
            <h1 className="mon-title">{sceneTitle}</h1>
            {director.sceneSubtitle && <p className="mon-subtitle">{director.sceneSubtitle}</p>}
          </div>
          <button
            type="button"
            onClick={toggleFullScreen}
            className="trpg-icon-btn mon-fs-btn"
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            <Icon name={isFullscreen ? 'x' : 'tv'} />
          </button>
        </div>

        {showTurnRail && (
          <div className="mon-rail" aria-label="Ordem de turnos">
            <div className="mon-round">
              <small>Rodada</small>
              <strong>{roundNumber}</strong>
            </div>
            <div ref={railTrackRef} className="mon-rail-track mon-scroll-x">
              {combatants.map((c, index) => {
                const isTurn = index === currentTurnIndex;
                const matched = !c.isNPC ? campaign.characters.find((ch) => ch.id === c.characterId) : undefined;
                const avatarUrl = c.imageUrl || matched?.portraitUrl;
                const narrative = getNarrativeHealthStatus(c.hpCurrent, c.hpMax);
                let sub: string | null = null;
                if (isTurn) sub = 'Agindo agora';
                else if (c.isNPC) {
                  if (director.enemyHpVisibility === 'narrative') sub = narrative.label;
                  else if (director.enemyHpVisibility === 'exact' && c.hpCurrent !== undefined && c.hpMax !== undefined)
                    sub = `${c.hpCurrent}/${c.hpMax} PV`;
                } else if (matched) sub = `@${matched.owner.username}`;
                return (
                  <div
                    key={c.id}
                    data-turn={isTurn}
                    aria-current={isTurn ? 'step' : undefined}
                    className={`mon-rail-item ${c.isNPC ? 'is-npc' : ''} ${isTurn ? 'is-turn' : ''} ${
                      index < currentTurnIndex ? 'is-past' : ''
                    }`}
                    style={c.isNPC && !isTurn && director.enemyHpVisibility === 'narrative' ? ({ '--mon-tone': narrative.tone } as React.CSSProperties) : undefined}
                  >
                    <span className="mon-rail-init" title="Iniciativa">
                      {c.initiative}
                    </span>
                    {avatarUrl && <img src={avatarUrl} alt="" className="mon-rail-avatar" />}
                    <span className="mon-rail-text">
                      <span className="mon-rail-name">{c.name}</span>
                      {sub && <span className="mon-rail-sub">{sub}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Palco */}
      <main className={`mon-stage ${hasSide ? 'has-side' : ''}`}>
        <section className="mon-panel" aria-label="Personagens">
          {campaign.characters.length === 0 ? (
            <p className="mon-empty">Nenhum personagem nesta mesa ainda.</p>
          ) : (
            <div ref={partyGridRef} className="mon-grid mon-fit" data-density={partyDensity}>
              {campaign.characters.map((char) => (
                <PartyCard
                  key={char.id}
                  char={char}
                  isTurn={Boolean(activeTurnCombatant && activeTurnCombatant.characterId === char.id)}
                  compact={partyDensity >= 4}
                />
              ))}
            </div>
          )}
        </section>

        {hasSide && (
          <div className="mon-side">
            {showThreatsBlock && (
              <section className="mon-panel is-threats-panel" aria-label="Ameaças em combate">
                <div className="mon-panel-head">
                  <h2>Ameaças</h2>
                  <span className="mon-count">{activeThreatsInCombat.length}</span>
                </div>
                <div ref={threatsGridRef} className="mon-grid is-threats mon-fit" data-density={threatDensity}>
                  {activeThreatsInCombat.map((threat) => {
                    const isTurn = activeTurnCombatant?.id === threat.id;
                    const narrative = getNarrativeHealthStatus(threat.hpCurrent, threat.hpMax);
                    const exactPct =
                      threat.hpCurrent !== undefined && threat.hpMax
                        ? Math.max(0, Math.min(100, (threat.hpCurrent / threat.hpMax) * 100))
                        : 100;
                    const showExact =
                      director.enemyHpVisibility === 'exact' && threat.hpCurrent !== undefined && threat.hpMax !== undefined;
                    return (
                      <article
                        key={threat.id}
                        className={`mon-threat ${isTurn ? 'is-turn' : ''} ${narrative.down ? 'is-down' : ''}`}
                        style={{ '--mon-tone': narrative.tone } as React.CSSProperties}
                      >
                        <div className="mon-card-id">
                          <MonitorPortrait url={threat.imageUrl} name={threat.name} fallbackIcon="ghost" />
                          <div>
                            {isTurn && <span className="mon-turn-tag">Vez dela</span>}
                            <h3 className="mon-threat-name">{threat.name}</h3>
                            {director.enemyHpVisibility !== 'hidden' && (
                              <p className="mon-threat-state">
                                {showExact ? `${threat.hpCurrent} / ${threat.hpMax} PV` : narrative.label}
                              </p>
                            )}
                          </div>
                        </div>
                        {director.enemyHpVisibility !== 'hidden' && (
                          <div className="trpg-meter" aria-hidden>
                            <div
                              className="trpg-meter-fill"
                              style={{
                                width: `${showExact ? exactPct : narrative.visualPercent}%`,
                                background: showExact ? 'var(--trpg-pv)' : narrative.tone,
                              }}
                            />
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {activeMerchant && (
              <section className="mon-panel" aria-label={`Loja: ${activeMerchant.name}`}>
                <div className="mon-panel-head">
                  <h2>
                    <Icon name="store" /> {activeMerchant.name}
                  </h2>
                  <span className="mon-count">
                    {activeMerchant.stock.length} {activeMerchant.stock.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                {activeMerchant.description && <p className="mon-shop-desc">{activeMerchant.description}</p>}
                {activeMerchant.stock.length === 0 ? (
                  <p className="mon-empty">O catálogo desta loja está vazio no momento.</p>
                ) : (
                  <div ref={shopGridRef} className="mon-grid is-shop mon-fit" data-density={shopDensity}>
                    {activeMerchant.stock.map((st) => {
                      const isWeapon = Boolean(st.attack);
                      return (
                        <article key={st.id} className="mon-item">
                          {st.item.imageUrl ? (
                            <img src={st.item.imageUrl} alt="" className="mon-item-thumb" />
                          ) : (
                            <div className={`mon-item-thumb ${isWeapon ? 'is-weapon' : ''}`} aria-hidden>
                              <Icon name={isWeapon ? 'swords' : 'backpack'} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="mon-item-name">{st.item.name}</h3>
                            <p className="mon-item-meta">
                              {st.attack
                                ? `Dano ${st.attack.damageFormula}, crítico ${st.attack.critRange}`
                                : 'Equipamento'}
                              {typeof st.item.slots === 'number' ? `, ${st.item.slots} esp.` : ''}
                            </p>
                          </div>
                          <p className="mon-item-price">
                            {st.price}
                            <small>{st.currency || defaultCurrency}</small>
                          </p>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>

      {/* Rodapé: últimas rolagens públicas */}
      <footer className="mon-ticker">
        <span className="mon-ticker-label">
          <Icon name="d20" /> Últimas rolagens
        </span>
        {publicRolls.length === 0 ? (
          <span className="mon-ticker-empty">As rolagens públicas da mesa aparecem aqui.</span>
        ) : (
          <div className="mon-ticker-list mon-scroll-x">
            {publicRolls.map((roll) => (
              <button key={roll.id} type="button" onClick={() => showSpotlight(roll)} className="mon-roll">
                <span className="mon-roll-text">
                  <b>{roll.characterName}</b>
                  <span>{stripEmoji(roll.label)}</span>
                </span>
                <span className="mon-roll-total">{roll.total}</span>
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}

function PartyCard({ char, isTurn, compact }: { char: DMScreenCharacter; isTurn: boolean; compact: boolean }) {
  const raw = (char.sheetData || {}) as Record<string, any>;
  const abilities: CharacterAbility[] = Array.isArray(raw.abilities) ? raw.abilities : [];
  const conditions: ActiveCondition[] = Array.isArray(raw.conditions) ? raw.conditions : [];
  const levelOrNex = char.system === 'ordem-paranormal' ? Number(raw.nex ?? 5) : Number(raw.level ?? 1);

  const bonuses = calculateActiveBonuses(
    char.system,
    levelOrNex,
    abilities,
    char.inventory || [],
    conditions,
    Array.isArray(raw.sceneEffects) ? (raw.sceneEffects as SceneEffect[]) : []
  );

  const pvBar = char.vitals.find((b) => b.id === 'pv');
  const pvMax = pvBar ? Math.max(1, pvBar.max + (bonuses.vitalMax['pv'] || 0)) : 1;
  const pvCurrent = pvBar ? pvBar.current : 1;
  const isDying = pvCurrent <= 0;
  const isBloodied = !isDying && pvCurrent <= pvMax / 2;

  const meta =
    char.system === 'ordem-paranormal'
      ? `${raw.characterClass || 'Combatente'}, NEX ${levelOrNex}%`
      : `${raw.race || 'Humano'} ${raw.characterClass || 'Guerreiro'}, nível ${levelOrNex}`;

  return (
    <article
      className={`mon-card ${isTurn ? 'is-turn' : ''} ${isDying ? 'is-dying' : isBloodied ? 'is-bloodied' : ''}`}
    >
      <div className="mon-card-id">
        <MonitorPortrait url={char.portraitUrl} name={char.name} />
        <div>
          {isTurn && <span className="mon-turn-tag">Vez de agir</span>}
          <h3 className="mon-card-name">{char.name}</h3>
          <p className="mon-card-meta">{meta}</p>
          {!compact && <p className="mon-card-meta">@{char.owner.username}</p>}
        </div>
      </div>

      <div className="mon-vitals">
        {char.vitals.map((bar) => {
          const effectiveMax = Math.max(1, bar.max + (bonuses.vitalMax[bar.id] || 0));
          const pct = Math.max(0, Math.min(100, (bar.current / effectiveMax) * 100));
          const tempAmount = bar.id === 'pv' ? Number(raw.tempHp || 0) : bar.id === 'pe' ? Number(raw.tempPe || 0) : 0;
          const tempMax = bar.id === 'pv' ? Number(raw.tempHpMax || 0) : bar.id === 'pe' ? Number(raw.tempPeMax || 0) : 0;
          return (
            <div key={bar.id} className="mon-vital">
              <span className="mon-vital-label" title={bar.label}>
                {bar.id === 'pv' || bar.id === 'pe' || bar.id === 'san' ? bar.id.toUpperCase() : bar.label}
              </span>
              <div
                className="trpg-meter"
                role="meter"
                aria-label={bar.label}
                aria-valuemin={0}
                aria-valuemax={effectiveMax}
                aria-valuenow={bar.current}
              >
                <div className="trpg-meter-fill" style={{ width: `${pct}%`, background: vitalColor(bar.id, bar.color) }} />
              </div>
              <span className="mon-vital-value">
                <strong>{bar.current}</strong>
                <span> / {effectiveMax}</span>
              </span>
              {(bar.id === 'pv' || bar.id === 'pe') && tempAmount > 0 && (
                <div className="mon-vital-temp">
                  <TempVitalBar current={tempAmount} max={tempMax} barId={bar.id} size="xs" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(isDying || isBloodied || conditions.length > 0) && (
        <div className="mon-chips">
          {isDying && (
            <span className="mon-chip is-critical">
              <Icon name="skull" /> Morrendo
            </span>
          )}
          {isBloodied && <span className="mon-chip is-danger">Machucado</span>}
          {conditions.map((cond) => (
            <span key={cond.id} className="mon-chip" title={cond.name}>
              {cond.name}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

function InitiativeOverlay({
  characters,
  entries,
  allRevealed,
  onSettled,
  onClose,
}: {
  characters: DMScreenCharacter[];
  entries: Record<string, { roll: DiceRollResult; isSpinning: boolean }>;
  allRevealed: boolean;
  onSettled: (charId: string, rollId: string) => void;
  onClose: () => void;
}) {
  // Muitos jogadores: dados 2D para não abrir dezenas de cenas 3D ao mesmo tempo.
  const force2D = characters.length > 6;
  return (
    <div className="mon-overlay" onClick={onClose}>
      <div className="mon-sheet" role="dialog" aria-label="Iniciativa" onClick={(e) => e.stopPropagation()}>
        <div className="mon-sheet-head">
          <p>
            <Icon name="swords" /> Combate iniciado
          </p>
          <h2>{allRevealed ? 'Ordem definida. Preparando os turnos.' : 'Rolem a iniciativa'}</h2>
        </div>
        <div className="mon-tiles is-initiative">
          {characters.map((char) => {
            const entry = entries[char.id];
            const state = !entry ? 'is-waiting' : entry.isSpinning ? 'is-rolling' : 'is-done';
            return (
              <div key={char.id} className={`mon-tile ${state}`}>
                <MonitorPortrait url={char.portraitUrl} name={char.name} />
                <div>
                  <p className="mon-tile-name">{char.name}</p>
                  <p className="mon-tile-sub">@{char.owner.username}</p>
                </div>
                {!entry ? (
                  <span className="mon-tile-wait">
                    <Icon name="hourglass" /> Aguardando
                  </span>
                ) : (
                  // Mesma animação de dados dos testes, em tamanho de card.
                  <DiceStage
                    key={entry.roll.id}
                    roll={entry.roll}
                    size="tile"
                    force2D={force2D}
                    className="w-full"
                    onSettled={() => onSettled(char.id, entry.roll.id)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BatchOverlay({
  batch,
  spinning,
  onClose,
}: {
  batch: {
    characterName: string;
    weaponName: string;
    attackRolls: DiceRollResult[];
    damageRolls: DiceRollResult[];
  };
  spinning: Record<string, boolean>;
  onClose: () => void;
}) {
  const isDamagePhase = batch.damageRolls.length > 0;
  const rollsToShow = isDamagePhase ? batch.damageRolls : batch.attackRolls;
  const totalDamageSum = batch.damageRolls.reduce((acc, r) => acc + r.total, 0);

  return (
    <div className="mon-overlay" onClick={onClose}>
      <div className="mon-sheet" role="dialog" aria-label={batch.weaponName} onClick={(e) => e.stopPropagation()}>
        <div className="mon-sheet-head">
          <p>
            {isDamagePhase ? 'Dano' : 'Sequência de disparos'} de {batch.characterName}
          </p>
          <h2>{batch.weaponName}</h2>
        </div>
        <div className="mon-tiles">
          {rollsToShow.map((r, idx) => {
            const isSpinning = Boolean(spinning[r.id]);
            const shotNum = r.batchShotNumber || idx + 1;
            const isZeroPenalty = r.formula.includes('2d20 (menor)');
            const keptNatural = isZeroPenalty ? Math.min(...r.rolls) : Math.max(...r.rolls);
            const isCrit = isDamagePhase
              ? Boolean(r.batchIsCrit)
              : Boolean(r.attackDamagePayload && keptNatural >= r.attackDamagePayload.critThreatMin);
            return (
              <div
                key={r.id}
                className={`mon-tile ${isSpinning ? 'is-rolling' : isCrit ? 'is-crit' : 'is-done'}`}
              >
                <p className="mon-tile-name">{shotNum}º disparo</p>
                {isSpinning ? (
                  <span className="mon-tile-wait is-rolling">
                    <Icon name="d20" /> Rolando
                  </span>
                ) : (
                  <>
                    <span className="mon-tile-tag">{isCrit ? 'Crítico' : isDamagePhase ? 'Dano' : 'Ataque'}</span>
                    <span className="mon-tile-total">{r.total}</span>
                    <span className="mon-tile-sub">
                      {r.formula}: {r.rolls.join(', ')}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {isDamagePhase && (
          <div className="mon-sum">
            <div>
              <p>
                Soma de {batch.damageRolls.length} {batch.damageRolls.length === 1 ? 'disparo' : 'disparos'}
              </p>
              <p>{batch.damageRolls.map((d) => d.total).join(' + ')}</p>
            </div>
            <strong aria-label={`Dano total ${totalDamageSum}`}>{totalDamageSum}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
