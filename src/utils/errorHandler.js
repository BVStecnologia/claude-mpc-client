const Anthropic = require('@anthropic-ai/sdk');

/**
 * Manipula erros da API do Anthropic e retorna respostas apropriadas
 * @param {Error} error - O erro capturado
 * @param {Object} res - O objeto de resposta do Express
 */
function handleError(error, res) {
  console.error('Erro na API do Claude:', error);
  
  // Tratamento específico para erros da API do Anthropic
  if (error instanceof Anthropic.APIError) {
    const statusCode = error.status || 500;
    const errorType = error.name || 'APIError';
    
    return res.status(statusCode).json({
      error: errorType,
      message: error.message,
      request_id: error.headers?.['request-id']
    });
  }
  
  // Erros de conexão
  if (error instanceof Anthropic.APIConnectionError) {
    return res.status(503).json({
      error: 'ConnectionError',
      message: 'Falha na conexão com a API do Claude',
      details: error.message
    });
  }
  
  // Timeout
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return res.status(504).json({
      error: 'TimeoutError',
      message: 'Timeout na conexão com a API do Claude',
      details: error.message
    });
  }
  
  // Erros não mapeados
  return res.status(500).json({
    error: 'InternalServerError',
    message: 'Erro interno do servidor',
    details: error.message
  });
}

module.exports = {
  handleError
};