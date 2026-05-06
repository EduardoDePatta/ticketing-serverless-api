import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { IdempotencyRecord } from "../entities/idempotencyRecord";
import { dynamoDb } from "../shared/dynamoClient";
import { requireEnv } from "../shared/env";

export type TryReserveResult =
  | {
      kind: "reserved";
    }
  | {
      kind: "existing";
      record: IdempotencyRecord;
    };
export class IdempotencyRepository {
  private readonly tableName: string;
  constructor(tableName?: string) {
    this.tableName = tableName ?? requireEnv("IDEMPOTENCY_TABLE_NAME");
  }
  async tryReserve(params: {
    pk: string;
    requestHash: string;
    ttlSeconds: number;
    now: Date;
  }): Promise<TryReserveResult> {
    const { pk, requestHash, ttlSeconds, now } = params;
    const record: IdempotencyRecord = {
      pk,
      status: "in_progress",
      requestHash,
      statusCode: null,
      responseBody: null,
      createdAt: now.toISOString(),
      expiresAtEpoch: Math.floor(now.getTime() / 1000) + ttlSeconds,
    };
    try {
      await dynamoDb.send(
        new PutCommand({
          TableName: this.tableName,
          Item: record,
          ConditionExpression: "attribute_not_exists(pk)",
        })
      );
      return { kind: "reserved" };
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException) {
        const existing = await dynamoDb.send(
          new GetCommand({
            TableName: this.tableName,
            Key: { pk },
          })
        );
        const item = existing.Item as IdempotencyRecord | undefined;
        if (!item) {
          throw new Error("Idempotency conditional check failed but no record was found");
        }

        return { kind: "existing", record: item };
      }

      throw err;
    }
  }
  async complete(params: { pk: string; statusCode: number; responseBody: string }): Promise<void> {
    const { pk, statusCode, responseBody } = params;
    await dynamoDb.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { pk },
        UpdateExpression: "SET #s = :completed, #code = :code, #body = :body",
        ExpressionAttributeNames: {
          "#s": "status",
          "#code": "statusCode",
          "#body": "responseBody",
        },
        ExpressionAttributeValues: {
          ":completed": "completed",
          ":code": statusCode,
          ":body": responseBody,
        },
      })
    );
  }
}
