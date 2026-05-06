import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { User } from "../entities/user";
import { SingleKeyDocumentRepository } from "../shared/dynamo/singleKeyDocumentRepository";
import { dynamoDb } from "../shared/dynamoClient";
import { requireEnv } from "../shared/env";
export const USERS_EMAIL_INDEX = "EmailIndex";
export class UserRepository {
    private readonly tableName: string;
    private readonly store: SingleKeyDocumentRepository<User>;
    constructor(tableName?: string) {
        this.tableName = tableName ?? requireEnv("USERS_TABLE_NAME");
        this.store = new SingleKeyDocumentRepository({
            client: dynamoDb,
            tableName: this.tableName,
        });
    }
    async create(user: User): Promise<User> {
        await this.store.put({
            item: user,
            conditionExpression: "attribute_not_exists(id)",
        });
        return user;
    }
    async findById(id: string): Promise<User | null> {
        return this.store.get(id);
    }
    async findByEmail(email: string): Promise<User | null> {
        const result = await dynamoDb.send(new QueryCommand({
            TableName: this.tableName,
            IndexName: USERS_EMAIL_INDEX,
            KeyConditionExpression: "#e = :email",
            ExpressionAttributeNames: { "#e": "email" },
            ExpressionAttributeValues: { ":email": email },
            Limit: 1,
        }));
        const items = (result.Items ?? []) as User[];
        return items[0] ?? null;
    }
}
