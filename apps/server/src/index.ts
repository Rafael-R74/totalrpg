import http from 'node:http';
import { SystemId, VitalBar } from '@totalrpg/shared';

// Testando nosso pacote compartilhado com tipagem do TypeScript!
const activeSystems: SystemId[] = ['tormenta20', 'ordem-paranormal', 'duna'];

const exampleBar: VitalBar = {
  id: 'pv',
  label: 'Pontos de Vida',
  current: 45,
  max: 45,
  color: '#dc2626'
};

// Criando o servidor HTTP básico
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    status: 'TotalRPG Server Online!',
    supportedSystems: activeSystems,
    testVitalBar: exampleBar
  }));
});

const PORT = 3333;
server.listen(PORT, () => {
  console.log(`🎲 Servidor do TotalRPG rodando em http://localhost:${PORT}`);
});