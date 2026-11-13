import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  DiceRollResult
} from '@totalrpg/shared';
import { authRouter } from './routes/auth';
import { campaignsRouter } from './routes/campaigns';
import { charactersRouter } from './routes/characters';
import { compendiumRouter } from './routes/compendium'; 
import path from 'path';
import uploadsRouter from './routes/uploads';

const app = express();

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Serve os arquivos de imagem enviados pelos usuários
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Registramos as rotas de autenticação sob o prefixo /api/auth
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/compendium', compendiumRouter);
app.use('/api/uploads', uploadsRouter);
// Rota de teste básica da API
app.get('/api/health', (req, res) => {
  res.json({ status: 'TotalRPG Backend & Database 100% Operacionais!' });
});

const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id}`);

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

  socket.on('campaign:syncPermissions', ({ campaignId, permissions }) => {
    socket.to(campaignId).emit('campaign:permissionsUpdated', permissions);
  });

  // Mestre solicita Teste de Iniciativa para todos os jogadores da campanha
  socket.on('combat:requestInitiative', ({ campaignId }) => {
    socket.to(campaignId).emit('combat:initiativeRequested', { campaignId });
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
    }) => {
      const safeCount = Math.max(1, Math.min(50, count));
      const rolls: number[] = [];

      for (let i = 0; i < safeCount; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }

      let diceTotal = 0;
      if (system === 'ordem-paranormal' && sides === 20) {
        diceTotal = Math.max(...rolls);
      } else {
        diceTotal = rolls.reduce((acc, curr) => acc + curr, 0);
      }

      const total = diceTotal + modifier;
      const modString = modifier !== 0 ? (modifier > 0 ? `+${modifier}` : `${modifier}`) : '';

      const result: DiceRollResult = {
        id: Math.random().toString(36).substring(2, 9),
        rollerUserId,
        characterId,
        isInitiativeRoll: Boolean(isInitiativeRoll),
        characterName,
        label,
        formula: `${safeCount}d${sides}${modString}`,
        rolls,
        modifier,
        total,
        system,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        isSecret: Boolean(isSecret),
      };

      if (isSecret) {
        socket.emit('dice:rolled', result);
      } else {
        io.to(campaignId).emit('dice:rolled', result);
      }

      // Se esta rolagem foi um Teste de Iniciativa, envia o resultado para a fila de combate da mesa!
      if (isInitiativeRoll && characterId) {
        io.to(campaignId).emit('combat:initiativeSubmitted', {
          characterId,
          characterName,
          initiative: total,
        });
      }
    }
  );

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

const PORT = 3333;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor TotalRPG (HTTP + WebSocket) rodando em http://localhost:${PORT}`);
});