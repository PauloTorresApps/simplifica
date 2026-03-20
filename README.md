# 🇧🇷 Simplifica - Tradutor de Juridiquês para o Cidadão

Sistema que transforma decretos e publicações oficiais do Diário Oficial do Tocantins (DOE-TO) em resumos claros e acessíveis, utilizando Inteligência Artificial.

## 🎯 Visão Geral

O Simplifica consome publicações do Diário Oficial do Tocantins via API, utiliza LLM (Large Language Model) via OpenRouter para gerar resumos em linguagem acessível ao cidadão comum, e disponibiliza através de uma interface web moderna com autenticação de usuários.

### Exemplo

**Texto Original:**
> DECRETO Nº 12.345, DE 15 DE MARÇO DE 2026 - Dispõe sobre a isenção de alíquota do ICMS na operação de saída de implementos agrícolas destinados à atividade rural...

**Versão Simplificada:**
> 🚜 **Atenção, produtor rural!** O governo isentou o ICMS na compra de implementos agrícolas como tratores e colheitadeiras. Isso pode representar uma economia de até 18%!

## 🏗️ Arquitetura

```text
┌─────────────────────────────────────────────────────────────────┐
│                        DOCKER COMPOSE                           │
│                                                                 │
│  ┌──────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │ Frontend │───▶│   Backend    │───▶│    PostgreSQL         │  │
│  │  (React) │    │  (Fastify)   │    │                       │  │
│  │  :3000   │    │   :3333      │    │    :5432              │  │
│  └──────────┘    └──────┬───────┘    └───────────────────────┘  │
│                         │                                       │
│                         ▼                                       │
│                  ┌──────────────┐    ┌───────────────────────┐  │
│                  │   OpenRouter │    │   DOE-TO API          │  │
│                  │   (LLM API)  │    │   (Fonte de dados)    │  │
│                  └──────────────┘    └───────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 🛠️ Stack Tecnológico

### Backend

- **Runtime**: Node.js 20
- **Framework**: Fastify
- **ORM**: Prisma
- **Banco**: PostgreSQL 16
- **Validação**: Zod
- **Autenticação**: JWT (@fastify/jwt)
- **Documentação**: Swagger (@fastify/swagger)
- **Testes**: Vitest + Supertest

### Frontend

- **Framework**: React 18
- **Build**: Vite
- **Estilização**: Tailwind CSS
- **Estado**: React Query + Context API
- **Roteamento**: React Router v6
- **Testes**: Vitest + React Testing Library

### Infraestrutura

- **Containerização**: Docker + Docker Compose
- **LLM**: OpenRouter (Claude 3.5 Sonnet)
- **E-mail (desenvolvimento)**: MailHog

## 📁 Estrutura do Projeto

```text
simplifica/
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── backend/
│   ├── src/
│   │   ├── config/          # Configurações (env, database, openrouter)
│   │   ├── modules/
│   │   │   ├── auth/        # Autenticação (login, register, me)
│   │   │   ├── publications/# Publicações do DOE
│   │   │   └── summaries/   # Resumos gerados por IA
│   │   ├── shared/          # Erros, tipos, utils
│   │   ├── jobs/            # Job de sincronização
│   │   ├── app.ts           # Configuração do Fastify
│   │   └── server.ts        # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Schema do banco
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizáveis
│   │   ├── pages/           # Páginas da aplicação
│   │   ├── hooks/           # Custom hooks
│   │   ├── services/        # Serviços de API
│   │   ├── contexts/        # Contextos React
│   │   └── types/           # Tipos TypeScript
│   └── public/
└── README.md
```

## 🚀 Como Executar

### Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 20+ (para desenvolvimento local)
- Conta no [OpenRouter](https://openrouter.ai) com API key

### 1. Clone o repositório

```bash
git clone <repo-url>
cd simplifica
```

### 2. Configure as variáveis de ambiente

```bash
cp backend/.env.example backend/.env
```

Edite o arquivo `backend/.env` e configure:

```env
# Database
DATABASE_URL=postgresql://simplifica:simplifica123@postgres:5432/simplifica

# JWT
JWT_SECRET=replace-with-a-random-secret-with-at-least-64-characters-and-high-entropy
JWT_EXPIRES_IN=7d

# OpenRouter (obtenha em https://openrouter.ai)
OPENROUTER_API_KEY=sk-or-v1-sua-api-key-aqui
OPENROUTER_MODEL=openrouter/hunter-alpha
OPENROUTER_FALLBACK_MODEL=openrouter/auto,openai/gpt-oss-120b:free,nvidia/nemotron-3-super-120b-a12b:free
OPENROUTER_PROVIDER_SORT_BY=throughput
OPENROUTER_PROVIDER_SORT_PARTITION=model

# Recuperação de senha e SMTP (MailHog)
PASSWORD_RESET_TOKEN_EXPIRY_MINUTES=10
PASSWORD_RESET_URL=http://localhost:3000/reset-password
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@simplifica.local
SMTP_FROM_NAME=Simplifica

# DOE-TO API
DOE_API_URL=https://diariooficial.to.gov.br/api.json
DOE_SYNC_CRON=0 8 * * 1-5

# App
NODE_ENV=development
PORT=3333
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000
```

### 3. Inicie os containers

```bash
cd docker
docker compose up -d
```

### 4. Execute as migrations

```bash
docker compose exec backend npx prisma migrate dev
```

### 5. Acesse a aplicação

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3333](http://localhost:3333)
- **Documentação Swagger**: [http://localhost:3333/docs](http://localhost:3333/docs)
- **Health Check**: [http://localhost:3333/health](http://localhost:3333/health)
- **MailHog (Inbox de e-mails)**: [http://localhost:8025](http://localhost:8025)

### Testar envio e recebimento de e-mails (MailHog)

Com o Docker em execução, o MailHog captura todos os e-mails enviados pelo backend via SMTP de desenvolvimento.

1. Acesse a interface do MailHog em [http://localhost:8025](http://localhost:8025)
2. Solicite recuperação de senha na aplicação
3. Verifique o e-mail recebido no MailHog e clique no link de redefinição

Observação: se o backend estiver rodando em container (`docker compose`), o host SMTP interno é `mailhog` (já configurado no `docker-compose.yml`). Se estiver rodando localmente (`npm run dev`), use `localhost:1025` no `backend/.env`.

## 📚 API Endpoints

### Autenticação

| Método | Endpoint | Descrição | Auth |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Registrar novo usuário | ❌ |
| POST | `/api/auth/login` | Login | ❌ |
| POST | `/api/auth/logout` | Encerrar sessão | ❌ |
| GET | `/api/auth/me` | Dados do usuário logado | ✅ |

Observação: autenticação é baseada em cookie `httpOnly` (`auth_token`) com `SameSite=Lax`.

### Publicações

| Método | Endpoint | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/api/publications` | Listar publicações | ✅ |
| GET | `/api/publications/:id` | Detalhe da publicação | ✅ |
| GET | `/api/publications/date/:date` | Publicações por data | ✅ |

### Resumos

| Método | Endpoint | Descrição | Auth |
| --- | --- | --- | --- |
| GET | `/api/summaries/:publicationId` | Resumos da publicação | ✅ |
| POST | `/api/summaries/generate/:publicationId` | Gerar resumo | ✅ |

## 🧪 Testes

### Backend Tests

```bash
cd backend
npm test                 # Executar testes
npm run test:watch       # Modo watch
npm run test:coverage    # Com cobertura
```

### Frontend Tests

```bash
cd frontend
npm test                 # Executar testes
npm run test:watch       # Modo watch
npm run test:coverage    # Com cobertura
```

## 🔧 Desenvolvimento

### Executar em modo desenvolvimento

```bash
# Backend (com hot reload)
cd backend
npm run dev

# Frontend (com hot reload)
cd frontend
npm run dev
```

### Comandos úteis

```bash
# Backend
npm run db:migrate       # Executar migrations
npm run db:generate      # Gerar Prisma Client
npm run db:studio        # Abrir Prisma Studio
npm run lint             # Verificar código
npm run lint:fix         # Corrigir código

# Docker
docker compose up -d     # Iniciar containers
docker compose down      # Parar containers
docker compose logs -f   # Ver logs
```

## 📊 Banco de Dados

### Tabelas

- **users**: Usuários do sistema
- **publications**: Publicações do DOE-TO
- **summaries**: Resumos gerados pela IA

### Diagrama ER

```text
┌─────────────┐       ┌─────────────────┐       ┌─────────────┐
│    users    │       │  publications   │       │  summaries  │
├─────────────┤       ├─────────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)         │       │ id (PK)     │
│ email       │       │ doe_id (UNIQUE) │       │ publication │
│ password    │       │ edition         │       │   _id (FK)  │
│ name        │       │ date            │       │ content     │
│ created_at  │       │ pages           │       │ model       │
│ updated_at  │       │ file_size       │       │ tokens_used │
└─────────────┘       │ download_url    │       │ created_at  │
                      │ image_url       │       └─────────────┘
                      │ is_supplement   │              │
                      │ raw_content     │◀─────────────┘
                      │ created_at      │
                      │ updated_at      │
                      └─────────────────┘
```

## 🔄 Job de Sincronização

O sistema executa automaticamente um job que:

1. Consulta a API do DOE-TO (`https://diariooficial.to.gov.br/api.json`)
2. Identifica novas publicações
3. Baixa e extrai o conteúdo dos PDFs
4. Envia para OpenRouter gerar resumos
5. Salva tudo no banco de dados

**Agendamento**: Segunda a sexta às 8h (configurável via `DOE_SYNC_CRON`)

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a licença MIT.

## 👥 Autores

- Desenvolvido com ❤️ para o cidadão brasileiro

## 🙏 Agradecimentos

- [OpenRouter](https://openrouter.ai) pela API de LLM
- [Diário Oficial do Tocantins](https://diariooficial.to.gov.br) pela API pública
- Comunidade open source pelas ferramentas utilizadas
