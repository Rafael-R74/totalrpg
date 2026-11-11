import http from 'node:http';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  DiceRollResult
} from '@totalrpg/shared';

// 1. Criamos o servidor HTTP base do Node
const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ status: 'TotalRPG Realtime Server Online!' }));
});

// 2. Acoplamos o Socket.io ao servidor HTTP, passando nossos moldes do @totalrpg/shared
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*', // Libera o nosso React (porta 5173) para conectar aqui sem bloqueio
  }
});

// 3. 'connection' dispara toda vez que alguém abre o site no navegador
io.on('connection', (socket) => {
  console.log(`🔌 Novo dispositivo conectado! ID: ${socket.id}`);

  // Quando o usuário entra em uma Aventura específica (Sala isolada)
  socket.on('session:join', ({ campaignId, role }) => {
    socket.join(campaignId); // Coloca essa pessoa dentro da "sala" daquela aventura
    console.log(`🎲 Socket ${socket.id} entrou na aventura [${campaignId}] como [${role}]`);
  });

  // Quando alguém altera uma barra de vida/mana/sanidade
  socket.on('vital:change', ({ campaignId, bar }) => {
    // io.to(campaignId) envia a nova barra para TODOS que estão na mesma aventura!
    io.to(campaignId).emit('vital:updated', bar);
  });

  // Quando alguém clica para rolar dados
  socket.on('dice:roll', ({ campaignId, characterName, label, sides, count, modifier, system }) => {
    // Sorteia cada dado individualmente no servidor (para ninguém trapacear no navegador!)
    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    // Calcula o resultado dependendo do sistema
    let diceTotal = 0;
    if (system === 'ordem-paranormal') {
      // Em Ordem Paranormal, rola vários d20 e pega o MAIOR valor!
      diceTotal = Math.max(...rolls);
    } else {
      // Nos demais por padrão, soma os dados rolados
      diceTotal = rolls.reduce((acc, curr) => acc + curr, 0);
    }

    const finalResult: DiceRollResult = {
      id: Math.random().toString(36).substring(2, 9),
      characterName,
      label,
      formula: `${count}d${sides}${modifier >= 0 ? '+' + modifier : modifier}`,
      rolls,
      total: diceTotal + modifier,
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      system
    };

    // Envia o resultado da rolagem para a tela do Mestre, dos Jogadores e do 2º Monitor!
    io.to(campaignId).emit('dice:rolled', finalResult);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Dispositivo desconectado: ${socket.id}`);
  });
});

const PORT = 3333;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor Realtime rodando em http://localhost:${PORT}`);
});