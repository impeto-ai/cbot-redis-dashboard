# 📈 CBOT Redis Dashboard

Um dashboard em tempo real para dados de mercado de commodities, câmbio e curva de dólar, integrado com Redis e construído com Next.js 15.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-brightgreen) ![Next.js](https://img.shields.io/badge/Next.js-15-black) ![Redis](https://img.shields.io/badge/Redis-Upstash-red) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)

## 🚀 Funcionalidades

### 📊 Dados de Mercado em Tempo Real
- **B3 (Bolsa de Valores do Brasil)**: Contratos futuros de milho (CCM)
- **CBOT (Chicago Board of Trade)**: Milho (ZC), Soja (ZS), Trigo (ZW), Óleo de Soja (ZL), Farelo de Soja (ZM)
- **Câmbio**: USD/BRL, EUR/BRL
- **Curva de Dólar**: Vencimentos de 7D a 600D

### 🔧 Recursos Técnicos
- ✅ **Integração Redis**: Cache inteligente com Upstash
- ✅ **Atualizações em Tempo Real**: Dados atualizados automaticamente
- ✅ **Interface Responsiva**: Design adaptável para desktop e mobile
- ✅ **Correção de Hidratação**: Compatível com extensões do navegador
- ✅ **Error Boundaries**: Tratamento robusto de erros
- ✅ **Performance**: Cache otimizado e carregamento eficiente

## 🛠️ Tecnologias

### Frontend
- **Next.js 15**: Framework React com App Router
- **TypeScript**: Tipagem estática
- **Tailwind CSS**: Estilização utilitária
- **Shadcn/ui**: Componentes UI modernos

### Backend & Dados
- **Redis (Upstash)**: Armazenamento e cache de dados
- **REST API**: Endpoints para dados de mercado
- **Streaming Data**: Integração com feeds de mercado

### DevOps & Infraestrutura
- **Vercel**: Deploy e hosting
- **GitHub Actions**: CI/CD (configurar se necessário)
- **Environment Variables**: Configuração segura

## 📋 Pré-requisitos

- Node.js 18+ 
- npm, yarn ou pnpm
- Conta Upstash (Redis)
- Git

## ⚡ Instalação e Configuração

### 1. Clone o Repositório
```bash
git clone https://github.com/impeto-ai/cbot-redis-dashboard.git
cd cbot-redis-dashboard
```

### 2. Instale as Dependências
```bash
npm install
# ou
yarn install
# ou
pnpm install
```

### 3. Configure as Variáveis de Ambiente
Crie um arquivo `.env.local` na raiz do projeto:

```env
# Redis Configuration (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# StreamerFeed Configuration  
LOGIN_STREAMERFEED=your-login
SENHA_STREAMERFEED=your-password
URL_STREAMFERFEED=your-feed-url

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Execute o Projeto
```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
```

Acesse http://localhost:3000 para ver o dashboard.

## 📁 Estrutura do Projeto

```
cbot-redis-dashboard/
├── app/                          # App Router (Next.js 15)
│   ├── api/                     # API Routes
│   │   └── redis/              # Endpoints Redis
│   ├── components/             # Componentes da página
│   ├── globals.css            # Estilos globais
│   ├── layout.tsx            # Layout principal
│   └── page.tsx             # Página inicial
├── components/              # Componentes reutilizáveis
│   ├── ui/                 # Componentes UI (shadcn)
│   ├── Dashboard.tsx      # Dashboard principal
│   ├── MarketTables.tsx  # Tabelas de mercado
│   └── ...
├── lib/                   # Utilitários e configurações
│   ├── redis.ts          # Cliente Redis
│   └── utils.ts         # Funções utilitárias
├── types/               # Definições TypeScript
├── utils/              # Utilitários específicos
└── hooks/             # Custom React Hooks
```

## 🔌 API Endpoints

### GET /api/redis
Retorna todos os dados de mercado em cache.

**Response:**
```json
{
  "data": {
    "b3:CCMF26": { /* dados do contrato */ },
    "cbot:ZCH6": { /* dados do contrato */ },
    "cambio:DOL COM": { /* dados de câmbio */ }
  },
  "timestamp": 1650000000000
}
```

### GET /api/redis/keys
Lista todas as chaves disponíveis no Redis.

### GET /api/redis/value?key=chave
Retorna o valor específico de uma chave.

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Manual
```bash
npm run build
npm start
```

## 🔧 Desenvolvimento

### Scripts Disponíveis
```bash
npm run dev          # Desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # Linting
npm run type-check   # Verificação de tipos
```

### Estrutura de Dados

Os dados são organizados por fonte:
- `b3:*` - Contratos da B3
- `cbot:*` - Contratos do CBOT  
- `cambio:*` - Taxas de câmbio
- `dollar:*` - Curva de dólar

## 🐛 Resolução de Problemas

### Erro de Hidratação
O projeto inclui correções para problemas de hidratação causados por extensões do navegador. Se ainda encontrar problemas:

1. Desative extensões temporariamente
2. Limpe o cache do navegador
3. Verifique o console para erros específicos

### Problemas de Conexão Redis
1. Verifique as variáveis de ambiente
2. Confirme as credenciais do Upstash
3. Teste a conectividade da rede

## 📈 Performance

### Métricas
- **First Load**: ~2s
- **Redis Cache Hit**: ~100ms
- **Data Refresh**: 30s interval
- **Bundle Size**: ~500KB

### Otimizações
- Cache Redis inteligente
- Lazy loading de componentes
- Compressão de dados
- Bundle splitting automático

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 📞 Contato

- **Repositório**: [github.com/impeto-ai/cbot-redis-dashboard](https://github.com/impeto-ai/cbot-redis-dashboard)
- **Issues**: [github.com/impeto-ai/cbot-redis-dashboard/issues](https://github.com/impeto-ai/cbot-redis-dashboard/issues)

## 🙏 Agradecimentos

- [Next.js](https://nextjs.org/) - Framework React
- [Upstash](https://upstash.com/) - Redis Cloud
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [Shadcn/ui](https://ui.shadcn.com/) - Component Library

---

⭐ Se este projeto foi útil, considere dar uma estrela no GitHub! 