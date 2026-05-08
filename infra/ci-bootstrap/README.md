# CI bootstrap (GitHub OIDC + deploy roles)

This Serverless stack provisions **IAM only** for GitHub Actions:

- `AWS::IAM::OIDCProvider` for `https://token.actions.githubusercontent.com`
- `GithubActionsDeployDevRole` — trust: `repo:EduardoDePatta/ticketing-serverless-api:environment:dev` **or** `repo:EduardoDePatta/ticketing-serverless-api:ref:refs/heads/main`
- `GithubActionsDeployProdRole` — trust: `repo:EduardoDePatta/ticketing-serverless-api:environment:prod`

Each role has an inline policy scoped to deploy the **application** stack for its stage (`ticketing-serverless-api-dev*` / `ticketing-serverless-api-prod*`). The application itself stays in the root [`serverless.ts`](../../serverless.ts).

## Prerequisites

- Node.js 20+
- AWS credentials with permission to create IAM OIDC providers and roles (typically an admin user for this **one-time** bootstrap)
- Serverless Framework v4 (`npm install` at repo root)

## One-time manual cleanup (if you created OIDC / roles in the console)

To avoid **AlreadyExists** conflicts, delete the **old** resources before deploying this stack:

1. IAM → Roles: remove any GitHub deploy role you no longer want (for example the previous manual role).
2. IAM → Identity providers: remove `token.actions.githubusercontent.com` if it already exists in this account.

Then deploy this stack so **IaC owns** the OIDC provider.

## Deploy (from repository root)

```bash
npm run bootstrap:deploy
```

This runs `serverless deploy` with `--config infra/ci-bootstrap/serverless.ts --stage shared`.

## Outputs → GitHub Secrets

After deploy, open CloudFormation stack **`ticketing-ci-bootstrap-shared`** (or check CLI outputs) and copy:

| Output            | Use in GitHub Actions                                                    |
| ----------------- | ------------------------------------------------------------------------ |
| `DevRoleArn`      | Repository secret `AWS_GITHUB_ACTIONS_ROLE_ARN` for the **dev** workflow |
| `ProdRoleArn`     | Use when you add a **prod** workflow (separate secret or env-specific)   |
| `OidcProviderArn` | Reference only; workflows assume the **role** ARN, not the OIDC ARN      |

## Update or remove

- **Update** trust or permissions: edit [`serverless.ts`](./serverless.ts), then run `npm run bootstrap:deploy` again.
- **Tear down** (only if you are sure): `npm run bootstrap:remove` — this removes the OIDC provider and both roles; GitHub deploys will stop until you re-bootstrap.

## Repo / account changes

If the GitHub org, repo, or AWS account changes, update `GITHUB_ORG_REPO` and redeploy this stack. Role names (`ticketing-github-actions-deploy-dev` / `prod`) can conflict if they already exist in the account; remove the old roles or change `RoleName` in the template.
