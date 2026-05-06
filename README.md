# Ticketing Serverless API

API HTTP para **eventos** e **pedidos de ingressos**, rodando na AWS com **Lambda**, **API Gateway HTTP API** e **DynamoDB**. Autenticação via **JWT** (access + refresh), pagamentos exercitados por um **simulador local** (sem cobranças reais).

[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Serverless Framework](https://img.shields.io/badge/Serverless-v4-FD5750?logo=serverless&logoColor=white)](https://www.serverless.com/)
[![AWS](https://img.shields.io/badge/AWS-Lambda%20%7C%20DynamoDB-232F3E?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)

---

## Visão geral

| Área        | O que faz                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Saúde**   | `GET /health` para verificação simples do serviço                                                                             |
| **Auth**    | Registro, login, refresh, logout e perfil (`/auth/*`) com papéis `CUSTOMER` e `ORGANIZER`                                     |
| **Eventos** | CRUD de eventos: leitura/listagem públicas; criar, atualizar e remover exigem **organizador**                                 |
| **Pedidos** | Clientes criam pedidos, consultam e **pagam** com simulador de cartão (idempotência obrigatória nas escritas)                 |
| **Infra**   | Tabelas DynamoDB, Secrets Manager (pepper de senha e chave de assinatura JWT), job agendado para limpeza de pedidos expirados |

Respostas JSON seguem um envelope comum: sucesso em `{ "status", "message", "data" }` (`status` numérico alinhado ao HTTP); erros incluem `traceId` para correlação com o API Gateway.

---

## Pré-requisitos

- **Node.js 20+**
- **Conta AWS** com credenciais configuradas (por exemplo `aws configure` ou variáveis de ambiente compatíveis com o SDK)
- **Serverless Framework v4** (`npx serverless` usa o do projeto após `npm install`)

---

## Começando

```bash
git clone https://github.com/EduardoDePatta/ticketing-serverless-api.git
cd ticketing-serverless-api
npm install
```

Verificação local (tipos + testes):

```bash
npm run typecheck
npm test
```

---

## Scripts npm

| Script                | Descrição                    |
| --------------------- | ---------------------------- |
| `npm test`            | Suite Jest                   |
| `npm run test:watch`  | Jest em modo watch           |
| `npm run typecheck`   | `tsc --noEmit` (modo strict) |
| `npm run deploy:dev`  | Deploy com stage `dev`       |
| `npm run deploy:prod` | Deploy com stage `prod`      |
| `npm run remove:dev`  | Remove stack do stage `dev`  |

O deploy provisiona Lambdas (Node 20, **arm64**), HTTP API, DynamoDB e secrets conforme `serverless.ts` e `serverless/resources/`. Após o deploy, use a URL do **HTTP API** emitida pelo CloudFormation / saída do Serverless como base das chamadas.

---

## Rotas HTTP

| Método   | Caminho            | Auth                 | Notas                                                |
| -------- | ------------------ | -------------------- | ---------------------------------------------------- |
| `GET`    | `/health`          | —                    |                                                      |
| `POST`   | `/auth/register`   | —                    | Corpo JSON: email, password, name, role              |
| `POST`   | `/auth/login`      | —                    |                                                      |
| `POST`   | `/auth/refresh`    | —                    |                                                      |
| `POST`   | `/auth/logout`     | Bearer               |                                                      |
| `GET`    | `/auth/me`         | Bearer               |                                                      |
| `POST`   | `/events`          | Bearer **ORGANIZER** |                                                      |
| `GET`    | `/events`          | —                    | Listagem pública                                     |
| `GET`    | `/events/{id}`     | —                    |                                                      |
| `PUT`    | `/events/{id}`     | Bearer **ORGANIZER** |                                                      |
| `DELETE` | `/events/{id}`     | Bearer **ORGANIZER** |                                                      |
| `POST`   | `/orders`          | Bearer **CUSTOMER**  | **Header `Idempotency-Key`** (UUID)                  |
| `GET`    | `/orders/{id}`     | Bearer **CUSTOMER**  |                                                      |
| `POST`   | `/orders/{id}/pay` | Bearer **CUSTOMER**  | **Header `Idempotency-Key`**; simulador de pagamento |

Rotas autenticadas usam `Authorization: Bearer <accessToken>`.

### Idempotência

`POST /orders` e `POST /orders/{id}/pay` **exigem** o header `Idempotency-Key`. A mesma chave com o mesmo payload devolve a resposta em cache; a mesma chave com payload diferente resulta em **422**.

### Pagamento (simulador)

Não há chamadas externas de cobrança: o fluxo de pagamento é simulado. Cartões Luhn-válidos tendem a aprovar; os cartões de teste documentados na coleção Postman disparam cenários de recusa ou erro de processamento.

---

## Postman

Coleção importável em [`postman/ticketing-api.postman_collection.json`](postman/ticketing-api.postman_collection.json).

1. **Import** no Postman → selecionar o JSON.
2. Ajustar a variável de coleção **`baseUrl`** para a URL do seu HTTP API após o deploy.
3. Registrar/login preenche automaticamente `accessToken` e `refreshToken` (scripts de teste nos requests).

---

## Estrutura do repositório (resumo)

| Pasta / arquivo         | Conteúdo                                           |
| ----------------------- | -------------------------------------------------- |
| `serverless.ts`         | Configuração principal Serverless                  |
| `serverless/functions/` | Registro de cada Lambda (path, método, authorizer) |
| `serverless/resources/` | CloudFormation (DynamoDB, secrets)                 |
| `src/functions/`        | Handlers HTTP (finos; delegam a serviços)          |
| `src/services/`         | Regras de negócio                                  |
| `src/repositories/`     | Acesso a dados (DynamoDB)                          |
| `tests/`                | Testes Jest (handlers, validação, helpers)         |

---

## Licença

[ISC](package.json) — veja o campo `license` em `package.json`.

---

## Links

- [Issues](https://github.com/EduardoDePatta/ticketing-serverless-api/issues)
- [Repositório](https://github.com/EduardoDePatta/ticketing-serverless-api)
