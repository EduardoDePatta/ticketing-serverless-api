export const dynamoDbResources = {
    EventsTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
            TableName: "${self:service}-${self:provider.stage}-events",
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [
                {
                    AttributeName: "id",
                    AttributeType: "S",
                },
            ],
            KeySchema: [
                {
                    AttributeName: "id",
                    KeyType: "HASH",
                },
            ],
        },
    },
    UsersTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
            TableName: "${self:service}-${self:provider.stage}-users",
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [
                {
                    AttributeName: "id",
                    AttributeType: "S",
                },
                {
                    AttributeName: "email",
                    AttributeType: "S",
                },
            ],
            KeySchema: [
                {
                    AttributeName: "id",
                    KeyType: "HASH",
                },
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: "EmailIndex",
                    KeySchema: [
                        {
                            AttributeName: "email",
                            KeyType: "HASH",
                        },
                    ],
                    Projection: {
                        ProjectionType: "ALL",
                    },
                },
            ],
        },
    },
    OrdersTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
            TableName: "${self:service}-${self:provider.stage}-orders",
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [
                {
                    AttributeName: "id",
                    AttributeType: "S",
                },
                {
                    AttributeName: "status",
                    AttributeType: "S",
                },
                {
                    AttributeName: "expiresAt",
                    AttributeType: "S",
                },
            ],
            KeySchema: [
                {
                    AttributeName: "id",
                    KeyType: "HASH",
                },
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: "StatusExpiresAtIndex",
                    KeySchema: [
                        {
                            AttributeName: "status",
                            KeyType: "HASH",
                        },
                        {
                            AttributeName: "expiresAt",
                            KeyType: "RANGE",
                        },
                    ],
                    Projection: {
                        ProjectionType: "ALL",
                    },
                },
            ],
        },
    },
    PaymentsTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
            TableName: "${self:service}-${self:provider.stage}-payments",
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [
                {
                    AttributeName: "id",
                    AttributeType: "S",
                },
                {
                    AttributeName: "orderId",
                    AttributeType: "S",
                },
            ],
            KeySchema: [
                {
                    AttributeName: "id",
                    KeyType: "HASH",
                },
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: "OrderIndex",
                    KeySchema: [
                        {
                            AttributeName: "orderId",
                            KeyType: "HASH",
                        },
                    ],
                    Projection: {
                        ProjectionType: "ALL",
                    },
                },
            ],
        },
    },
    IdempotencyTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
            TableName: "${self:service}-${self:provider.stage}-idempotency",
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [
                {
                    AttributeName: "pk",
                    AttributeType: "S",
                },
            ],
            KeySchema: [
                {
                    AttributeName: "pk",
                    KeyType: "HASH",
                },
            ],
            TimeToLiveSpecification: {
                AttributeName: "expiresAtEpoch",
                Enabled: true,
            },
        },
    },
    RefreshTokensTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
            TableName: "${self:service}-${self:provider.stage}-refresh-tokens",
            BillingMode: "PAY_PER_REQUEST",
            AttributeDefinitions: [
                {
                    AttributeName: "id",
                    AttributeType: "S",
                },
                {
                    AttributeName: "userId",
                    AttributeType: "S",
                },
                {
                    AttributeName: "familyId",
                    AttributeType: "S",
                },
            ],
            KeySchema: [
                {
                    AttributeName: "id",
                    KeyType: "HASH",
                },
            ],
            GlobalSecondaryIndexes: [
                {
                    IndexName: "UserIndex",
                    KeySchema: [
                        {
                            AttributeName: "userId",
                            KeyType: "HASH",
                        },
                    ],
                    Projection: {
                        ProjectionType: "ALL",
                    },
                },
                {
                    IndexName: "FamilyIndex",
                    KeySchema: [
                        {
                            AttributeName: "familyId",
                            KeyType: "HASH",
                        },
                    ],
                    Projection: {
                        ProjectionType: "ALL",
                    },
                },
            ],
            TimeToLiveSpecification: {
                AttributeName: "expiresAtEpoch",
                Enabled: true,
            },
        },
    },
};
