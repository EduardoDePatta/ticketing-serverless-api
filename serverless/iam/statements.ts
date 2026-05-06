export const iamRoleStatements = [
  {
    Effect: "Allow",
    Action: [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:Scan",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
    ],
    Resource: [
      {
        "Fn::GetAtt": ["EventsTable", "Arn"],
      },
      {
        "Fn::GetAtt": ["OrdersTable", "Arn"],
      },
      {
        "Fn::Join": ["/", [{ "Fn::GetAtt": ["OrdersTable", "Arn"] }, "index/*"]],
      },
      {
        "Fn::GetAtt": ["PaymentsTable", "Arn"],
      },
      {
        "Fn::Join": ["/", [{ "Fn::GetAtt": ["PaymentsTable", "Arn"] }, "index/*"]],
      },
      {
        "Fn::GetAtt": ["IdempotencyTable", "Arn"],
      },
    ],
  },
  {
    Effect: "Allow",
    Action: [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
    ],
    Resource: [
      {
        "Fn::GetAtt": ["UsersTable", "Arn"],
      },
      {
        "Fn::Join": ["/", [{ "Fn::GetAtt": ["UsersTable", "Arn"] }, "index/*"]],
      },
      {
        "Fn::GetAtt": ["RefreshTokensTable", "Arn"],
      },
      {
        "Fn::Join": ["/", [{ "Fn::GetAtt": ["RefreshTokensTable", "Arn"] }, "index/*"]],
      },
    ],
  },
  {
    Effect: "Allow",
    Action: ["secretsmanager:GetSecretValue"],
    Resource: [{ Ref: "AuthPepperSecret" }, { Ref: "AuthJwtSigningKeySecret" }],
  },
];
