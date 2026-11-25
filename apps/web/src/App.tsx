import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { LandingPage } from './components/LandingPage';
import { Dashboard, DashboardTabId } from './components/Dashboard';
import { SheetContainer } from './components/sheets/SheetContainer';
import { DMScreen } from './components/DMScreen';
import { DiceRollModal } from './components/DiceRollModal';
import { LootReceivedModal } from './components/LootReceivedModal';
import { FloatingPostItsLayer } from './components/dm/NotesAndPostItsManager';
import { AppHeader } from './components/AppHeader';
import { Dialog } from './components/ui/Dialog';
import { preloadDiceScene } from './components/dice/DiceStage';

// Bancada de dados (?diceLab): arquivo local, fora do Git. Se não existir, o glob volta vazio.
const diceLabModules = import.meta.glob<{ DiceLab: React.ComponentType }>('./components/dice/DiceLab.tsx');
const diceLabLoader = Object.values(diceLabModules)[0];
const DiceLab = diceLabLoader ? lazy(() => diceLabLoader().then((m) => ({ default: m.DiceLab }))) : null;
import { UserSettingsPanel } from './components/UserSettingsPanel';
import { ThemeProvider, useTheme } from './theme/themeEngine';
import {
  AuthResponse,
  fetchContentPack,
  fetchCurrentUser,
  fetchPlatformStatus,
} from './services/api';
import { io, Socket } from 'socket.io-client';
import { SecondMonitorScreen } from './components/SecondMonitorScreen';
import {
  SystemId,
  DiceRollResult,
  AttackDamageRollPayload,
  ForcaOpressoraRollPayload,
  CursePricePrompt,
  RitualEffectRollPayload,
  SheetPermissions,
  StickyPostIt,
  RPGItem,
  PreparedAttack,
  ServerToClientEvents,
  ClientToServerEvents,
  applyContentPack,
  SessionActivityLogEntry,
  CharacterLivePatch,
  PresenceViewId,
  PublicPlatformStatus,
} from '@totalrpg/shared';
import { BACKEND_ORIGIN } from './config';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(BACKEND_ORIGIN, {
  auth: () => ({
    token: localStorage.getItem('totalrpg_token') || undefined,
  }),
});

function ActiveSystemBridge({
  system,
  view,
  contextLabel,
  userKey,
}: {
  system: SystemId | null;
  view: PresenceViewId;
  contextLabel?: string;
  userKey?: string | null;
}) {
  const { setActiveSystem, effectivePalette, effectiveArtDirection, preferences } = useTheme();

  useEffect(() => {
    setActiveSystem(system);
  }, [system, setActiveSystem]);

  useEffect(() => {
    const emitPresence = () => {
      socket.emit('presence:update', {
        token: localStorage.getItem('totalrpg_token') || null,
        view,
        contextLabel,
        system,
        palette: effectivePalette,
        artDirection: effectiveArtDirection,
        diceMode: preferences.dice,
      });
    };
    emitPresence();
    socket.on('connect', emitPresence);
    return () => {
      socket.off('connect', emitPresence);
    };
  }, [view, contextLabel, system, effectivePalette, effectiveArtDirection, preferences.dice, userKey]);

  return null;
}

export default function App() {
  useEffect(() => {
    preloadDiceScene();
  }, []);

  const [currentUser, setCurrentUser] = useState<{
    id: string;
    username: string;
    email: string;
    isAdmin?: boolean;
  } | null>(() => {
    const saved = localStorage.getItem('totalrpg_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [dedicatedAuthMode, setDedicatedAuthMode] = useState<'login' | 'register' | null>(null);
  const [dashboardRequestedTab, setDashboardRequestedTab] = useState<DashboardTabId | null>(null);
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const [platformStatus, setPlatformStatus] = useState<PublicPlatformStatus | null>(null);

  useEffect(() => {
    fetchPlatformStatus()
      .then((st) => setPlatformStatus(st))
      .catch(() => {});

    const onStatusUpdated = (st: PublicPlatformStatus) => {
      setPlatformStatus(st);
    };
    const onForceLogout = ({ reason }: { reason: string }) => {
      localStorage.removeItem('totalrpg_token');
      localStorage.removeItem('totalrpg_user');
      setCurrentUser(null);
      setCurrentCampaignSession(null);
      setOpenedCharacter(null);
      alert(reason || 'Sua sessão foi encerrada pelo administrador.');
    };

    socket.on('platform:statusUpdated', onStatusUpdated);
    socket.on('admin:forceLogout', onForceLogout);
    return () => {
      socket.off('platform:statusUpdated', onStatusUpdated);
      socket.off('admin:forceLogout', onForceLogout);
    };
  }, []);

  const [currentCampaignSession, setCurrentCampaignSession] = useState<{
    campaignId: string;
    role: 'dm' | 'player';
    system?: SystemId;
  } | null>(null);

  const [openedCharacter, setOpenedCharacter] = useState<{
    characterId: string;
    campaignId?: string;
    system?: SystemId;
  } | null>(null);

  const [rollHistory, setRollHistory] = useState<DiceRollResult[]>([]);
  const [activityLog, setActivityLog] = useState<SessionActivityLogEntry[]>([]);
  const [activeRollModal, setActiveRollModal] = useState<DiceRollResult | null>(null);
  const [activeBatchRolls, setActiveBatchRolls] = useState<DiceRollResult[]>([]);

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
  const [liveCombatState, setLiveCombatState] = useState<{
    combatants: any[];
    currentTurnIndex: number;
    roundNumber: number;
  } | null>(null);
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
  const sheetSpendResourceRef = useRef<((amount: number) => boolean) | null>(null);
  const [, setContentPackVersion] = useState(0);

  useEffect(() => {
    if (!currentUser?.id) return;
    let active = true;
    fetchCurrentUser()
      .then((res) => {
        if (!active || !res?.user) return;
        setCurrentUser((prev) => {
          if (!prev) return prev;
          if (
            prev.isAdmin === res.user.isAdmin &&
            prev.username === res.user.username &&
            prev.email === res.user.email
          ) {
            return prev;
          }
          const updated = { ...prev, ...res.user };
          localStorage.setItem('totalrpg_user', JSON.stringify(updated));
          return updated;
        });
      })
      .catch(() => {
        // mantém dados locais caso offline
      });
    return () => {
      active = false;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    let active = true;
    fetchContentPack()
      .then((res) => {
        if (!active) return;
        if (res.loaded && res.pack) {
          applyContentPack(res.pack);
          setContentPackVersion((v) => v + 1);
        }
      })
      .catch((err) => {
        console.warn('Não foi possível verificar Content Pack local:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  const activeRoomId =
    currentCampaignSession?.campaignId ||
    openedCharacter?.campaignId ||
    (currentUser ? `vault-${currentUser.id}` : '');

  useEffect(() => {
    if (!currentUser || !activeRoomId) return;

    function handleJoin() {
      if (!activeRoomId) return;
      socket.emit('session:join', {
        campaignId: activeRoomId,
        role: currentCampaignSession?.role || 'player',
      });
    }

    handleJoin();
    socket.on('connect', handleJoin);

    socket.on('dice:rolled', (newRoll) => {
      setRollHistory((prev) => [newRoll, ...prev]);

      if (newRoll.rollerUserId === currentUser.id) {
        if (newRoll.batchId) {
          setActiveBatchRolls((prev) => {
            if (newRoll.rerolledAfortunado) {
              const idx = prev.findIndex((r) => r.id === newRoll.id);
              if (idx >= 0) {
                const copy = [...prev];
                copy[idx] = newRoll;
                return copy;
              }
            }
            if (prev.length > 0 && prev[0].batchId === newRoll.batchId) {
              if (prev.some((r) => r.id === newRoll.id)) return prev;
              return [...prev, newRoll];
            }
            return [newRoll];
          });
          setActiveRollModal((prevModal) => {
            if (prevModal && prevModal.batchId === newRoll.batchId) {
              return prevModal.id === newRoll.id ? newRoll : prevModal;
            }
            return newRoll;
          });
        } else {
          setActiveBatchRolls([]);
          setActiveRollModal(newRoll);
        }

        if (newRoll.label.startsWith('🛡️ PV Temporários')) {
          window.dispatchEvent(
            new CustomEvent('totalrpg:grant-temp-hp', {
              detail: { characterId: newRoll.characterId, amount: newRoll.total, label: newRoll.label },
            })
          );
        }
        if (newRoll.label.startsWith('🛡️ Vida Temporária:')) {
          window.dispatchEvent(
            new CustomEvent('totalrpg:ritual-temp-hp', { detail: newRoll })
          );
        }
      }
    });

    socket.on('campaign:permissionsUpdated', (perms) => {
      setLivePermissions(perms);
    });

    socket.on('character:updated', ({ characterId }) => {
      setLastUpdatedCharSignal({ characterId, timestamp: Date.now() });
    });

    socket.on('character:patched', (patch) => {
      window.dispatchEvent(
        new CustomEvent('totalrpg:character-patched', { detail: patch })
      );
    });

    socket.on('characters:batchPatched', (payload) => {
      window.dispatchEvent(
        new CustomEvent('totalrpg:characters-batch-patched', { detail: payload })
      );
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

    socket.on('monitor:updated', ({ combatState }) => {
      if (combatState) {
        setLiveCombatState(combatState);
      }
    });

    socket.on('activity:logged', (entry) => {
      setActivityLog((prev) =>
        prev.some((e) => e.id === entry.id) ? prev : [entry, ...prev].slice(0, 250)
      );
    });

    return () => {
      socket.off('connect', handleJoin);
      socket.off('dice:rolled');
      socket.off('campaign:permissionsUpdated');
      socket.off('character:updated');
      socket.off('character:patched');
      socket.off('characters:batchPatched');
      socket.off('combat:initiativeRequested');
      socket.off('combat:initiativeSubmitted');
      socket.off('postit:received');
      socket.off('postit:dismissed');
      socket.off('item:received');
      socket.off('scene:ended');
      socket.off('monitor:updated');
      socket.off('activity:logged');
    };
  }, [currentUser, activeRoomId, currentCampaignSession, openedCharacter]);

  function handleLogout() {
    localStorage.removeItem('totalrpg_token');
    localStorage.removeItem('totalrpg_user');
    setCurrentUser(null);
    setCurrentCampaignSession(null);
    setOpenedCharacter(null);
  }

  function emitActivityLog(
    entry: Omit<SessionActivityLogEntry, 'id' | 'timestamp' | 'createdAt' | 'campaignId'> & {
      campaignId?: string;
    }
  ) {
    const targetCampId =
      entry.campaignId ||
      currentCampaignSession?.campaignId ||
      openedCharacter?.campaignId;
    if (!targetCampId) return;
    socket.emit('activity:log', {
      ...entry,
      campaignId: targetCampId,
    });
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
    characterId?: string,
    fixedRolls?: number[],
    hasAfortunado?: boolean,
    attackDamagePayload?: AttackDamageRollPayload,
    forcaOpressoraPayload?: ForcaOpressoraRollPayload,
    batchMeta?: {
      batchId: string;
      batchRole: 'segurar_gatilho_attack' | 'segurar_gatilho_damage';
      batchShotNumber: number;
      batchIsCrit?: boolean;
    },
    extraRollOpts?: {
      explodingDieSide?: number;
      extraDice?: Array<{ count: number; sides: number; label: string }>;
      cursePricePrompt?: CursePricePrompt;
    },
    hasAfortunadoAffinity?: boolean,
    ritualEffectPayload?: RitualEffectRollPayload
  ) {
    if (!activeRoomId || !currentUser) return;
    const effectiveBatchMeta =
      batchMeta ||
      (attackDamagePayload?.segurarGatilhoPayload?.enabled
        ? {
            batchId: attackDamagePayload.segurarGatilhoPayload.batchId,
            batchRole: 'segurar_gatilho_attack' as const,
            batchShotNumber: attackDamagePayload.segurarGatilhoPayload.shotIndex,
          }
        : undefined);
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
      fixedRolls,
      explodingDieSide: extraRollOpts?.explodingDieSide,
      extraDice: extraRollOpts?.extraDice,
      hasAfortunado,
      hasAfortunadoAffinity,
      attackDamagePayload,
      forcaOpressoraPayload,
      cursePricePrompt: extraRollOpts?.cursePricePrompt,
      ritualEffectPayload,
      ...(effectiveBatchMeta || {}),
    });
  }

  const activeSessionSystem: SystemId | null =
    openedCharacter?.system || currentCampaignSession?.system || null;

  if (import.meta.env.DEV && DiceLab && new URLSearchParams(window.location.search).has('diceLab')) {
    return (
      <ThemeProvider userId={currentUser?.id}>
        <Suspense fallback={null}>
          <DiceLab />
        </Suspense>
      </ThemeProvider>
    );
  }

  // Se esta janela foi aberta como Tela do 2º Monitor (?monitorCampaignId=...), renderiza em Tela Cheia Limpa!
  const monitorCampaignId = new URLSearchParams(window.location.search).get('monitorCampaignId');
  if (monitorCampaignId) {
    return (
      <ThemeProvider userId={currentUser?.id}>
        <ActiveSystemBridge
          system={null}
          view="second-monitor"
          contextLabel={`Mesa ${monitorCampaignId.slice(0, 8)}`}
          userKey={currentUser?.id}
        />
        <SecondMonitorScreen campaignId={monitorCampaignId} />
      </ThemeProvider>
    );
  }

  if (!currentUser) {
    return (
      <ThemeProvider userId={null}>
        <ActiveSystemBridge
          system={null}
          view={dedicatedAuthMode ? 'auth' : 'landing'}
          userKey="guest"
        />
        {dedicatedAuthMode ? (
          <AuthScreen
            initialMode={dedicatedAuthMode}
            platformStatus={platformStatus}
            onBackToLanding={() => setDedicatedAuthMode(null)}
            onLoginSuccess={(authData: AuthResponse) => {
              setDedicatedAuthMode(null);
              setCurrentUser(authData.user);
            }}
          />
        ) : (
          <LandingPage
            onOpenDedicatedAuth={(mode) => setDedicatedAuthMode(mode)}
            onLoginSuccess={(authData: AuthResponse) => {
              setDedicatedAuthMode(null);
              setCurrentUser(authData.user);
            }}
          />
        )}
      </ThemeProvider>
    );
  }

  const activePresenceView: PresenceViewId = openedCharacter
    ? 'sheet'
    : currentCampaignSession?.role === 'dm'
      ? 'dm-screen'
      : 'dashboard';

  const activePresenceContext = openedCharacter
    ? `Ficha #${openedCharacter.characterId.slice(0, 6)}`
    : currentCampaignSession
      ? `Campanha #${currentCampaignSession.campaignId.slice(0, 6)}`
      : undefined;

  return (
    <ThemeProvider userId={currentUser.id}>
      <ActiveSystemBridge
        system={activeSessionSystem}
        view={activePresenceView}
        contextLabel={activePresenceContext}
        userKey={currentUser.id}
      />
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <Dialog
          open={isQuickSettingsOpen}
          onClose={() => setIsQuickSettingsOpen(false)}
          title="Aparência"
          description="Paleta, tipografia e conforto visual. As mudanças são salvas na sua conta."
          size="xl"
        >
          <UserSettingsPanel currentUser={currentUser} embedded />
        </Dialog>
      <DiceRollModal
        roll={activeRollModal}
        batchRolls={activeBatchRolls}
        onClose={() => {
          setActiveRollModal(null);
          setActiveBatchRolls([]);
        }}
        onRerollOne={(rollResult, dieIndex) => {
          if (!activeRoomId) return;
          socket.emit('dice:rerollOne', {
            campaignId: activeRoomId,
            rollResult,
            dieIndex,
          });
        }}
        onTriggerSegurarGatilhoShot={(
          baseRoll,
          shotNumber,
          extraPeCost,
          aeAtkBonus,
          aeDmgBonus,
          nextStepAfterShot
        ) => {
          const sg = baseRoll.attackDamagePayload?.segurarGatilhoPayload;
          if (!sg) return false;
          if (sheetSpendResourceRef.current && !sheetSpendResourceRef.current(extraPeCost)) {
            return false;
          }
          window.dispatchEvent(
            new CustomEvent('totalrpg:sg-step', { detail: { step: nextStepAfterShot } })
          );

          const suffixParts: string[] = [`Segurar o Gatilho (${shotNumber}º Disparo)`];
          const dmgSuffixParts: string[] = [];
          if (aeAtkBonus > 0 || aeDmgBonus > 0) {
            const aeStr = [
              aeAtkBonus > 0 ? `+${aeAtkBonus} Atq` : '',
              aeDmgBonus > 0 ? `+${aeDmgBonus} Dano` : '',
            ]
              .filter(Boolean)
              .join(' / ');
            suffixParts.push(`Ataque Especial (${aeStr})`);
            if (aeDmgBonus > 0) {
              dmgSuffixParts.push(`Ataque Especial +${aeDmgBonus} Dano`);
            }
          }
          if (sg.tecnicaSecretaAttackSuffix) {
            suffixParts.push(sg.tecnicaSecretaAttackSuffix);
          }
          if (sg.tecnicaSecretaDamageSuffix) {
            dmgSuffixParts.push(sg.tecnicaSecretaDamageSuffix);
          }

          const nextAttackPayload: AttackDamageRollPayload = {
            weaponName: sg.weaponName,
            critThreatMin: sg.critThreatMin,
            critMultiplier: sg.critMultiplier,
            normalDiceCount: sg.normalDiceCount,
            critDiceCount: sg.critDiceCount,
            dieSides: sg.dieSides,
            damageModifier: sg.baseDamageModifier + aeDmgBonus,
            maximizeCritDamage: sg.maximizeCritDamage,
            damageLabelSuffix:
              dmgSuffixParts.length > 0 ? ` [${dmgSuffixParts.join(' • ')}]` : undefined,
            segurarGatilhoPayload: {
              ...sg,
              shotIndex: shotNumber,
              nextExtraShotStep: nextStepAfterShot,
            },
          };

          triggerRoll(
            baseRoll.characterName,
            baseRoll.system,
            `Acerto: ${sg.weaponName} [${suffixParts.join(' • ')}]`,
            sg.baseAttackDice,
            20,
            sg.baseAttackBonus + aeAtkBonus,
            baseRoll.isSecret,
            false,
            baseRoll.characterId,
            undefined,
            baseRoll.hasAfortunado,
            nextAttackPayload,
            undefined,
            {
              batchId: sg.batchId,
              batchRole: 'segurar_gatilho_attack',
              batchShotNumber: shotNumber,
            },
            undefined,
            baseRoll.hasAfortunadoAffinity
          );
          return true;
        }}
        onTriggerSegurarGatilhoDamageBatch={(selectedAttackRolls) => {
          selectedAttackRolls.forEach((atkRoll) => {
            const p = atkRoll.attackDamagePayload;
            if (!p) return;
            const isZeroPenalty = atkRoll.formula.includes('2d20 (menor)');
            const keptNatural = isZeroPenalty
              ? Math.min(...atkRoll.rolls)
              : Math.max(...atkRoll.rolls);
            const isCrit = keptNatural >= p.critThreatMin;
            const shotNum = atkRoll.batchShotNumber || p.segurarGatilhoPayload?.shotIndex || 1;
            const suffix = p.damageLabelSuffix || '';
            const diceCount = isCrit ? p.critDiceCount : p.normalDiceCount;
            const maxCritSuffix =
              isCrit && p.maximizeCritDamage ? ' [Atirar p/ Matar: Dano Máx.]' : '';
            const label = isCrit
              ? `Dano Crítico (${shotNum}º Disp. • x${p.critMultiplier}): ${p.weaponName}${suffix}${maxCritSuffix}`
              : `Dano (${shotNum}º Disp.): ${p.weaponName}${suffix}`;
            const fixedRolls =
              isCrit && p.maximizeCritDamage
                ? Array(Math.max(1, diceCount)).fill(p.dieSides)
                : undefined;

            triggerRoll(
              atkRoll.characterName,
              atkRoll.system,
              label,
              diceCount,
              p.dieSides,
              p.damageModifier,
              atkRoll.isSecret,
              false,
              atkRoll.characterId,
              fixedRolls,
              atkRoll.hasAfortunado,
              p,
              p.forcaOpressoraPayload,
              {
                batchId: atkRoll.batchId || p.segurarGatilhoPayload!.batchId,
                batchRole: 'segurar_gatilho_damage',
                batchShotNumber: shotNum,
                batchIsCrit: isCrit,
              },
              undefined,
              atkRoll.hasAfortunadoAffinity
            );
          });
        }}
        onRollDamage={(rollResult, isCrit) => {
          const p = rollResult.attackDamagePayload;
          if (!p) return;
          const suffix = p.damageLabelSuffix || '';
          const diceCount = isCrit ? p.critDiceCount : p.normalDiceCount;
          const maxCritSuffix =
            isCrit && p.maximizeCritDamage ? ' [Atirar p/ Matar: Dano Máx.]' : '';
          const label = isCrit
            ? `Dano Crítico [x${p.critMultiplier}]: ${p.weaponName}${suffix}${maxCritSuffix}`
            : `Dano: ${p.weaponName}${suffix}`;
          const fixedRolls =
            isCrit && p.maximizeCritDamage
              ? Array(Math.max(1, diceCount)).fill(p.dieSides)
              : undefined;
          triggerRoll(
            rollResult.characterName,
            rollResult.system,
            label,
            diceCount,
            p.dieSides,
            p.damageModifier,
            rollResult.isSecret,
            false,
            rollResult.characterId,
            fixedRolls,
            rollResult.hasAfortunado,
            undefined,
            p.forcaOpressoraPayload,
            undefined,
            {
              explodingDieSide: p.explodingDieSide,
              extraDice: isCrit ? p.extraDiceCrit : p.extraDiceNormal,
            },
            rollResult.hasAfortunadoAffinity
          );
        }}
        onApplyCurseSanLoss={(rollResult) => {
          if (!rollResult.cursePricePrompt) return;
          window.dispatchEvent(
            new CustomEvent('totalrpg:curse-san-loss', {
              detail: {
                characterId: rollResult.characterId,
                amount: rollResult.cursePricePrompt.sanLossOnFail,
                element: rollResult.cursePricePrompt.element,
                label: rollResult.label,
              },
            })
          );
        }}
        onRollSanguinariaTempHp={(rollResult) => {
          triggerRoll(
            rollResult.characterName,
            rollResult.system,
            `🛡️ PV Temporários (Sanguinária • Crítico): ${rollResult.attackDamagePayload?.weaponName || 'Arma'}`,
            2,
            10,
            0,
            rollResult.isSecret,
            false,
            rollResult.characterId,
            undefined,
            rollResult.hasAfortunado,
            undefined,
            undefined,
            undefined,
            undefined,
            rollResult.hasAfortunadoAffinity
          );
        }}
        onRollRitualEffect={(rollResult) => {
          const rp = rollResult.ritualEffectPayload;
          if (!rp || !rp.effectFormula) return;
          const clean = rp.effectFormula.toLowerCase().replace(/\s+/g, '');
          const match = clean.match(/^(\d+)d(\d+)([+-]\d+)?$/);
          if (!match) return;
          const count = parseInt(match[1], 10);
          const sides = parseInt(match[2], 10);
          const modifier = match[3] ? parseInt(match[3], 10) : 0;
          const et = rp.effectType || 'damage';
          const prefix =
            et === 'healing'
              ? 'Cura'
              : et === 'temp_hp'
              ? '🛡️ Vida Temporária'
              : et === 'utility'
              ? 'Efeito'
              : 'Dano';
          const fixedRolls = rp.maximizeEffect
            ? Array(Math.max(1, count)).fill(sides)
            : undefined;
          const extraNote = rp.effectLabel ? ` — ${rp.effectLabel}` : '';
          triggerRoll(
            rollResult.characterName,
            rollResult.system,
            `${prefix}: ${rp.ritualName} [${rp.formLabel}]${extraNote}${
              rp.maximizeEffect ? ' [Cinerária: Dano Máx.]' : ''
            }`,
            count,
            sides,
            modifier,
            rollResult.isSecret,
            false,
            rollResult.characterId,
            fixedRolls,
            rollResult.hasAfortunado,
            undefined,
            undefined,
            undefined,
            undefined,
            rollResult.hasAfortunadoAffinity
          );
        }}
        onRollForcaOpressora={(rollResult, maneuver) => {
          const fo = rollResult.forcaOpressoraPayload;
          if (!fo) return;
          if (sheetSpendResourceRef.current && !sheetSpendResourceRef.current(1)) {
            setActiveRollModal(null);
            return;
          }
          if (maneuver === 'empurrar') {
            const pushBonus = Math.floor(Math.max(0, rollResult.total) / 10) * 5;
            triggerRoll(
              rollResult.characterName,
              rollResult.system,
              `Força Opressora — Empurrar (${rollResult.total} dano → +${pushBonus}): Luta`,
              fo.lutaDiceCount,
              20,
              fo.lutaBonus + pushBonus,
              rollResult.isSecret,
              false,
              rollResult.characterId,
              undefined,
              rollResult.hasAfortunado,
              undefined,
              undefined,
              undefined,
              undefined,
              rollResult.hasAfortunadoAffinity
            );
          } else {
            triggerRoll(
              rollResult.characterName,
              rollResult.system,
              'Força Opressora — Derrubar: Luta',
              fo.lutaDiceCount,
              20,
              fo.lutaBonus,
              rollResult.isSecret,
              false,
              rollResult.characterId,
              undefined,
              rollResult.hasAfortunado,
              undefined,
              undefined,
              undefined,
              undefined,
              rollResult.hasAfortunadoAffinity
            );
          }
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

      <AppHeader
        username={currentUser.username}
        isAdmin={Boolean(currentUser.isAdmin)}
        system={activeSessionSystem}
        onHome={() => {
          setOpenedCharacter(null);
          setCurrentCampaignSession(null);
        }}
        onOpenAppearance={() => setIsQuickSettingsOpen(true)}
        onOpenAdminOverview={() => {
          setOpenedCharacter(null);
          setCurrentCampaignSession(null);
          setDashboardRequestedTab('admin-overview');
        }}
        onLogout={() => {
          setDedicatedAuthMode(null);
          handleLogout();
        }}
        crumbs={[
          ...(currentCampaignSession
            ? [
                {
                  label: currentCampaignSession.role === 'dm' ? 'Escudo do mestre' : 'Mesa',
                  onClick: () => setOpenedCharacter(null),
                },
              ]
            : []),
          ...(openedCharacter ? [{ label: 'Ficha' }] : []),
        ]}
      />

      <main className="trpg-wrap pt-5 pb-16 sm:pt-8 flex-1 flex flex-col gap-6">
        {platformStatus?.announcementBanner && (
          <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 px-4 py-2.5 text-sm text-amber-100 flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            <span>{platformStatus.announcementBanner}</span>
          </div>
        )}

      {/* VISÃO 1: Ficha Completa Aberta */}
      {openedCharacter ? (
        <SheetContainer
          characterId={openedCharacter.characterId}
          currentUserId={currentUser.id}
          onBack={() => setOpenedCharacter(null)}
          onRollDice={triggerRoll}
          onRegisterSpendResource={(fn) => {
            sheetSpendResourceRef.current = fn;
          }}
          externalPermissions={livePermissions}
          externalCombatState={liveCombatState}
          externalReloadSignal={lastUpdatedCharSignal}
          initiativeRequestSignal={initiativeRequestSignal}
          onCharacterSaved={(charId, campId) => {
            const room = campId || openedCharacter.campaignId;
            if (room) {
              socket.emit('character:sync', { campaignId: room, characterId: charId });
            }
          }}
          onBroadcastCharacterPatch={(patch) => {
            const room = patch.campaignId || openedCharacter.campaignId;
            if (room) {
              socket.emit('character:patch', {
                ...patch,
                campaignId: room,
                patchTimestamp: Date.now(),
              });
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
          onLogActivity={emitActivityLog}
        />
      ) : currentCampaignSession ? (
        /* VISÃO 2: Escudo do Mestre Completo */
        <DMScreen
          campaignId={currentCampaignSession.campaignId}
          rollHistory={rollHistory}
          liveActivityLog={activityLog}
          onClearRolls={() => setRollHistory([])}
          onClearActivityLog={() => {
            setActivityLog([]);
            socket.emit('activity:clear', {
              campaignId: currentCampaignSession.campaignId,
            });
          }}
          onLogActivity={emitActivityLog}
          onInspectCharacter={(charId) =>
            setOpenedCharacter({
              characterId: charId,
              campaignId: currentCampaignSession.campaignId,
              system: currentCampaignSession.system,
            })
          }
          onRollDice={(
            characterName,
            system,
            label,
            count,
            sides,
            modifier,
            isSecret,
            isInitiativeRoll,
            characterId,
            extraDice
          ) =>
            triggerRoll(
              characterName,
              system,
              label,
              count,
              sides,
              modifier,
              isSecret,
              isInitiativeRoll,
              characterId,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              extraDice && extraDice.length > 0 ? { extraDice } : undefined
            )
          }
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
          onBroadcastCharacterPatch={(patch) =>
            socket.emit('character:patch', {
              ...patch,
              campaignId: currentCampaignSession.campaignId,
              patchTimestamp: Date.now(),
            })
          }
          onBroadcastBatchCharacterPatch={(patches) =>
            socket.emit('characters:batchPatch', {
              campaignId: currentCampaignSession.campaignId,
              patches: patches.map((p) => ({
                ...p,
                campaignId: currentCampaignSession.campaignId,
                patchTimestamp: Date.now(),
              })),
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
          socket={socket}
          requestedTab={dashboardRequestedTab}
          onRequestedTabHandled={() => setDashboardRequestedTab(null)}
          onEnterSession={(campaignId, role, system) => {
            setRollHistory([]);
            setCurrentCampaignSession({ campaignId, role, system });
          }}
          onOpenCharacter={(characterId, campaignId, system) =>
            setOpenedCharacter({ characterId, campaignId, system })
          }
        />
      )}
      </main>
      </div>
    </ThemeProvider>
  );
}