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
};
