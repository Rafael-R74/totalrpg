import http from 'node:http';
import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  DiceRollResult
} from '@totalrpg/shared';


const httpServer = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ status: 'TotalRPG Realtime Server Online!' }));
});


const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*', 
  }
});


io.on('connection', (socket) => {
  console.log(`🔌 Novo dispositivo conectado! ID: ${socket.id}`);


  socket.on('session:join', ({ campaignId, role }) => {
    socket.join(campaignId);
    console.log(`🎲 Socket ${socket.id} entrou na aventura [${campaignId}] como [${role}]`);
  });


  socket.on('vital:change', ({ campaignId, bar }) => {

    io.to(campaignId).emit('vital:updated', bar);
  });


  socket.on('dice:roll', ({ campaignId, characterName, label, sides, count, modifier, system }) => {

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }


    let diceTotal = 0;
    if (system === 'ordem-paranormal') {

      diceTotal = Math.max(...rolls);
    } else {

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