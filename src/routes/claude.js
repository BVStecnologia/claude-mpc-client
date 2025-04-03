const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const { handleError } = require('../utils/errorHandler');
const router = express.Router();

// Inicializar cliente do Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Ferramenta de pesquisa do Brave Search
const braveSearchTool = {
  name: 'brave_search',
  description: 'Pesquisar na web usando o Brave Search',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Termo de pesquisa'
      },
      num_results: {
        type: 'number',
        description: 'Número de resultados a retornar (1-10)',
        minimum: 1,
        maximum: 10
      }
    },
    required: ['query']
  }
};

// Função para processar o resultado da ferramenta brave_search
async function processBraveSearchToolUse(toolUse) {
  try {
    const { query, num_results = 3 } = toolUse.input;
    
    // Fazer a requisição para a API do Brave Search
    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count: num_results
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_API_KEY
      }
    });
    
    // Formatar os resultados para retornar ao Claude
    const results = response.data;
    const webResults = results.web.results.map((result, index) => ({
      title: result.title,
      url: result.url,
      description: result.description
    }));
    
    return {
      results: webResults,
      query: query,
      total_results: webResults.length
    };
  } catch (error) {
    console.error('Erro ao processar brave_search:', error);
    return {
      error: 'Falha ao realizar a pesquisa',
      message: error.message
    };
  }
}

// Rota para enviar mensagens ao Claude (sem streaming)
router.post('/chat', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, system, tools: userTools } = req.body;
    
    // Validar entrada
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensagens inválidas' });
    }
    
    // Configurar parâmetros para a requisição
    const params = {
      model: model || 'claude-3-5-sonnet-latest',
      max_tokens: max_tokens || 1024,
      messages: messages,
      temperature: temperature || 0.7,
    };
    
    // Adicionar system prompt se fornecido
    if (system) {
      params.system = system;
    }
    
    // Adicionar ferramentas
    const defaultTools = [braveSearchTool];
    
    // Combinar ferramentas padrão com ferramentas fornecidas pelo usuário
    if (userTools && Array.isArray(userTools) && userTools.length > 0) {
      params.tools = [...defaultTools, ...userTools];
    } else {
      params.tools = defaultTools;
    }
    
    // Enviar requisição para a API do Claude
    let message = await anthropic.messages.create(params);
    
    // Verificar se o Claude está usando uma ferramenta
    if (message.stop_reason === 'tool_use') {
      // Encontrar o bloco de uso de ferramenta
      const toolUseBlock = message.content.find(block => block.type === 'tool_use');
      
      if (toolUseBlock && toolUseBlock.name === 'brave_search') {
        // Processar o uso da ferramenta brave_search
        const toolResult = await processBraveSearchToolUse(toolUseBlock);
        
        // Criar uma nova mensagem com o resultado da ferramenta
        const updatedMessages = [
          ...messages,
          {
            role: 'assistant',
            content: message.content
          },
          {
            role: 'user',
            content: [
              {
                type: 'tool_result',
                tool_use_id: toolUseBlock.id,
                content: JSON.stringify(toolResult, null, 2)
              }
            ]
          }
        ];
        
        // Enviar nova requisição para o Claude com o resultado da ferramenta
        message = await anthropic.messages.create({
          model: params.model,
          max_tokens: params.max_tokens,
          messages: updatedMessages,
          temperature: params.temperature,
          tools: params.tools,
          system: params.system
        });
      }
    }
    
    res.json(message);
  } catch (error) {
    handleError(error, res);
  }
});

// Rota para streaming (SSE) de respostas do Claude
router.post('/chat/stream', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, system, tools: userTools } = req.body;
    
    // Validar entrada
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Mensagens inválidas' });
    }
    
    // Configurar cabeçalhos para SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Configurar parâmetros para a requisição
    const params = {
      model: model || 'claude-3-5-sonnet-latest',
      max_tokens: max_tokens || 1024,
      messages: messages,
      temperature: temperature || 0.7,
      stream: true,
    };
    
    // Adicionar system prompt se fornecido
    if (system) {
      params.system = system;
    }
    
    // Adicionar ferramentas
    const defaultTools = [braveSearchTool];
    
    // Combinar ferramentas padrão com ferramentas fornecidas pelo usuário
    if (userTools && Array.isArray(userTools) && userTools.length > 0) {
      params.tools = [...defaultTools, ...userTools];
    } else {
      params.tools = defaultTools;
    }
    
    // Iniciar streaming
    const stream = await anthropic.messages.create(params);
    
    // Processar eventos do stream
    for await (const messageEvent of stream) {
      // Enviar evento SSE
      res.write(`data: ${JSON.stringify(messageEvent)}\n\n`);
      
      // Verificar se a conexão foi fechada pelo cliente
      if (res.writableEnded) {
        break;
      }
    }
    
    // Encerrar stream com evento específico
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (error) {
    // Enviar erro como evento SSE
    res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
    res.end();
  }
});

// Rota para obter modelos disponíveis
router.get('/models', (req, res) => {
  // Lista dos modelos atuais do Claude
  const models = [
    {
      id: 'claude-3-opus-20240229',
      name: 'Claude 3 Opus',
      description: 'Most powerful model for highly complex tasks',
      contextWindow: 200000,
    },
    {
      id: 'claude-3-sonnet-20240229',
      name: 'Claude 3 Sonnet',
      description: 'Balanced model for most tasks',
      contextWindow: 200000,
    },
    {
      id: 'claude-3-haiku-20240307',
      name: 'Claude 3 Haiku',
      description: 'Fastest and most compact model',
      contextWindow: 200000,
    },
    {
      id: 'claude-3-5-sonnet-20240620',
      name: 'Claude 3.5 Sonnet',
      description: 'Latest Sonnet model with advanced reasoning',
      contextWindow: 200000,
    }
  ];
  
  res.json({ models });
});

module.exports = router;
