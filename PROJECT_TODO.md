# Ticketing Serverless API — estado e backlog

Última revisão: alinhado ao código actual (auth, eventos, encomendas, pagamento simulado, idempotência, testes).

---

## Concluído

### Infra e IaC

- [x] Serverless Framework v4, Node.js 20, região e stage configuráveis
- [x] DynamoDB: eventos, encomendas, pagamentos, idempotência, utilizadores, refresh tokens
- [x] Secrets Manager (pepper JWT, assinatura de tokens)
- [x] IAM por recursos em `serverless/iam/statements.ts`
- [x] Configuração modular em `serverless/` + `serverless.ts`

### Domínio Eventos

- [x] Entidade, validação Zod, `EventRepository`, `EventService`
- [x] Rotas HTTP: criar, listar, obter, atualizar, apagar evento
- [x] Testes de handlers e serviço

### Domínio Encomendas e pagamento

- [x] Entidades Order / Payment, repositórios, `OrderService`, `PaymentService`
- [x] `POST /orders`, `GET /orders/{id}`, `POST /orders/{id}/pay` com cartão **simulado** (não Stripe Checkout)
- [x] Idempotência (`Idempotency-Key`) com hash canónico de JSON + compatibilidade legado
- [x] Limpeza de encomendas expiradas (Lambda agendada)

### Auth

- [x] Registo, login, refresh, logout, `GET /me`
- [x] Authorizer JWT HTTP API
- [x] Argon2id via `hash-wasm` (compatível com bundle Serverless)

### Qualidade

- [x] Jest + cobertura ampla em `tests/`
- [x] Coleção Postman em `postman/ticketing-api.postman_collection.json`

---

## Backlog sugerido

### Produto / integrações

- [ ] Substituir ou complementar pagamento simulado por **Stripe** (Checkout ou Payment Intents + webhooks), se for requisito de produto
- [ ] Retenção explícita de logs CloudWatch por stage
- [ ] Endurecer separação dev/prod (variáveis, limites, alarms)

### CI/CD

- [ ] Workflow GitHub Actions (instalar, testar, `serverless deploy` por branch/stage)
- [ ] Secrets no GitHub para deploy

### Observabilidade

- [ ] Logging estruturado (nível, correlacionar `traceId` em todas as ramificações)
- [ ] Métricas/alarms (taxa de erro 5xx, duração Lambda)

### Documentação

- [ ] README com visão geral, variáveis de ambiente, fluxo de deploy e exemplos de pedidos
- [ ] Vídeo ou walkthrough (ex.: Loom), se necessário para entrega

### Revisão final

- [ ] Passagem de segurança (secrets, permissões IAM mínimas, headers sensíveis)
- [ ] Teste manual ou E2E contra stage deployado
