# Plano: Tradutor de "Juridiquês" para o Cidadão

## Visão Geral

Sistema que consome publicações do Diário Oficial do Tocantins (DOE-TO), utiliza LLM via OpenRouter para gerar resumos em linguagem acessível ao cidadão comum, e disponibiliza através de uma interface web moderna com autenticação de usuários.

**Stack**: Node.js + Fastify (API) | ReactJS (Frontend) | PostgreSQL (Banco) | Docker (Infraestrutura) | OpenRouter (LLM)

---

## Arquitetura do Sistema

```
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
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Infraestrutura e Configuração Base

### 1.1 Estrutura de Pastas (Monorepo)

```
simplifica/
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── env.ts
│   │   │   └── openrouter.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.schema.ts
│   │   │   │   └── auth.middleware.ts
│   │   │   ├── publications/
│   │   │   │   ├── publications.controller.ts
│   │   │   │   ├── publications.service.ts
│   │   │   │   ├── publications.routes.ts
│   │   │   │   ├── publications.repository.ts
│   │   │   │   └── publications.schema.ts
│   │   │   └── summaries/
│   │   │       ├── summaries.controller.ts
│   │   │       ├── summaries.service.ts
│   │   │       ├── summaries.routes.ts
│   │   │       ├── summaries.repository.ts
│   │   │       └── summaries.schema.ts
│   │   ├── shared/
│   │   │   ├── interfaces/
│   │   │   ├── errors/
│   │   │   ├── utils/
│   │   │   └── types/
│   │   ├── jobs/
│   │   │   └── fetch-publications.job.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── features/
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Publications.tsx
│   │   │   └── PublicationDetail.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── contexts/
│   │   ├── types/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

### 1.2 Docker Compose

**Serviços**:
- `postgres`: PostgreSQL 16 com volume persistente
- `backend`: Node.js 20 com Fastify
- `frontend`: Node.js 20 com Vite/React
- `worker`: Job de sincronização com DOE-TO (pode ser o mesmo container do backend)

**Variáveis de Ambiente**:
```env
# Database
DATABASE_URL=postgresql://simplifica:simplifica123@postgres:5432/simplifica

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# DOE-TO API
DOE_API_URL=https://diariooficial.to.gov.br/api.json
DOE_SYNC_CRON=0 8 * * 1-5  # Segunda a sexta às 8h

# App
NODE_ENV=development
PORT=3333
CORS_ORIGIN=http://localhost:3000
```

---

## Fase 2: Backend (Node.js + Fastify)

### 2.1 Configuração Base

**Dependências principais**:
```json
{
  "dependencies": {
    "fastify": "^4.x",
    "@fastify/cors": "^9.x",
    "@fastify/jwt": "^7.x",
    "@fastify/swagger": "^8.x",
    "@fastify/swagger-ui": "^3.x",
    "@prisma/client": "^5.x",
    "zod": "^3.x",
    "bcryptjs": "^2.x",
    "axios": "^1.x",
    "node-cron": "^3.x",
    "pdf-parse": "^1.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "prisma": "^5.x",
    "vitest": "^1.x",
    "@types/node": "^20.x",
    "tsx": "^4.x"
  }
}
```

### 2.2 Banco de Dados (Prisma Schema)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}

model Publication {
  id          String   @id @default(uuid())
  doeId       String   @unique  // ID da API do DOE
  edition     String
  date        DateTime
  pages       Int
  fileSize    String
  downloadUrl String
  imageUrl    String?
  isSupplement Boolean @default(false)
  rawContent  String?  @db.Text  // Conteúdo extraído do PDF
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  summaries   Summary[]

  @@map("publications")
  @@index([date])
}

model Summary {
  id            String   @id @default(uuid())
  publicationId String
  content       String   @db.Text  // Resumo gerado pela IA
  model         String   // Modelo usado (ex: claude-3.5-sonnet)
  tokensUsed    Int?
  createdAt     DateTime @default(now())

  publication   Publication @relation(fields: [publicationId], references: [id])

  @@map("summaries")
  @@index([publicationId])
}
```

### 2.3 Módulos e Princípios SOLID

#### Módulo Auth
- **Responsabilidade**: Cadastro, login, gestão de sessão
- **Endpoints**:
  - `POST /api/auth/register` - Cadastro de usuário
  - `POST /api/auth/login` - Login
  - `GET /api/auth/me` - Dados do usuário logado
  - `POST /api/auth/logout` - Logout

#### Módulo Publications
- **Responsabilidade**: CRUD de publicações do DOE
- **Endpoints**:
  - `GET /api/publications` - Listar publicações (com paginação e filtros)
  - `GET /api/publications/:id` - Detalhe de uma publicação
  - `GET /api/publications/date/:date` - Publicações por data

#### Módulo Summaries
- **Responsabilidade**: Geração e consulta de resumos
- **Endpoints**:
  - `GET /api/summaries/:publicationId` - Resumo de uma publicação
  - `POST /api/summaries/generate/:publicationId` - Gerar resumo (admin)

#### Job de Sincronização
- **Responsabilidade**: Buscar novas publicações do DOE-TO
- **Funcionamento**:
  1. Consulta API do DOE-TO
  2. Compara com publicações já existentes
  3. Baixa PDFs novos
  4. Extrai texto do PDF
  5. Envia para OpenRouter gerar resumo
  6. Salva no banco

### 2.4 Serviço OpenRouter

```typescript
// Interface para abstrair o provedor de LLM
interface LLMService {
  generateSummary(content: string): Promise<LLMResponse>;
}

interface LLMResponse {
  content: string;
  model: string;
  tokensUsed: number;
}

// Implementação OpenRouter
class OpenRouterService implements LLMService {
  async generateSummary(content: string): Promise<LLMResponse> {
    // Chamada para OpenRouter API
    // Prompt especializado em traduzir juridiquês
  }
}
```

**Prompt System para OpenRouter**:
```
Você é um especialista em simplificar textos jurídicos brasileiros.
Sua tarefa é transformar decretos, leis e publicações oficiais em 
linguagem clara e acessível para o cidadão comum.

Regras:
1. Use linguagem simples, evite jargões jurídicos
2. Destaque quem é afetado pela medida
3. Explique prazos e datas importantes
4. Indique ações que o cidadão pode tomar
5. Mantenha o tom informativo e útil
6. Use no máximo 3 parágrafos
7. Inclua um título chamativo que resuma o impacto
```

### 2.5 Testes Backend

**Estratégia**:
- **Unitários**: Services, utils, validações
- **Integração**: Repositories, database operations
- **E2E**: Fluxos completos de API

**Ferramentas**: Vitest + Supertest

**Cobertura mínima**: 80%

---

## Fase 3: Frontend (React + TypeScript)

### 3.1 Stack Frontend

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "@tanstack/react-query": "^5.x",
    "axios": "^1.x",
    "zustand": "^4.x",
    "tailwindcss": "^3.x",
    "lucide-react": "^0.x",
    "react-hot-toast": "^2.x",
    "date-fns": "^3.x"
  },
  "devDependencies": {
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x",
    "typescript": "^5.x",
    "vitest": "^1.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x"
  }
}
```

### 3.2 Páginas e Componentes

#### Páginas
1. **Home** - Landing page com últimas publicações resumidas
2. **Login/Register** - Autenticação
3. **Publications** - Lista de publicações com filtros por data
4. **PublicationDetail** - Visualização completa com resumo IA

#### Componentes Principais
- `Layout` - Header, Footer, Sidebar
- `PublicationCard` - Card de publicação resumida
- `SummaryBadge` - Indicador de resumo disponível
- `DateFilter` - Filtro por período
- `SearchBar` - Busca por texto
- `LoadingSkeleton` - Estados de carregamento

### 3.3 Fluxo do Usuário

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────┐
│   Landing   │────▶│   Login/    │────▶│   Dashboard     │
│    Page     │     │  Register   │     │  (Publicações)  │
└─────────────┘     └─────────────┘     └────────┬────────┘
                                                 │
                                                 ▼
                                        ┌─────────────────┐
                                        │   Publication   │
                                        │    Detail +     │
                                        │   Summary IA    │
                                        └─────────────────┘
```

### 3.4 Testes Frontend

- **Unitários**: Hooks, utils, components isolados
- **Integration**: Fluxos de tela com React Testing Library

---

## Fase 4: Integração e Jobs

### 4.1 Job de Sincronização com DOE-TO

**Fluxo**:
```
1. Cron job executa (seg-sex às 8h)
2. GET https://diariooficial.to.gov.br/api.json
3. Para cada publicação:
   a. Verifica se já existe (por doeId)
   b. Se nova: baixa PDF do link
   c. Extrai texto com pdf-parse
   d. Envia para OpenRouter com prompt
   e. Salva publication + summary no banco
4. Log de execução
```

### 4.2 Tratamento de Erros

- Retry automático para falhas de rede
- Fila de processamento para publicações pendentes
- Logs estruturados com Pino
- Notificação de falhas críticas

---

## Fase 5: Docker e Deploy

### 5.1 docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: simplifica
      POSTGRES_USER: simplifica
      POSTGRES_PASSWORD: simplifica123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U simplifica"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: ../docker/Dockerfile.backend
    ports:
      - "3333:3333"
    environment:
      DATABASE_URL: postgresql://simplifica:simplifica123@postgres:5432/simplifica
      JWT_SECRET: ${JWT_SECRET}
      OPENROUTER_API_KEY: ${OPENROUTER_API_KEY}
      OPENROUTER_MODEL: anthropic/claude-3.5-sonnet
      DOE_API_URL: https://diariooficial.to.gov.br/api.json
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/src:/app/src

  frontend:
    build:
      context: ./frontend
      dockerfile: ../docker/Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      VITE_API_URL: http://localhost:3333
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 5.2 Dockerfiles

**Backend** (multi-stage):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 3333
CMD ["node", "dist/server.js"]
```

**Frontend** (multi-stage):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

---

## Cronograma Sugerido

| Fase | Descrição | Duração Estimada |
|------|-----------|------------------|
| 1 | Infraestrutura Docker + Config base | 2 dias |
| 2 | Backend - Auth + Publications | 3 dias |
| 3 | Backend - Summaries + OpenRouter | 2 dias |
| 4 | Job de sincronização DOE-TO | 2 dias |
| 5 | Frontend - Estrutura + Auth | 2 dias |
| 6 | Frontend - Publicações + Resumos | 3 dias |
| 7 | Testes (Backend + Frontend) | 3 dias |
| 8 | Integração final + Ajustes | 2 dias |
| **Total** | | **~19 dias** |

---

## Decisões Técnicas

### ✅ Incluído no Escopo
- Autenticação JWT com refresh token
- Sincronização automática com DOE-TO
- Geração de resumos via OpenRouter
- Interface responsiva com Tailwind
- Testes unitários e de integração
- Documentação Swagger da API
- Docker para desenvolvimento e produção

### ❌ Fora do Escopo (Futuro)
- Notificações (email/push)
- Múltiplos estados brasileiros
- Busca full-text avançada
- Sistema de favoritos
- API pública para terceiros
- Administração de usuários (painel admin)

---

## Próximos Passos

1. **Aprovação do plano** pelo usuário
2. **Configuração do ambiente** de desenvolvimento
3. **Criação do projeto** com estrutura de pastas
4. **Implementação faseada** conforme cronograma

---

## Verificação

### Checklist de Entrega
- [ ] Docker Compose funcional (postgres + backend + frontend)
- [ ] API REST documentada (Swagger)
- [ ] Autenticação JWT funcionando
- [ ] Sincronização com DOE-TO operacional
- [ ] Geração de resumos via OpenRouter
- [ ] Interface React responsiva
- [ ] Testes com cobertura > 80%
- [ ] README com instruções de setup
