# Claude MPC Client

Cliente MPC (Multi-Purpose Claude) para interagir com a API do Claude da Anthropic, incluindo suporte a ferramentas (function calling) e deploy simples no Fly.io.

## Funcionalidades

- Interação com a API Claude via endpoints RESTful
- Suporte a mensagens síncronas e streaming (SSE)
- Suporte a todas as versões dos modelos Claude 3
- Implementação de function calling (ferramentas)
- Tratamento detalhado de erros da API
- Configuração pronta para deploy no Fly.io

## Pré-requisitos

- Node.js 18 ou superior
- Conta na Anthropic com chave de API válida
- Conta no Fly.io (para deploy)

## Instalação local

1. Clone o repositório:
   ```bash
   git clone https://github.com/BVStecnologia/claude-mpc-client.git
   cd claude-mpc-client
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie um arquivo `.env` baseado no `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Adicione sua chave da API da Anthropic no arquivo `.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

5. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Endpoints da API

### Obter modelos disponíveis

```
GET /api/claude/models
```

Retorna uma lista dos modelos Claude disponíveis.

### Enviar mensagem (síncrono)

```
POST /api/claude/chat
```

Corpo da requisição:
```json
{
  "messages": [
    {"role": "user", "content": "Olá, Claude!"}
  ],
  "model": "claude-3-5-sonnet-latest",
  "max_tokens": 1024,
  "temperature": 0.7,
  "system": "Você é um assistente útil e amigável."
}
```

### Enviar mensagem (streaming)

```
POST /api/claude/chat/stream
```

Corpo da requisição: igual ao endpoint síncrono.

Retorna um stream de eventos SSE (Server-Sent Events).

### Exemplo de uso com ferramentas (function calling)

```json
{
  "messages": [
    {"role": "user", "content": "Qual é o clima em São Paulo hoje?"}
  ],
  "model": "claude-3-5-sonnet-latest",
  "max_tokens": 1024,
  "tools": [
    {
      "name": "get_weather",
      "description": "Obter informações sobre o clima atual",
      "input_schema": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "Nome da cidade"
          },
          "unit": {
            "type": "string",
            "enum": ["celsius", "fahrenheit"],
            "description": "Unidade de temperatura"
          }
        },
        "required": ["location"]
      }
    }
  ]
}
```

## Deploy para o Fly.io

1. Certifique-se de ter o CLI do Fly.io instalado e estar logado:
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. No diretório do projeto, execute:
   ```bash
   fly launch
   ```

3. Configure os segredos para a API key:
   ```bash
   fly secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

4. Faça o deploy:
   ```bash
   fly deploy
   ```

## Recursos Adicionais

- [Documentação da API do Claude](https://docs.anthropic.com/claude/reference/)
- [Documentação sobre ferramentas/function calling](https://docs.anthropic.com/claude/docs/tool-use)
- [Documentação do Fly.io](https://fly.io/docs/)

## Licença

MIT