import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  DiceRollResult,
  getOrdemDiceRollCount,
  formatOrdemDiceLabel,
  isOrdemPenaltyFormula,
} from '@totalrpg/shared';
import { authRouter } from './routes/auth';
import { campaignsRouter } from './routes/campaigns';
import { charactersRouter } from './routes/characters';
import { compendiumRouter } from './routes/compendium'; 
import { contentPackRouter } from './routes/contentPack';
import { adminRouter } from './routes/admin';
import { loadLocalContentPacks } from './contentPackService';
import {
  clearCampaignActivityLog,
  recordCampaignActivity,
} from './activityLogService';
import {
  attachAdminTelemetryIo,
  flushAdminTelemetry,
  recordAdminEvent,
  registerSocketConnected,
  touchUserTelemetry,
  unregisterSocketConnected,
  updateSocketPresence,
  verifyTokenIdentity,
} from './adminTelemetryService';
import path from 'path';
import fs from 'node:fs';
import uploadsRouter from './routes/uploads';
import {
  getCorsOrigin,
  getUploadsDir,
  getWebDistDir,
  SERVER_PORT,
} from './config';
import { initDatabasePragmas, prisma, syncConfiguredAdmins } from './prisma';

loadLocalContentPacks();

const app = express();
app.set('trust proxy', 1);

const corsOrigin = getCorsOrigin();
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '25mb' }));

// Garante pasta de uploads e serve os arquivos de imagem enviados pelos usuários
const uploadsDirectory = getUploadsDir();
fs.mkdirSync(uploadsDirectory, { recursive: true });
app.use('/uploads', express.static(uploadsDirectory));

// Registramos as rotas da API
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/compendium', compendiumRouter);
app.use('/api/content-pack', contentPackRouter);
app.use('/api/uploads', uploadsRouter);
app.use('/api/admin', adminRouter);
app.get('/api/health', (_req, res) => {
  res.json({ status: 'TotalRPG Backend & Database 100% Operacionais!' });
});

// Em produção, o próprio Express serve o bundle estático do frontend (apps/web/dist)
const webDistDir = getWebDistDir();
if (webDistDir) {
  app.use(express.static(webDistDir));
  app.use((req, res, next) => {
    if (
      req.method !== 'GET' ||
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/socket.io')
    ) {
      return next();
    }
    res.sendFile(path.join(webDistDir, 'index.html'));
  });
}

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: corsOrigin,
  },
});

app.set('io', io);
attachAdminTelemetryIo(io);

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);
  registerSocketConnected(socket);

  socket.on('presence:update', (payload) => {
    if (payload && typeof payload === 'object') {
      updateSocketPresence(socket, payload);
    }
  });

  socket.on('admin:watch', async ({ token, active }) => {
    if (!active) {
      socket.leave('admin-watch');
      return;
    }
    const identity = verifyTokenIdentity(token);
    if (!identity) return;
    try {
      const user = await prisma.user.findUnique({
        where: { id: identity.userId },
        select: { isAdmin: true },
      });
      if (user?.isAdmin) {
        socket.join('admin-watch');
      }
    } catch {
      // ignore
    }
  });

  socket.on('session:join', ({ campaignId, role }) => {
    socket.join(campaignId);
    console.log(`🎲 Socket ${socket.id} entrou na sala [${campaignId}] como [${role}]`);
  });

  socket.on('vital:change', ({ campaignId, bar }) => {
    socket.to(campaignId).emit('vital:updated', bar);
  });

  socket.on('character:sync', ({ campaignId, characterId }) => {
    socket.to(campaignId).emit('character:updated', { characterId });
  });

  // Atualização otimista em tempo real (<5ms) para barras vitais, PV/PE temporários, condições e equipamentos
  socket.on('character:patch', (patch) => {
    if (patch?.campaignId && patch?.characterId) {
      socket.to(patch.campaignId).emit('character:patched', patch);
    }
  });

  socket.on('characters:batchPatch', (payload) => {
    if (payload?.campaignId && Array.isArray(payload.patches)) {
      socket.to(payload.campaignId).emit('characters:batchPatched', payload);
    }
  });

  socket.on('campaign:syncPermissions', ({ campaignId, permissions }) => {
    socket.to(campaignId).emit('campaign:permissionsUpdated', permissions);
  });

  // Mestre solicita Teste de Iniciativa para todos os jogadores da campanha
  socket.on('combat:requestInitiative', ({ campaignId, characterIds }) => {
    const ids = Array.isArray(characterIds)
      ? characterIds.filter((id): id is string => typeof id === 'string')
      : undefined;
    socket.to(campaignId).emit('combat:initiativeRequested', {
      campaignId,
      ...(ids && ids.length > 0 ? { characterIds: ids } : {}),
    });
  });

  // Mestre compartilha ou oculta um Post-it destacado na tela de um jogador específico (ou todos)
  socket.on('postit:share', ({ campaignId, postIt, action }) => {
    socket.to(campaignId).emit('postit:received', { postIt, action });
  });

  socket.on('postit:dismiss', ({ campaignId, postItId, characterId }) => {
    socket.to(campaignId).emit('postit:dismissed', { postItId, characterId });
  });

  socket.on('item:giveNotify', ({ campaignId, targetCharacterId, item, attack }) => {
    socket.to(campaignId).emit('item:received', { targetCharacterId, item, attack });
  });

  // Mestre atualiza a cena, turno de combate, mercador ativo ou pista projetada no 2º Monitor
  socket.on('monitor:sync', ({ campaignId, director, combatState, merchants, postIts }) => {
    socket.to(campaignId).emit('monitor:updated', {
      director,
      combatState,
      merchants,
      postIts,
    });
  });

  // Mestre reinicia o 2º monitor (a TV limpa rolagens, destaques e janelas abertas)
  socket.on('monitor:reset', ({ campaignId }) => {
    if (campaignId) socket.to(campaignId).emit('monitor:reset', { campaignId });
  });

  // Tamanho da janela da TV → espelho do mestre; e o pedido do espelho → TV
  socket.on('monitor:viewport', ({ campaignId, width, height }) => {
    if (!campaignId || !(width > 0) || !(height > 0)) return;
    socket.to(campaignId).emit('monitor:viewport', { campaignId, width, height });
  });
  socket.on('monitor:viewportRequest', ({ campaignId }) => {
    if (campaignId) socket.to(campaignId).emit('monitor:viewportRequest', { campaignId });
  });

  // Log geral de atividades da sessão em tempo real
  socket.on('activity:log', (payload) => {
    if (payload?.campaignId) {
      recordCampaignActivity(io, payload);
    }
  });

  socket.on('activity:clear', ({ campaignId }) => {
    if (campaignId) {
      clearCampaignActivityLog(campaignId);
    }
  });

  // Motor de rolagem de dados (Com isolamento de autor e gatilho automático de Iniciativa)
  socket.on(
    'dice:roll',
    ({
      campaignId,
      rollerUserId,
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
      explodingDieSide,
      extraDice,
      hasAfortunado,
      hasAfortunadoAffinity,
      mapaCelestePayload,
      attackDamagePayload,
      forcaOpressoraPayload,
      cursePricePrompt,
      ritualEffectPayload,
      batchId,
      batchRole,
      batchShotNumber,
      batchIsCrit,
    }) => {
      if (campaignId) {
        socket.join(campaignId);
      }

      const isOrdemZeroDicePenalty =
        system === 'ordem-paranormal' && sides === 20 && count <= 0;
      const safeCount = isOrdemZeroDicePenalty
        ? getOrdemDiceRollCount(count)
        : Math.max(1, Math.min(50, count));
      const rolls: number[] =
        Array.isArray(fixedRolls) && fixedRolls.length > 0
          ? fixedRolls
          : [];

      if (rolls.length === 0) {
        for (let i = 0; i < safeCount; i++) {
          rolls.push(Math.floor(Math.random() * sides) + 1);
        }
      }

      // Dados explosivos (ex.: Motosserra — sempre que cair 6 no d6, rola +1d6 adicional em cadeia)
      const explodedRolls: number[] = [];
      if (explodingDieSide && explodingDieSide === sides && sides >= 2) {
        let pendingExplosions = rolls.filter((v) => v === explodingDieSide).length;
        const maxExplosions = 30;
        while (pendingExplosions > 0 && explodedRolls.length < maxExplosions) {
          pendingExplosions -= 1;
          const extraVal = Math.floor(Math.random() * sides) + 1;
          explodedRolls.push(extraVal);
          if (extraVal === explodingDieSide) {
            pendingExplosions += 1;
          }
        }
      }

      // Dados extras de maldições/munições (Lancinante +1d8/+3d8, Erosiva +1d8, Explosiva +2d6, Antielemento +4d8)
      const extraDiceResults: Array<{
        label: string;
        formula: string;
        rolls: number[];
        subtotal: number;
      }> = [];
      let extraDiceGrandTotal = 0;
      if (Array.isArray(extraDice) && extraDice.length > 0) {
        for (const group of extraDice) {
          const gCount = Math.max(1, Math.min(30, Number(group.count) || 1));
          const gSides = Math.max(2, Math.min(100, Number(group.sides) || 6));
          const gRolls: number[] = [];
          for (let i = 0; i < gCount; i++) {
            gRolls.push(Math.floor(Math.random() * gSides) + 1);
          }
          const subtotal = gRolls.reduce((acc, v) => acc + v, 0);
          extraDiceGrandTotal += subtotal;
          extraDiceResults.push({
            label: group.label,
            formula: `${gCount}d${gSides}`,
            rolls: gRolls,
            subtotal,
          });
        }
      }

      let diceTotal = 0;
      if (isOrdemZeroDicePenalty) {
        diceTotal = Math.min(...rolls);
      } else if (system === 'ordem-paranormal' && sides === 20) {
        diceTotal = Math.max(...rolls);
      } else {
        diceTotal =
          rolls.reduce((acc, curr) => acc + curr, 0) +
          explodedRolls.reduce((acc, curr) => acc + curr, 0);
      }

      const total = diceTotal + extraDiceGrandTotal + modifier;
      const modString = modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '';
      const baseFormula = isOrdemZeroDicePenalty
        ? formatOrdemDiceLabel(count)
        : `${safeCount}d${sides}`;
      const extraFormulaStr =
        extraDiceResults.length > 0
          ? ' + ' + extraDiceResults.map((e) => e.formula).join(' + ')
          : '';

      const result: DiceRollResult = {
        id: Math.random().toString(36).substring(2, 9),
        rollerUserId,
        characterId,
        isInitiativeRoll: Boolean(isInitiativeRoll),
        characterName,
        label,
        formula: `${baseFormula}${extraFormulaStr}${modString}`,
        rolls,
        explodedRolls: explodedRolls.length > 0 ? explodedRolls : undefined,
        extraDiceResults: extraDiceResults.length > 0 ? extraDiceResults : undefined,
        sides,
        modifier,
        total,
        system,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isSecret: Boolean(isSecret),
        hasAfortunado: Boolean(hasAfortunado),
        hasAfortunadoAffinity: Boolean(hasAfortunadoAffinity),
        mapaCelestePayload,
        attackDamagePayload,
        forcaOpressoraPayload,
        cursePricePrompt,
        ritualEffectPayload,
        batchId,
        batchRole,
        batchShotNumber,
        batchIsCrit: Boolean(batchIsCrit),
      };

      if (rollerUserId) {
        touchUserTelemetry(rollerUserId, { incrementRolls: true });
      }

      if (isSecret) {
        socket.emit('dice:rolled', result);
      } else {
        io.to(campaignId).emit('dice:rolled', result);
        recordAdminEvent({
          category: 'dice',
          userId: rollerUserId,
          summary: `${characterName} rolou ${label} → ${total}`,
          details: `${result.formula} [${rolls.join(', ')}]`,
          tone: 'info',
        });
      }

      // Se esta rolagem foi um Teste de Iniciativa, envia o resultado para a fila de combate da mesa!
      if (isInitiativeRoll && characterId) {
        io.to(campaignId).emit('combat:initiativeSubmitted', {
          characterId,
          characterName,
          initiative: total,
        });
      }

      // Registra automaticamente rolagens que envolvam uso explícito de habilidade/poder com gasto de PE/PM ou manobra especial
      if (!isSecret && campaignId) {
        const costMatch = label.match(/(-\d+\s*(?:PE|PM))/i);
        const isSpecialAbilityRoll =
          /(?:Ataque Especial|Técnica Secreta|Ataque Furtivo|Mãos Rápidas|Perito|Eclético|Segurar o Gatilho|Força Opressora|Paramédico|Anular Ritual|Identificação Paranormal|Improvisar Componentes|Motor de Busca|Impostor|Nerd)/i.test(
            label
          );
        if (costMatch || isSpecialAbilityRoll) {
          recordCampaignActivity(io, {
            campaignId,
            characterId,
            characterName,
            category: 'ability',
            summary: `Usou habilidade em rolagem: ${label}`,
            details: `Resultado: ${total} (${result.formula} → [${rolls.join(', ')}])`,
            costText: costMatch ? costMatch[1].toUpperCase() : undefined,
            tone: 'info',
          });
        }
      }
    }
  );

  // Poder Afortunado: Rerrola um resultado '1' (1x por rolagem)
  socket.on('dice:rerollOne', ({ campaignId, rollResult, dieIndex }) => {
    if (campaignId) {
      socket.join(campaignId);
    }
    if (!rollResult || rollResult.rerolledAfortunado) return;
    const idx =
      typeof dieIndex === 'number' && rollResult.rolls[dieIndex] === 1
        ? dieIndex
        : rollResult.rolls.indexOf(1);
    if (idx === -1) return;

    const sidesMatch = rollResult.formula.match(/d(\d+)/i);
    const sides = rollResult.sides || (sidesMatch ? Number(sidesMatch[1]) : 20);
    const newRollVal = Math.floor(Math.random() * sides) + 1;

    const nextRolls = [...rollResult.rolls];
    nextRolls[idx] = newRollVal;

    const isZeroDicePenalty = isOrdemPenaltyFormula(rollResult.formula);
    let diceTotal = 0;
    if (isZeroDicePenalty) {
      diceTotal = Math.min(...nextRolls);
    } else if (rollResult.system === 'ordem-paranormal' && sides === 20) {
      diceTotal = Math.max(...nextRolls);
    } else {
      diceTotal = nextRolls.reduce((a, b) => a + b, 0);
    }

    const updatedResult: DiceRollResult = {
      ...rollResult,
      label: rollResult.label.includes('[Afortunado]')
        ? rollResult.label
        : `${rollResult.label} [🍀 Afortunado: 1 → ${newRollVal}]`,
      rolls: nextRolls,
      sides,
      total: diceTotal + rollResult.modifier,
      rerolledAfortunado: true,
    };

    if (rollResult.isSecret) {
      socket.emit('dice:rolled', updatedResult);
    } else {
      io.to(campaignId).emit('dice:rolled', updatedResult);
      if (campaignId) {
        recordCampaignActivity(io, {
          campaignId,
          characterId: rollResult.characterId,
          characterName: rollResult.characterName,
          category: 'ability',
          summary: `Usou 🍀 Afortunado para rerrolar um dado 1 (${rollResult.label})`,
          costText: `1 → ${newRollVal}`,
          tone: 'info',
        });
      }
    }
  });

  // Origem Mateiro (Mapa Celeste): gera a 2ª rolagem de Sobrevivência para escolha simultânea no modal
  socket.on('dice:mapaCelesteReroll', ({ campaignId, rollResult }) => {
    if (campaignId) {
      socket.join(campaignId);
    }
    const mc = rollResult?.mapaCelestePayload;
    if (!rollResult || !mc || !mc.canReroll || mc.secondRoll) return;

    const rawCount = Number(mc.diceCount ?? 1);
    const sides = Math.max(2, Number(mc.sides || 20));
    const modifier = Number(mc.modifier || 0);
    const isOrdemZeroDice = rollResult.system === 'ordem-paranormal' && sides === 20 && rawCount <= 0;
    const safeCount = isOrdemZeroDice ? getOrdemDiceRollCount(rawCount) : Math.max(1, Math.min(50, rawCount));

    const rolls2: number[] = [];
    for (let i = 0; i < safeCount; i++) {
      rolls2.push(Math.floor(Math.random() * sides) + 1);
    }
    const diceTotal2 = isOrdemZeroDice
      ? Math.min(...rolls2)
      : rollResult.system === 'ordem-paranormal' && sides === 20
      ? Math.max(...rolls2)
      : rolls2.reduce((a, b) => a + b, 0);
    const total2 = diceTotal2 + modifier;
    const modStr = modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '';
    const baseFormula2 = isOrdemZeroDice ? formatOrdemDiceLabel(rawCount) : `${safeCount}d${sides}`;

    const updatedResult: DiceRollResult = {
      ...rollResult,
      mapaCelestePayload: {
        ...mc,
        canReroll: false,
        firstRoll: mc.firstRoll || {
          rolls: rollResult.rolls,
          formula: rollResult.formula,
          modifier: rollResult.modifier,
          total: rollResult.total,
        },
        secondRoll: {
          rolls: rolls2,
          formula: `${baseFormula2}${modStr}`,
          modifier,
          total: total2,
        },
      },
    };

    if (rollResult.isSecret) {
      socket.emit('dice:rolled', updatedResult);
    } else {
      io.to(campaignId).emit('dice:rolled', updatedResult);
    }
  });

  // Origem Mateiro (Mapa Celeste): confirma qual das duas rolagens simultâneas o jogador escolheu
  socket.on('dice:mapaCelesteChoose', ({ campaignId, rollResult, chosenIndex }) => {
    if (campaignId) {
      socket.join(campaignId);
    }
    const mc = rollResult?.mapaCelestePayload;
    if (!rollResult || !mc || !mc.secondRoll || mc.chosenIndex) return;

    const firstOpt = mc.firstRoll || {
      rolls: rollResult.rolls,
      formula: rollResult.formula,
      modifier: rollResult.modifier,
      total: rollResult.total,
    };
    const firstTotal = firstOpt.total;
    const secondTotal = mc.secondRoll.total;
    const pickSecond = chosenIndex === 2;

    const finalRolls = pickSecond ? mc.secondRoll.rolls : firstOpt.rolls;
    const finalFormula = pickSecond ? mc.secondRoll.formula : firstOpt.formula;
    const finalTotal = pickSecond ? secondTotal : firstTotal;
    const baseLabel = rollResult.label.replace(/\s*\[✨ Mapa Celeste:.*\]$/i, '');

    const updatedResult: DiceRollResult = {
      ...rollResult,
      label: `${baseLabel} [✨ Mapa Celeste (-2 PE): escolheu ${finalTotal} (${firstTotal} vs ${secondTotal})]`,
      rolls: finalRolls,
      formula: finalFormula,
      total: finalTotal,
      mapaCelestePayload: {
        ...mc,
        canReroll: false,
        chosenIndex,
      },
    };

    if (rollResult.isSecret) {
      socket.emit('dice:rolled', updatedResult);
    } else {
      io.to(campaignId).emit('dice:rolled', updatedResult);
      if (campaignId) {
        recordCampaignActivity(io, {
          campaignId,
          characterId: rollResult.characterId,
          characterName: rollResult.characterName,
          category: 'ability',
          summary: `Usou ✨ Mapa Celeste (-2 PE) em ${baseLabel}: escolheu ${finalTotal} (${firstTotal} vs ${secondTotal})`,
          costText: '-2 PE',
          tone: 'info',
        });
      }
    }
  });

  // Mestre encerra a cena atual para limpar efeitos de duração "Cena"
  socket.on('scene:end', ({ campaignId }) => {
    io.to(campaignId).emit('scene:ended', {
      campaignId,
      timestamp: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
    unregisterSocketConnected(socket.id);
  });
});

async function startServer() {
  try {
    await initDatabasePragmas();
    await syncConfiguredAdmins();

    httpServer.listen(SERVER_PORT, '0.0.0.0', () => {
      console.log(
        `🚀 Servidor TotalRPG (HTTP + WebSocket) rodando na porta ${SERVER_PORT}${
          webDistDir ? ' [servindo frontend estático]' : ''
        }`
      );
    });
  } catch (err) {
    console.error('❌ Falha crítica ao iniciar o servidor TotalRPG:', err);
    process.exit(1);
  }
}

async function gracefulShutdown(signal: string) {
  console.log(`🛑 Recebido ${signal}. Encerrando conexões e sincronizando SQLite WAL...`);
  flushAdminTelemetry();
  httpServer.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

void startServer();