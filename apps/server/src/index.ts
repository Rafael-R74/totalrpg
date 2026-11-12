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

const app = express();


app.use(cors({ origin: '*' }));
app.use(express.json());

// Registramos as rotas de autenticação sob o prefixo /api/auth
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/characters', charactersRouter);
app.use('/api/compendium', compendiumRouter);
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

  // Entrada de usuário (Jogador, Mestre ou 2º Monitor) na sala da campanha
  socket.on('session:join', ({ campaignId, role }) => {
    socket.join(campaignId);
    console.log(`🎲 Socket ${socket.id} entrou na sala [${campaignId}] como [${role}]`);
  });

  // Atualização simples de barra vital (protótipo)
  socket.on('vital:change', ({ campaignId, bar }) => {
    socket.to(campaignId).emit('vital:updated', bar);
  });

  // Sincronização em tempo real quando uma ficha sofre alteração (Vida, Condição, Inventário)
  socket.on('character:sync', ({ campaignId, characterId }) => {
    socket.to(campaignId).emit('character:updated', { characterId });
  });

  // Sincronização em tempo real quando o Mestre altera as Travas de Ficha (Sheet Lockdown)
  socket.on('campaign:syncPermissions', ({ campaignId, permissions }) => {
    socket.to(campaignId).emit('campaign:permissionsUpdated', permissions);
  });

  // Motor de rolagem de dados (com suporte a Rolagem Secreta do Mestre)
  socket.on('dice:roll', ({ campaignId, characterName, label, count, sides, modifier, system, isSecret }) => {
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
      // Rolagem Secreta: devolve apenas para o computador do Mestre que rolou
      socket.emit('dice:rolled', result);
    } else {
      // Rolagem Pública: transmite para todos na sala da campanha
      io.to(campaignId).emit('dice:rolled', result);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

const PORT = 3333;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor TotalRPG (HTTP + WebSocket) rodando em http://localhost:${PORT}`);
});