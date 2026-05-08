# Ticketing Serverless API

HTTP API for **events** and **ticket orders**, running on AWS with **Lambda**, **API Gateway HTTP API**, and **DynamoDB**. Authentication uses **JWT** (access + refresh), and payments are exercised through a **local simulator** (no real charges).

[![Node.js](https://img.shields.io/badge/node-%3E%3D20-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Serverless Framework](https://img.shields.io/badge/Serverless-v4-FD5750?logo=serverless&logoColor=white)](https://www.serverless.com/)
[![AWS](https://img.shields.io/badge/AWS-Lambda%20%7C%20DynamoDB-232F3E?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)

---

## Overview

| Area       | What it does                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| **Health** | `GET /health` for a simple service check                                                                         |
| **Auth**   | Register, login, refresh, logout, and profile (`/auth/*`) with `CUSTOMER` and `ORGANIZER` roles                  |
| **Events** | Event CRUD: public read/list endpoints; create, update, and delete require **organizer**                         |
| **Orders** | Customers create, fetch, and **pay** orders with card simulation (idempotency required for write operations)     |
| **Infra**  | DynamoDB tables, Secrets Manager (password pepper and JWT signing key), scheduled job to clean up expired orders |

JSON responses follow a common envelope: success returns `{ "status", "message", "data" }` (`status` is numeric and aligned with HTTP); errors include `traceId` for API Gateway correlation.

---

## Prerequisites

- **Node.js 20+**
- **AWS account** with configured credentials (for example, via `aws configure` or SDK-compatible environment variables)
- **Serverless Framework v4** (`npx serverless` uses the project version after `npm install`)

---

## Getting Started

```bash
git clone https://github.com/EduardoDePatta/ticketing-serverless-api.git
cd ticketing-serverless-api
npm install
```

Local verification (types + tests):

```bash
npm run typecheck
npm test
```

---

## npm Scripts

| Script                     | Description                                                        |
| -------------------------- | ------------------------------------------------------------------ |
| `npm test`                 | Jest suite                                                         |
| `npm run test:watch`       | Jest in watch mode                                                 |
| `npm run typecheck`        | `tsc --noEmit` (strict mode)                                       |
| `npm run deploy:dev`       | Deploy with `dev` stage                                            |
| `npm run deploy:prod`      | Deploy with `prod` stage                                           |
| `npm run remove:dev`       | Remove `dev` stage stack                                           |
| `npm run bootstrap:deploy` | Deploy CI bootstrap stack (OIDC + GitHub deploy IAM roles) once    |
| `npm run bootstrap:remove` | Remove CI bootstrap stack (breaks GitHub OIDC deploy until re-run) |

Deployment provisions Lambdas (Node 20, **arm64**), HTTP API, DynamoDB, and secrets as defined in `serverless.ts` and `serverless/resources/`. After deployment, use the **HTTP API** URL emitted by CloudFormation / Serverless output as the base URL for requests.

---

## CI/CD bootstrap (one-time)

GitHub Actions deploys to AWS using **OIDC** (no long-lived AWS keys in the repo). The OIDC provider and the IAM roles that `serverless deploy` assumes are defined as **IaC** in a separate Serverless service so CI identity is versioned and reproducible:

- Stack config: [`infra/ci-bootstrap/serverless.ts`](infra/ci-bootstrap/serverless.ts)
- Detailed steps: [`infra/ci-bootstrap/README.md`](infra/ci-bootstrap/README.md)

**Summary**

1. If you previously created `token.actions.githubusercontent.com` or a GitHub deploy role manually in IAM, **delete those** so this stack can own them (avoids `AlreadyExists`).
2. From the repo root, with admin-level AWS credentials: `npm run bootstrap:deploy`.
3. Copy stack output **`DevRoleArn`** into GitHub repository secret **`AWS_GITHUB_ACTIONS_ROLE_ARN`** (used by [`.github/workflows/deploy-dev.yml`](.github/workflows/deploy-dev.yml)). Keep **`ProdRoleArn`** for a future prod workflow.
4. Ensure GitHub repository secrets **`SERVERLESS_ACCESS_KEY`** (Serverless Framework v4) and environment **`dev`** protection rules match your trust policy (`environment:dev`).

The **dev** workflow deploys `--stage dev` on pushes to `main`. A **prod** workflow can reuse the same pattern with GitHub environment `prod` and the **`ProdRoleArn`** output.

---

## HTTP Routes

| Method   | Path               | Auth                 | Notes                                           |
| -------- | ------------------ | -------------------- | ----------------------------------------------- |
| `GET`    | `/health`          | —                    |                                                 |
| `POST`   | `/auth/register`   | —                    | JSON body: email, password, name, role          |
| `POST`   | `/auth/login`      | —                    |                                                 |
| `POST`   | `/auth/refresh`    | —                    |                                                 |
| `POST`   | `/auth/logout`     | Bearer               |                                                 |
| `GET`    | `/auth/me`         | Bearer               |                                                 |
| `POST`   | `/events`          | Bearer **ORGANIZER** |                                                 |
| `GET`    | `/events`          | —                    | Public listing                                  |
| `GET`    | `/events/{id}`     | —                    |                                                 |
| `PUT`    | `/events/{id}`     | Bearer **ORGANIZER** |                                                 |
| `DELETE` | `/events/{id}`     | Bearer **ORGANIZER** |                                                 |
| `POST`   | `/orders`          | Bearer **CUSTOMER**  | **`Idempotency-Key` header** (UUID)             |
| `GET`    | `/orders/{id}`     | Bearer **CUSTOMER**  |                                                 |
| `POST`   | `/orders/{id}/pay` | Bearer **CUSTOMER**  | **`Idempotency-Key` header**; payment simulator |

Authenticated routes use `Authorization: Bearer <accessToken>`.

### Idempotency

`POST /orders` and `POST /orders/{id}/pay` **require** the `Idempotency-Key` header. The same key with the same payload returns the cached response; the same key with a different payload results in **422**.

### Payment (Simulator)

There are no external charge calls: the payment flow is simulated. Luhn-valid cards tend to be approved; the test cards documented in the Postman collection trigger decline or processing-error scenarios.

---

## Postman

Importable collection: [`postman/ticketing-api.postman_collection.json`](postman/ticketing-api.postman_collection.json).

1. **Import** in Postman -> select the JSON file.
2. Set the **`baseUrl`** collection variable to your HTTP API URL after deployment.
3. Register/login automatically populate `accessToken` and `refreshToken` (test scripts on those requests).

---

## Repository Structure (Summary)

| Folder / file           | Contents                                                |
| ----------------------- | ------------------------------------------------------- |
| `serverless.ts`         | Main Serverless configuration                           |
| `serverless/functions/` | Registration for each Lambda (path, method, authorizer) |
| `serverless/resources/` | CloudFormation (DynamoDB, secrets)                      |
| `infra/ci-bootstrap/`   | CI-only Serverless stack (GitHub OIDC + deploy roles)   |
| `src/functions/`        | HTTP handlers (thin; delegate to services)              |
| `src/services/`         | Business rules                                          |
| `src/repositories/`     | Data access (DynamoDB)                                  |
| `tests/`                | Jest tests (handlers, validation, helpers)              |

---

## License

[ISC](package.json) - see the `license` field in `package.json`.

---

## Links

- [Issues](https://github.com/EduardoDePatta/ticketing-serverless-api/issues)
- [Repository](https://github.com/EduardoDePatta/ticketing-serverless-api)
