export const iamRoleStatements = [
    {
        Effect: "Allow",
        Action: [
            "dynamodb:PutItem",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem",
        ],
        Resource: [
            {
                "Fn::GetAtt": ["EventsTable", "Arn"],
            },
        ],
    },
];
