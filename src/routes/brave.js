const express = require('express');
const axios = require('axios');
const { handleError } = require('../utils/errorHandler');
const router = express.Router();

// Rota para fazer uma pesquisa no Brave Search
router.post('/search', async (req, res) => {
  try {
    const { query, num_results = 5 } = req.body;
    
    // Validar entrada
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query inválida' });
    }
    
    // Fazer a requisição diretamente para a API do Brave Search
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
    
    res.json(response.data);
  } catch (error) {
    handleError(error, res);
  }
});

// Rota para fazer uma pesquisa no Brave Search e perguntar ao Claude sobre os resultados
router.post('/search-and-analyze', async (req, res) => {
  try {
    const { query, num_results = 5, model = 'claude-3-7-sonnet-20250219', max_tokens = 300 } = req.body;
    
    // Validar entrada
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query inválida' });
    }
    
    // Fazer a requisição diretamente para a API do Brave Search
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
    
    const results = response.data;
    
    // Preparar mensagem para o Claude
    const messages = [
      {
        role: 'user',
        content: `Eu pesquisei por "${query}" e obtive os seguintes resultados:
${results.web.results.map((result, index) => `${index + 1}. ${result.title} (${result.url})
   ${result.description}`).join('\n\n')}

Você pode me dar um resumo desses resultados e sugerir qual deles parece mais relevante para minha pesquisa?`
      }
    ];
    
    // Inicializar cliente do Anthropic
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    // Enviar requisição para a API do Claude
    const claudeResponse = await anthropic.messages.create({
      model: model,
      max_tokens: max_tokens,
      messages: messages
    });
    
    // Retornar resultados da pesquisa e análise do Claude
    res.json({
      search_results: results,
      claude_analysis: claudeResponse
    });
  } catch (error) {
    handleError(error, res);
  }
});

module.exports = router;
