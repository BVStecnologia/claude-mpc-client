const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { handleError } = require('../utils/errorHandler');
const router = express.Router();

// Inicializar cliente do Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Rota para enviar mensagens ao Claude (sem streaming)
router.post('/chat', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, system, tools } = req.body;
    
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
    
    // Adicionar ferramentas se fornecidas
    if (tools && Array.isArray(tools) && tools.length > 0) {
      params.tools = tools;
    }
    
    // Enviar requisição para a API do Claude
    const message = await anthropic.messages.create(params);
    
    res.json(message);
  } catch (error) {
    handleError(error, res);
  }
});

// Rota para streaming (SSE) de respostas do Claude
router.post('/chat/stream', async (req, res) => {
  try {
    const { messages, model, max_tokens, temperature, system, tools } = req.body;
    
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
    
    // Adicionar ferramentas se fornecidas
    if (tools && Array.isArray(tools) && tools.length > 0) {
      params.tools = tools;
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