import type { AWS } from "@serverless/typescript";

const APP_SERVICE = "ticketing-serverless-api";
const GITHUB_ORG_REPO = "EduardoDePatta/ticketing-serverless-api";

const githubOidcThumbprints = [
  "6938fd4e7eeef6c523223fd8fe6e891a3c9144cb",
  "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
];

type DeployStage = "dev" | "prod";

function buildServerlessDeployPolicyDocument(params: {
  stage: DeployStage;
}): Record<string, unknown> {
  const { stage } = params;
  const stackPrefix = `${APP_SERVICE}-${stage}`;
  const secretNamePrefix = `${APP_SERVICE}/${stage}/`;

  return {
    Version: "2012-10-17",
    Statement: [
      {
        Sid: "StsReadIdentity",
        Effect: "Allow",
        Action: ["sts:GetCallerIdentity"],
        Resource: "*",
      },
      {
        Sid: "CloudFormationAppStack",
        Effect: "Allow",
        Action: ["cloudformation:*"],
        Resource: [
          {
            "Fn::Sub": `arn:aws:cloudformation:\${AWS::Region}:\${AWS::AccountId}:stack/${stackPrefix}*/*`,
          },
        ],
      },
      {
        Sid: "S3ServerlessArtifacts",
        Effect: "Allow",
        Action: [
          "s3:CreateBucket",
          "s3:DeleteBucket",
          "s3:ListBucket",
          "s3:GetBucketLocation",
          "s3:GetBucketVersioning",
          "s3:PutBucketVersioning",
          "s3:PutLifecycleConfiguration",
          "s3:GetEncryptionConfiguration",
          "s3:PutEncryptionConfiguration",
          "s3:GetBucketPolicy",
          "s3:PutBucketPolicy",
          "s3:DeleteBucketPolicy",
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucketMultipartUploads",
          "s3:AbortMultipartUpload",
        ],
        Resource: [
          { "Fn::Sub": "arn:aws:s3:::serverless-framework-deployments-${AWS::AccountId}-*" },
          { "Fn::Sub": "arn:aws:s3:::serverless-framework-deployments-${AWS::AccountId}-*/*" },
          { "Fn::Sub": `arn:aws:s3:::${stackPrefix}*` },
          { "Fn::Sub": `arn:aws:s3:::${stackPrefix}*/*` },
        ],
      },
      {
        Sid: "LambdaApp",
        Effect: "Allow",
        Action: ["lambda:*"],
        Resource: [
          {
            "Fn::Sub": `arn:aws:lambda:\${AWS::Region}:\${AWS::AccountId}:function:${stackPrefix}-*`,
          },
        ],
      },
      {
        Sid: "LogsApp",
        Effect: "Allow",
        Action: ["logs:*"],
        Resource: [
          {
            "Fn::Sub": `arn:aws:logs:\${AWS::Region}:\${AWS::AccountId}:log-group:/aws/lambda/${stackPrefix}-*`,
          },
          {
            "Fn::Sub": `arn:aws:logs:\${AWS::Region}:\${AWS::AccountId}:log-group:/aws/lambda/${stackPrefix}-*:*`,
          },
        ],
      },
      {
        Sid: "DynamoDbAppTables",
        Effect: "Allow",
        Action: ["dynamodb:*"],
        Resource: [
          {
            "Fn::Sub": `arn:aws:dynamodb:\${AWS::Region}:\${AWS::AccountId}:table/${stackPrefix}-*`,
          },
          {
            "Fn::Sub": `arn:aws:dynamodb:\${AWS::Region}:\${AWS::AccountId}:table/${stackPrefix}-*/index/*`,
          },
        ],
      },
      {
        Sid: "SecretsManagerApp",
        Effect: "Allow",
        Action: ["secretsmanager:*"],
        Resource: [
          {
            "Fn::Sub": `arn:aws:secretsmanager:\${AWS::Region}:\${AWS::AccountId}:secret:${secretNamePrefix}*`,
          },
        ],
      },
      {
        Sid: "IamForLambdaRoles",
        Effect: "Allow",
        Action: [
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:PassRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:GetRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:TagRole",
          "iam:UntagRole",
          "iam:UpdateAssumeRolePolicy",
        ],
        Resource: [
          {
            "Fn::Sub": `arn:aws:iam::\${AWS::AccountId}:role/${stackPrefix}-*`,
          },
        ],
      },
      {
        Sid: "ApiGatewayRegional",
        Effect: "Allow",
        Action: ["apigateway:*"],
        Resource: [
          {
            "Fn::Sub": "arn:aws:apigateway:${AWS::Region}::/*",
          },
        ],
      },
      {
        Sid: "ApiGatewayV2Regional",
        Effect: "Allow",
        Action: ["apigatewayv2:*"],
        Resource: [
          {
            "Fn::Sub": "arn:aws:apigateway:${AWS::Region}::/*",
          },
        ],
      },
      {
        Sid: "EventBridgeRules",
        Effect: "Allow",
        Action: ["events:*"],
        Resource: [
          {
            "Fn::Sub": `arn:aws:events:\${AWS::Region}:\${AWS::AccountId}:rule/${stackPrefix}-*`,
          },
          {
            "Fn::Sub": "arn:aws:events:${AWS::Region}:${AWS::AccountId}:event-bus/default",
          },
        ],
      },
      {
        Sid: "LambdaInvokePermissionManagement",
        Effect: "Allow",
        Action: ["lambda:AddPermission", "lambda:RemovePermission"],
        Resource: [
          {
            "Fn::Sub": `arn:aws:lambda:\${AWS::Region}:\${AWS::AccountId}:function:${stackPrefix}-*`,
          },
        ],
      },
      {
        Sid: "SsmPublicParameters",
        Effect: "Allow",
        Action: [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
          "ssm:PutParameter",
        ],
        Resource: [
          "arn:aws:ssm:us-east-1::parameter/aws/service/*",
          {
            "Fn::Sub": "arn:aws:ssm:${AWS::Region}::parameter/aws/service/*",
          },
          {
            "Fn::Sub":
              "arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/serverless-framework/deployment/s3-bucket",
          },
        ],
      },
    ],
  };
}

function buildGithubActionsTrustStatements(params: {
  oidcProviderLogicalId: string;
  subjectPatterns: string[];
}): Record<string, unknown>[] {
  const { oidcProviderLogicalId, subjectPatterns } = params;
  const federated: Record<string, unknown> = { "Fn::GetAtt": [oidcProviderLogicalId, "Arn"] };

  return subjectPatterns.map((sub) => ({
    Effect: "Allow",
    Principal: { Federated: federated },
    Action: "sts:AssumeRoleWithWebIdentity",
    Condition: {
      StringEquals: {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      },
      StringLike: {
        "token.actions.githubusercontent.com:sub": sub,
      },
    },
  }));
}

const serverlessConfiguration: AWS = {
  service: "ticketing-ci-bootstrap",
  frameworkVersion: "4",
  provider: {
    name: "aws",
    region: "us-east-1",
    stage: "${opt:stage, 'shared'}",
  },
  resources: {
    Resources: {
      GithubOidcProvider: {
        Type: "AWS::IAM::OIDCProvider",
        Properties: {
          Url: "https://token.actions.githubusercontent.com",
          ClientIdList: ["sts.amazonaws.com"],
          ThumbprintList: githubOidcThumbprints,
        },
      },
      GithubActionsDeployDevRole: {
        Type: "AWS::IAM::Role",
        Properties: {
          RoleName: "ticketing-github-actions-deploy-dev",
          AssumeRolePolicyDocument: {
            Version: "2012-10-17",
            Statement: buildGithubActionsTrustStatements({
              oidcProviderLogicalId: "GithubOidcProvider",
              subjectPatterns: [
                `repo:${GITHUB_ORG_REPO}:environment:dev`,
                `repo:${GITHUB_ORG_REPO}:ref:refs/heads/main`,
              ],
            }),
          },
          Policies: [
            {
              PolicyName: "ServerlessDeployDevPolicy",
              PolicyDocument: buildServerlessDeployPolicyDocument({ stage: "dev" }),
            },
          ],
        },
      },
      GithubActionsDeployProdRole: {
        Type: "AWS::IAM::Role",
        Properties: {
          RoleName: "ticketing-github-actions-deploy-prod",
          AssumeRolePolicyDocument: {
            Version: "2012-10-17",
            Statement: buildGithubActionsTrustStatements({
              oidcProviderLogicalId: "GithubOidcProvider",
              subjectPatterns: [`repo:${GITHUB_ORG_REPO}:environment:prod`],
            }),
          },
          Policies: [
            {
              PolicyName: "ServerlessDeployProdPolicy",
              PolicyDocument: buildServerlessDeployPolicyDocument({ stage: "prod" }),
            },
          ],
        },
      },
    },
    Outputs: {
      OidcProviderArn: {
        Description: "ARN of the GitHub OIDC identity provider",
        Value: { "Fn::GetAtt": ["GithubOidcProvider", "Arn"] },
        Export: {
          Name: "TicketingCiBootstrap-OidcProviderArn",
        },
      },
      DevRoleArn: {
        Description: "IAM role ARN for GitHub Actions to deploy the dev stage",
        Value: { "Fn::GetAtt": ["GithubActionsDeployDevRole", "Arn"] },
        Export: {
          Name: "TicketingCiBootstrap-DevRoleArn",
        },
      },
      ProdRoleArn: {
        Description: "IAM role ARN for GitHub Actions to deploy the prod stage",
        Value: { "Fn::GetAtt": ["GithubActionsDeployProdRole", "Arn"] },
        Export: {
          Name: "TicketingCiBootstrap-ProdRoleArn",
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
