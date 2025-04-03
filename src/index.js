require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Anthropic = require('@anthropic-ai/sdk');
const claudeRoutes = require('./routes/claude');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Verificar API key
app.use((req, res, next) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ 
      error: 'ANTHROPIC_API_KEY não configurada no ambiente' 
    });
  }
  next();
});

// Rotas
app.use('/api/claude', claudeRoutes);

// Rota padrão para verificar se o servidor está rodando
app.get('/', (req, res) => {
  res.json({ 
    message: 'Claude MPC Client rodando!',
    version: '1.0.0'
  });
});

// Tratamento de erros
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: err.message
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});