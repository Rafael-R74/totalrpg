import type { Server } from 'socket.io';
import type {
  ActiveCondition,
  CharacterAbility,
  RPGItem,
  SceneEffect,
  SessionActivityCategory,
  SessionActivityLogEntry,
  VitalBar,
} from '@totalrpg/shared';

const MAX_LOG_ENTRIES = 250;
const DEDUP_WINDOW_MS = 1500;

const campaignLogBuffer = new Map<string, SessionActivityLogEntry[]>();

export type ActivityLogInput = Omit<
  SessionActivityLogEntry,
  'id' | 'timestamp' | 'createdAt'
> & {
  id?: string;
  timestamp?: string;
  createdAt?: number;
};

function makeTimestamp(nowMs: number): string {
  return new Date(nowMs).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function makeLogId(): string {
  return `act-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function recordCampaignActivity(
  io: Server | undefined | null,
  payload: ActivityLogInput
): SessionActivityLogEntry {
  const now = payload.createdAt ?? Date.now();
  const entry: SessionActivityLogEntry = {
    ...payload,
    id: payload.id || makeLogId(),
    timestamp: payload.timestamp || makeTimestamp(now),
    createdAt: now,
  };

  const existing = campaignLogBuffer.get(payload.campaignId) || [];
  const isDuplicate = existing.some(
    (e) =>
      now - e.createdAt <= DEDUP_WINDOW_MS &&
      e.characterName === entry.characterName &&
      e.category === entry.category &&
      e.summary === entry.summary &&
      (e.costText || '') === (entry.costText || '')
  );

  if (isDuplicate) {
    return existing[0];
  }

  const next = [entry, ...existing].slice(0, MAX_LOG_ENTRIES);
  campaignLogBuffer.set(payload.campaignId, next);

  if (io) {
    io.to(payload.campaignId).emit('activity:logged', entry);
  }

  return entry;
}

export function getCampaignActivityLog(
  campaignId: string,
  persistedLogs?: unknown[]
): SessionActivityLogEntry[] {
  const mem = campaignLogBuffer.get(campaignId) || [];
  const persisted = Array.isArray(persistedLogs)
    ? (persistedLogs.filter(
        (x): x is SessionActivityLogEntry =>
          Boolean(x && typeof x === 'object' && 'id' in x && 'summary' in x)
      ) as SessionActivityLogEntry[])
    : [];

  const byId = new Map<string, SessionActivityLogEntry>();
  for (const item of [...mem, ...persisted]) {
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }

  const merged = Array.from(byId.values())
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, MAX_LOG_ENTRIES);

  campaignLogBuffer.set(campaignId, merged);
  return merged;
}

export function syncCampaignActivityLogFromClient(
  campaignId: string,
  clientLogs: unknown
): void {
  if (!Array.isArray(clientLogs)) return;
  if (clientLogs.length === 0) {
    clearCampaignActivityLog(campaignId);
    return;
  }
  getCampaignActivityLog(campaignId, clientLogs);
}

export function clearCampaignActivityLog(campaignId: string): void {
  campaignLogBuffer.set(campaignId, []);
}

interface CharSnapshot {
  id: string;
  name: string;
  vitals: unknown;
  sheetData: unknown;
  inventory: unknown;
}

export function diffAndLogCharacterUpdate({
  io,
  campaignId,
  existingChar,
  updatedChar,
  actorIsDM,
}: {
  io: Server | undefined | null;
  campaignId: string;
  existingChar: CharSnapshot;
  updatedChar: CharSnapshot;
  actorIsDM: boolean;
}): void {
  const actorLabel = actorIsDM ? '👑 Mestre' : undefined;
  const emit = (
    category: SessionActivityCategory,
    summary: string,
    opts?: {
      details?: string;
      costText?: string;
      tone?: SessionActivityLogEntry['tone'];
    }
  ) => {
    recordCampaignActivity(io, {
      campaignId,
      characterId: updatedChar.id,
      characterName: updatedChar.name,
      actorLabel,
      category,
      summary,
      details: opts?.details,
      costText: opts?.costText,
      tone: opts?.tone,
    });
  };

  // 1. Variações de Barras Vitais
  const prevVitals = Array.isArray(existingChar.vitals)
    ? (existingChar.vitals as VitalBar[])
    : [];
  const nextVitals = Array.isArray(updatedChar.vitals)
    ? (updatedChar.vitals as VitalBar[])
    : [];
  const prevVitalById = new Map(prevVitals.map((v) => [v.id, v]));

  for (const nextBar of nextVitals) {
    const prevBar = prevVitalById.get(nextBar.id);
    if (!prevBar) continue;

    if (nextBar.current !== prevBar.current) {
      const diff = Math.abs(nextBar.current - prevBar.current);
      if (nextBar.id === 'pv') {
        if (nextBar.current < prevBar.current) {
          emit(
            'vital',
            `Sofreu ${diff} de dano em PV (${prevBar.current} → ${nextBar.current}/${nextBar.max})${
              nextBar.current === 0 ? ' — ⚠️ CAIU A 0 PV (Morrendo)!' : ''
            }`,
            { costText: `-${diff} PV`, tone: 'danger' }
          );
        } else {
          emit(
            'vital',
            `Recuperou +${diff} PV (${prevBar.current} → ${nextBar.current}/${nextBar.max})`,
            { costText: `+${diff} PV`, tone: 'success' }
          );
        }
      } else if (nextBar.id === 'pe' || nextBar.id === 'pm') {
        const label = nextBar.id.toUpperCase();
        if (nextBar.current < prevBar.current) {
          emit(
            'vital',
            `Gastou/Perdeu ${diff} ${label} (${prevBar.current} → ${nextBar.current}/${nextBar.max})`,
            { costText: `-${diff} ${label}`, tone: 'warning' }
          );
        } else {
          emit(
            'vital',
            `Recuperou +${diff} ${label} (${prevBar.current} → ${nextBar.current}/${nextBar.max})`,
            { costText: `+${diff} ${label}`, tone: 'info' }
          );
        }
      } else if (nextBar.id === 'san') {
        if (nextBar.current < prevBar.current) {
          emit(
            'vital',
            `Perdeu ${diff} de Sanidade (${prevBar.current} → ${nextBar.current}/${nextBar.max})${
              nextBar.current === 0 ? ' — 🔴 SANIDADE 0 (Enlouquecendo)!' : ''
            }`,
            { costText: `-${diff} SAN`, tone: 'purple' }
          );
        } else {
          emit(
            'vital',
            `Recuperou +${diff} de Sanidade (${prevBar.current} → ${nextBar.current}/${nextBar.max})`,
            { costText: `+${diff} SAN`, tone: 'success' }
          );
        }
      } else {
        const sign = nextBar.current > prevBar.current ? '+' : '-';
        emit(
          'vital',
          `Alterou ${nextBar.label}: ${prevBar.current} → ${nextBar.current}/${nextBar.max}`,
          { costText: `${sign}${diff}`, tone: nextBar.current > prevBar.current ? 'success' : 'warning' }
        );
      }
    }

    if (nextBar.id === 'san' && nextBar.max < prevBar.max) {
      const diffMax = prevBar.max - nextBar.max;
      emit(
        'vital',
        `Perdeu -${diffMax} de Sanidade Máxima Permanente (${prevBar.max} → ${nextBar.max})`,
        { costText: `-${diffMax} SAN Máx`, tone: 'danger' }
      );
    }
  }

  const prevSheet =
    existingChar.sheetData && typeof existingChar.sheetData === 'object'
      ? (existingChar.sheetData as Record<string, any>)
      : {};
  const nextSheet =
    updatedChar.sheetData && typeof updatedChar.sheetData === 'object'
      ? (updatedChar.sheetData as Record<string, any>)
      : {};

  // PV Temporários e PE Temporários
  const prevTempHp = Number(prevSheet.tempHp || 0);
  const nextTempHp = Number(nextSheet.tempHp || 0);
  if (nextTempHp !== prevTempHp) {
    const diff = Math.abs(nextTempHp - prevTempHp);
    if (nextTempHp > prevTempHp) {
      emit('vital', `Recebeu +${diff} PV Temporários (Total Temp: ${nextTempHp})`, {
        costText: `+${diff} PV Temp`,
        tone: 'info',
      });
    } else {
      emit('vital', `Absorveu/Perdeu ${diff} PV Temporários (Restante: ${nextTempHp})`, {
        costText: `-${diff} PV Temp`,
        tone: 'warning',
      });
    }
  }

  const prevTempPe = Number(prevSheet.tempPe || 0);
  const nextTempPe = Number(nextSheet.tempPe || 0);
  if (nextTempPe !== prevTempPe) {
    const diff = Math.abs(nextTempPe - prevTempPe);
    if (nextTempPe > prevTempPe) {
      emit('vital', `Recebeu +${diff} PE Temporários (Total Temp: ${nextTempPe})`, {
        costText: `+${diff} PE Temp`,
        tone: 'info',
      });
    } else {
      emit('vital', `Gastou ${diff} PE Temporários (Restante: ${nextTempPe})`, {
        costText: `-${diff} PE Temp`,
        tone: 'warning',
      });
    }
  }

  // 2. Inventário: Equipar/Desequipar, Consumir, Cargas, Customização e Flags
  const prevInv = Array.isArray(existingChar.inventory)
    ? (existingChar.inventory as RPGItem[])
    : [];
  const nextInv = Array.isArray(updatedChar.inventory)
    ? (updatedChar.inventory as RPGItem[])
    : [];
  const prevInvById = new Map(prevInv.map((i) => [i.id, i]));
  const nextInvById = new Map(nextInv.map((i) => [i.id, i]));

  for (const nextItem of nextInv) {
    const prevItem = prevInvById.get(nextItem.id);
    if (!prevItem) {
      const qty = nextItem.quantity || 1;
      emit('inventory', `Adicionou ao inventário: ${qty}x ${nextItem.name}`, {
        costText: `+${qty} un.`,
        tone: 'success',
      });
      continue;
    }

    if (Boolean(nextItem.isEquipped) !== Boolean(prevItem.isEquipped)) {
      if (nextItem.isEquipped) {
        emit('inventory', `Equipou o item: ${nextItem.name}`, {
          costText: 'Equipado',
          tone: 'info',
        });
      } else {
        emit('inventory', `Desequipou o item: ${nextItem.name}`, {
          costText: 'Desequipado',
          tone: 'neutral',
        });
      }
    }

    const prevQty = Number(prevItem.quantity ?? 1);
    const nextQty = Number(nextItem.quantity ?? 1);
    if (nextQty < prevQty) {
      const diff = prevQty - nextQty;
      emit('consumable', `Consumiu ${diff}x ${nextItem.name} (Restam: ${nextQty}x)`, {
        costText: `-${diff} un.`,
        tone: 'warning',
      });
    } else if (nextQty > prevQty) {
      const diff = nextQty - prevQty;
      emit('inventory', `Recebeu/Adicionou +${diff}x ${nextItem.name} (Total: ${nextQty}x)`, {
        costText: `+${diff} un.`,
        tone: 'success',
      });
    }

    if (
      typeof prevItem.remainingCharges === 'number' ||
      typeof nextItem.remainingCharges === 'number'
    ) {
      const prevC = Number(prevItem.remainingCharges ?? 0);
      const nextC = Number(nextItem.remainingCharges ?? 0);
      if (nextC < prevC) {
        const diff = prevC - nextC;
        emit('consumable', `Usou ${diff} carga(s) de ${nextItem.name} (Restam: ${nextC} cargas)`, {
          costText: `-${diff} carga`,
          tone: 'warning',
        });
      } else if (nextC > prevC) {
        emit('inventory', `Recarregou ${nextItem.name} (${nextC} cargas)`, {
          costText: 'Recarga',
          tone: 'success',
        });
      }
    }

    const prevModsKey = JSON.stringify({
      mods: prevItem.modifications || [],
      curses: prevItem.curses || [],
    });
    const nextModsKey = JSON.stringify({
      mods: nextItem.modifications || [],
      curses: nextItem.curses || [],
    });
    if (prevModsKey !== nextModsKey) {
      emit('inventory', `Atualizou modificações/maldições em ${nextItem.name}`, {
        tone: 'purple',
      });
    }

    const flagPairs: Array<[keyof RPGItem, string]> = [
      ['isAniquiladorFavorite', 'A Favorita (Aniquilador)'],
      ['isUtilityBackpackItem', 'Mochila de Utilidades'],
      ['isFavoriteTool', 'Ferramenta Favorita'],
      ['isParanormalTool', 'Ferramenta Paranormal'],
    ];
    for (const [flagKey, label] of flagPairs) {
      if (!prevItem[flagKey] && nextItem[flagKey]) {
        emit('inventory', `Marcou ${nextItem.name} como ${label}`, {
          tone: 'info',
        });
      }
    }
  }

  for (const prevItem of prevInv) {
    if (!nextInvById.has(prevItem.id)) {
      const qty = prevItem.quantity || 1;
      emit('consumable', `Consumiu/Removeu do inventário: ${prevItem.name} (${qty}x)`, {
        costText: `-${qty} un.`,
        tone: 'warning',
      });
    }
  }

  // 3. Habilidades / Posturas / Rituais / Efeitos de Cena
  const prevAbs = Array.isArray(prevSheet.abilities)
    ? (prevSheet.abilities as CharacterAbility[])
    : [];
  const nextAbs = Array.isArray(nextSheet.abilities)
    ? (nextSheet.abilities as CharacterAbility[])
    : [];
  const prevAbById = new Map(prevAbs.map((a) => [a.id, a]));

  for (const nextAb of nextAbs) {
    const prevAb = prevAbById.get(nextAb.id);
    if (!prevAb) {
      emit(
        'progression',
        `Adicionou ${nextAb.category === 'ritual' || nextAb.category === 'magia' ? 'Ritual/Magia' : 'Poder/Habilidade'}: ${nextAb.name}`,
        { tone: 'purple' }
      );
      continue;
    }
    if (Boolean(nextAb.isActive) !== Boolean(prevAb.isActive)) {
      if (nextAb.isActive) {
        emit('ability', `Ativou habilidade/postura: ${nextAb.name}`, {
          costText: nextAb.cost > 0 ? `-${nextAb.cost} PE` : 'Ativo',
          tone: 'info',
        });
      } else {
        emit('ability', `Desativou habilidade/postura: ${nextAb.name}`, {
          costText: 'Inativo',
          tone: 'neutral',
        });
      }
    }
  }

  const prevEffects = Array.isArray(prevSheet.sceneEffects)
    ? (prevSheet.sceneEffects as SceneEffect[])
    : [];
  const nextEffects = Array.isArray(nextSheet.sceneEffects)
    ? (nextSheet.sceneEffects as SceneEffect[])
    : [];
  const prevEffKeys = new Set(prevEffects.map((e) => `${e.id}:${e.name}`));
  for (const eff of nextEffects) {
    if (!prevEffKeys.has(`${eff.id}:${eff.name}`)) {
      emit(
        'ability',
        `Efeito ativo na cena: ${eff.name}${eff.source ? ` (${eff.source})` : ''}`,
        { details: eff.description, tone: 'purple' }
      );
    }
  }

  // 4. Condições
  const prevConds = Array.isArray(prevSheet.conditions)
    ? (prevSheet.conditions as ActiveCondition[])
    : [];
  const nextConds = Array.isArray(nextSheet.conditions)
    ? (nextSheet.conditions as ActiveCondition[])
    : [];
  const prevCondById = new Map(prevConds.map((c) => [c.id, c]));
  const nextCondById = new Map(nextConds.map((c) => [c.id, c]));

  for (const c of nextConds) {
    if (!prevCondById.has(c.id)) {
      emit('condition', `Recebeu condição: 🩸 ${c.name}`, {
        costText: '+Condição',
        tone: 'danger',
      });
    }
  }
  for (const c of prevConds) {
    if (!nextCondById.has(c.id)) {
      emit('condition', `Removeu condição: ${c.name}`, {
        costText: '-Condição',
        tone: 'success',
      });
    }
  }

  // 5. Dados Bônus de Interlúdio
  const prevPhysical = Number(prevSheet.interludeBonusDice?.physical || 0);
  const nextPhysical = Number(nextSheet.interludeBonusDice?.physical || 0);
  if (nextPhysical < prevPhysical) {
    emit('ability', 'Usou +1d20 de bônus de Interlúdio (Exercitar-se / Físico)', {
      costText: '-1d20 bônus',
      tone: 'info',
    });
  }

  const prevMental = Number(prevSheet.interludeBonusDice?.mental || 0);
  const nextMental = Number(nextSheet.interludeBonusDice?.mental || 0);
  if (nextMental < prevMental) {
    emit('ability', 'Usou +1d20 de bônus de Interlúdio (Ler / Mental)', {
      costText: '-1d20 bônus',
      tone: 'info',
    });
  }

  // 6. Progressão (NEX, Nível, Patente, Trilha, Afinidade, Atributos, Perícias)
  if (
    prevSheet.nex !== undefined &&
    nextSheet.nex !== undefined &&
    Number(nextSheet.nex) !== Number(prevSheet.nex)
  ) {
    emit('progression', `NEX alterado: ${prevSheet.nex}% → ${nextSheet.nex}%`, {
      costText: `${nextSheet.nex}% NEX`,
      tone: 'purple',
    });
  }
  if (
    prevSheet.level !== undefined &&
    nextSheet.level !== undefined &&
    Number(nextSheet.level) !== Number(prevSheet.level)
  ) {
    emit('progression', `Nível alterado: ${prevSheet.level} → ${nextSheet.level}`, {
      costText: `Nv ${nextSheet.level}`,
      tone: 'purple',
    });
  }
  if (prevSheet.patent && nextSheet.patent && nextSheet.patent !== prevSheet.patent) {
    emit('progression', `Patente alterada: ${prevSheet.patent} → ${nextSheet.patent}`, {
      tone: 'info',
    });
  }
  if (nextSheet.trail && nextSheet.trail !== prevSheet.trail) {
    emit('progression', `Definiu Trilha: ${nextSheet.trail}`, { tone: 'purple' });
  }
  if (nextSheet.affinity && nextSheet.affinity !== prevSheet.affinity) {
    emit('progression', `Escolheu Afinidade Elemental: ${nextSheet.affinity}`, {
      tone: 'purple',
    });
  }
  if (prevSheet.attributes && nextSheet.attributes) {
    const changedAttrs: string[] = [];
    for (const [k, v] of Object.entries(nextSheet.attributes as Record<string, number>)) {
      const oldV = (prevSheet.attributes as Record<string, number>)[k];
      if (oldV !== undefined && v !== oldV) {
        changedAttrs.push(`${k.toUpperCase()} ${oldV}→${v}`);
      }
    }
    if (changedAttrs.length > 0) {
      emit('progression', `Alterou atributos: ${changedAttrs.join(', ')}`, {
        tone: 'info',
      });
    }
  }
  if (Array.isArray(prevSheet.skills) && Array.isArray(nextSheet.skills)) {
    const prevSkMap = new Map(
      (prevSheet.skills as Array<{ id: string; name: string; trainingDegree?: number }>).map(
        (s) => [s.id, s]
      )
    );
    const upgraded: string[] = [];
    for (const sk of nextSheet.skills as Array<{
      id: string;
      name: string;
      trainingDegree?: number;
    }>) {
      const prevSk = prevSkMap.get(sk.id);
      if (
        prevSk &&
        typeof sk.trainingDegree === 'number' &&
        typeof prevSk.trainingDegree === 'number' &&
        sk.trainingDegree !== prevSk.trainingDegree
      ) {
        upgraded.push(`${sk.name} (+${prevSk.trainingDegree}→+${sk.trainingDegree})`);
      }
    }
    if (upgraded.length > 0) {
      emit('progression', `Treinamento de perícias atualizado: ${upgraded.join(', ')}`, {
        tone: 'info',
      });
    }
  }
}
