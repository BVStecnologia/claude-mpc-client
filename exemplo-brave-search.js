// Exemplo de como usar o servidor MCP do Brave Search com o cliente MPC do Claude
const axios = require('axios');
const { Client } = require('@modelcontextprotocol/sdk/client');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio');
const { spawn } = require('child_process');

// Função para fazer uma pesquisa usando o Brave Search
async function braveSearch(query) {
  try {
    console.log(`Pesquisando por: "${query}"`);
    
    // Iniciar o servidor MCP do Brave Search
    console.log('Iniciando servidor MCP do Brave Search...');
    const braveSearchServer = spawn('npx', ['-y', '@modelcontextprotocol/server-brave-search'], {
      env: {
        ...process.env,
        BRAVE_API_KEY: process.env.BRAVE_API_KEY
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Criar cliente MCP
    const transport = new StdioClientTransport(braveSearchServer.stdin, braveSearchServer.stdout);
    const client = new Client();
    
    try {
      // Conectar ao servidor MCP
      await client.connect(transport);
      console.log('Conectado ao servidor MCP do Brave Search');
      
      // Listar ferramentas disponíveis
      const tools = await client.listTools();
      console.log('Ferramentas disponíveis:', tools.map(tool => tool.name).join(', '));
      
      // Fazer a pesquisa
      console.log(`Executando pesquisa por: "${query}"...`);
      const searchResult = await client.callTool('web_search', {
        query,
        num_results: 5
      });
      
      // Processar resultados
      const results = JSON.parse(searchResult.content[0].text);
      
      console.log('Resultados da pesquisa:');
      console.log('------------------------');
      results.organic.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   URL: ${result.url}`);
      });
      
      return {
        query,
        results: results.organic.map(result => ({
          title: result.title,
          url: result.url,
          description: result.description
        }))
      };
    } finally {
      // Desconectar cliente e encerrar servidor
      await client.close();
      braveSearchServer.kill();
      console.log('Servidor MCP do Brave Search encerrado');
    }
  } catch (error) {
    console.error('Erro ao fazer a pesquisa:', error.message);
    if (error.response) {
      console.error('Detalhes do erro:', error.response.data);
    }
    return null;
  }
}

// Função para perguntar ao Claude sobre os resultados da pesquisa
async function askClaudeAboutSearchResults(query, searchResults) {
  try {
    // Preparar a mensagem para o Claude
    const messages = [
      {
        role: 'user',
        content: `Eu pesquisei por "${query}" e obtive os seguintes resultados:
${searchResults.results.map((result, index) => `${index + 1}. ${result.title} (${result.url})`).join('\n')}

Você pode me dar um resumo desses resultados e sugerir qual deles parece mais relevante para minha pesquisa?`
      }
    ];
    
    // Fazer a requisição para o Claude
    console.log('\nPerguntando ao Claude sobre os resultados...');
    const response = await axios.post('http://localhost:3000/api/claude/chat', {
      messages,
      model: 'claude-3-7-sonnet-20250219',
      max_tokens: 300
    });
    
    // Exibir a resposta do Claude
    console.log('\nResposta do Claude:');
    console.log('-------------------');
    if (response.data.content && Array.isArray(response.data.content)) {
      response.data.content.forEach(block => {
        if (block.type === 'text') {
          console.log(block.text);
        }
      });
    } else {
      console.log(response.data);
    }
  } catch (error) {
    console.error('Erro ao perguntar ao Claude:', error.message);
    if (error.response) {
      console.error('Detalhes do erro:', error.response.data);
    }
  }
}

// Função principal
async function main() {
  // Termo de pesquisa
  const query = 'inteligência artificial';
  
  // Fazer a pesquisa
  const searchResults = await braveSearch(query);
  
  if (searchResults) {
    // Perguntar ao Claude sobre os resultados
    await askClaudeAboutSearchResults(query, searchResults);
  }
}

// Executar o exemplo
main().catch(console.error);
