import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { RefreshToken } from "../entities/refreshToken";
import { SingleKeyDocumentRepository } from "../shared/dynamo/singleKeyDocumentRepository";
import { dynamoDb } from "../shared/dynamoClient";
import { requireEnv } from "../shared/env";

export const REFRESH_TOKENS_FAMILY_INDEX = "FamilyIndex";
export const REFRESH_TOKENS_USER_INDEX = "UserIndex";

export class RefreshTokenRepository {
    private readonly tableName: string;
    private readonly store: SingleKeyDocumentRepository<RefreshToken>;

    constructor(tableName?: string) {
        this.tableName = tableName ?? requireEnv("REFRESH_TOKENS_TABLE_NAME");
        this.store = new SingleKeyDocumentRepository({
            client: dynamoDb,
            tableName: this.tableName,
        });
    }

    async create(token: RefreshToken): Promise<RefreshToken> {
        await this.store.put({
            item: token,
            conditionExpression: "attribute_not_exists(id)",
        });
        return token;
    }

    async findById(id: string): Promise<RefreshToken | null> {
        return this.store.get(id);
    }

    async markRevoked(params: {
        id: string;
        revokedAt: string;
        replacedById?: string;
    }): Promise<void> {
        const { id, revokedAt, replacedById } = params;
        const expressionParts = ["#r = :r"];
        const names: Record<string, string> = { "#r": "revokedAt" };
        const values: Record<string, string> = { ":r": revokedAt };
        if (replacedById) {
            expressionParts.push("#p = :p");
            names["#p"] = "replacedById";
            values[":p"] = replacedById;
        }
        await dynamoDb.send(
            new UpdateCommand({
                TableName: this.tableName,
                Key: { id },
                UpdateExpression: `SET ${expressionParts.join(", ")}`,
                ExpressionAttributeNames: names,
                ExpressionAttributeValues: values,
            })
        );
    }

    async revokeFamily(params: {
        familyId: string;
        revokedAt: string;
    }): Promise<void> {
        const { familyId, revokedAt } = params;
        let exclusiveStartKey: Record<string, unknown> | undefined;
        do {
            const result = await dynamoDb.send(
                new QueryCommand({
                    TableName: this.tableName,
                    IndexName: REFRESH_TOKENS_FAMILY_INDEX,
                    KeyConditionExpression: "#f = :familyId",
                    ExpressionAttributeNames: { "#f": "familyId" },
                    ExpressionAttributeValues: { ":familyId": familyId },
                    ExclusiveStartKey: exclusiveStartKey,
                })
            );
            const items = (result.Items ?? []) as RefreshToken[];
            for (const item of items) {
                if (item.revokedAt) {
                    continue;
                }
                await this.markRevoked({
                    id: item.id,
                    revokedAt,
                });
            }
            exclusiveStartKey = result.LastEvaluatedKey;
        } while (exclusiveStartKey);
    }
}
