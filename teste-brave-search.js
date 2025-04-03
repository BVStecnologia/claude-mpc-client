// Teste simples do servidor MCP do Brave Search
require('dotenv').config();
const { spawn } = require('child_process');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio');

async function testBraveSearch() {
  console.log('Iniciando teste do Brave Search...');
  
  // Verificar se a chave API do Brave está configurada
  if (!process.env.BRAVE_API_KEY) {
    console.error('Erro: BRAVE_API_KEY não configurada no ambiente');
    process.exit(1);
  }
  
  console.log('BRAVE_API_KEY encontrada:', process.env.BRAVE_API_KEY.substring(0, 5) + '...');
  
  // Iniciar o servidor MCP do Brave Search
  console.log('Iniciando servidor MCP do Brave Search...');
  const braveSearchServer = spawn('npx', ['-y', '@modelcontextprotocol/server-brave-search'], {
    env: {
      ...process.env,
      BRAVE_API_KEY: process.env.BRAVE_API_KEY
    },
    stdio: ['pipe', 'pipe', 'inherit'] // Redirecionar stderr para o console
  });
  
  // Criar cliente MCP
  const transport = new StdioClientTransport(braveSearchServer.stdin, braveSearchServer.stdout);
  const client = new Client();
  
  try {
    // Conectar ao servidor MCP
    console.log('Conectando ao servidor MCP...');
    await client.connect(transport);
    console.log('Conectado ao servidor MCP do Brave Search');
    
    // Listar ferramentas disponíveis
    console.log('Listando ferramentas disponíveis...');
    const tools = await client.listTools();
    console.log('Ferramentas disponíveis:', tools.map(tool => tool.name).join(', '));
    
    // Fazer uma pesquisa simples
    const query = 'inteligência artificial';
    console.log(`Executando pesquisa por: "${query}"...`);
    
    const searchResult = await client.callTool('web_search', {
      query,
      num_results: 3
    });
    
    console.log('Resultado da pesquisa:');
    console.log(JSON.stringify(searchResult, null, 2));
    
    console.log('Teste concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o teste:', error);
  } finally {
    // Desconectar cliente e encerrar servidor
    console.log('Encerrando conexão...');
    await client.close();
    braveSearchServer.kill();
    console.log('Servidor MCP do Brave Search encerrado');
  }
}

// Executar o teste
testBraveSearch().catch(error => {
  console.error('Erro não tratado:', error);
  process.exit(1);
});
