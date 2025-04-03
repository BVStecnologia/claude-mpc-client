// Servidor MCP para Brave Search
require('dotenv').config();
const { spawn } = require('child_process');

// Verificar se a chave API do Brave está configurada
if (!process.env.BRAVE_API_KEY) {
  console.error('Erro: BRAVE_API_KEY não configurada no ambiente');
  process.exit(1);
}

// Iniciar o servidor MCP do Brave Search
console.log('Iniciando servidor MCP do Brave Search...');

const braveSearchServer = spawn('npx', ['-y', '@modelcontextprotocol/server-brave-search'], {
  env: {
    ...process.env,
    BRAVE_API_KEY: process.env.BRAVE_API_KEY
  },
  stdio: 'inherit'
});

// Lidar com eventos do processo
braveSearchServer.on('error', (error) => {
  console.error('Erro ao iniciar o servidor MCP do Brave Search:', error);
});

braveSearchServer.on('close', (code) => {
  console.log(`Servidor MCP do Brave Search encerrado com código ${code}`);
});

// Lidar com sinais de encerramento
process.on('SIGINT', () => {
  console.log('Encerrando servidor MCP do Brave Search...');
  braveSearchServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Encerrando servidor MCP do Brave Search...');
  braveSearchServer.kill();
  process.exit(0);
});

console.log('Servidor MCP do Brave Search iniciado');
