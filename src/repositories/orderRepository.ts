import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

import { Order } from "../entities/order";
import { SingleKeyDocumentRepository } from "../shared/dynamo/singleKeyDocumentRepository";
import { dynamoDb } from "../shared/dynamoClient";
import { requireEnv } from "../shared/env";

const STATUS_EXPIRES_AT_INDEX = "StatusExpiresAtIndex";

export class OrderRepository {
    private readonly tableName: string;
    private readonly store: SingleKeyDocumentRepository<Order>;

    constructor(tableName?: string) {
        this.tableName = tableName ?? requireEnv("ORDERS_TABLE_NAME");
        this.store = new SingleKeyDocumentRepository({
            client: dynamoDb,
            tableName: this.tableName,
        });
    }

    async create(order: Order): Promise<Order> {
        await this.store.put({
            item: order,
            conditionExpression: "attribute_not_exists(id)",
        });
        return order;
    }

    async findById(id: string): Promise<Order | null> {
        return this.store.get(id);
    }

    /**
     * Marks a PENDING order as PAID, attaching the paymentId. Returns false if
     * the conditional update fails (order missing or already in another state).
     */
    async markPaid(params: {
        id: string;
        paymentId: string;
        now: Date;
    }): Promise<boolean> {
        const { id, paymentId, now } = params;
        try {
            await dynamoDb.send(
                new UpdateCommand({
                    TableName: this.tableName,
                    Key: { id },
                    UpdateExpression:
                        "SET #status = :paid, paymentId = :pid, updatedAt = :now",
                    ConditionExpression:
                        "attribute_exists(id) AND #status = :pending",
                    ExpressionAttributeNames: { "#status": "status" },
                    ExpressionAttributeValues: {
                        ":paid": "PAID",
                        ":pending": "PENDING",
                        ":pid": paymentId,
                        ":now": now.toISOString(),
                    },
                })
            );
            return true;
        } catch (err) {
            if (err instanceof ConditionalCheckFailedException) {
                return false;
            }
            throw err;
        }
    }

    /**
     * Marks a PENDING order as EXPIRED. Idempotent and safe to retry: returns
     * `false` when the order is no longer PENDING (e.g. already paid or
     * already expired).
     */
    async markExpired(params: { id: string; now: Date }): Promise<boolean> {
        const { id, now } = params;
        try {
            await dynamoDb.send(
                new UpdateCommand({
                    TableName: this.tableName,
                    Key: { id },
                    UpdateExpression:
                        "SET #status = :expired, updatedAt = :now",
                    ConditionExpression:
                        "attribute_exists(id) AND #status = :pending",
                    ExpressionAttributeNames: { "#status": "status" },
                    ExpressionAttributeValues: {
                        ":expired": "EXPIRED",
                        ":pending": "PENDING",
                        ":now": now.toISOString(),
                    },
                })
            );
            return true;
        } catch (err) {
            if (err instanceof ConditionalCheckFailedException) {
                return false;
            }
            throw err;
        }
    }

    /**
     * Returns up to `limit` PENDING orders whose `expiresAt` is strictly before
     * the supplied cutoff (ISO string). Uses StatusExpiresAtIndex GSI.
     */
    async findExpiredPending(params: {
        cutoff: string;
        limit?: number;
    }): Promise<Order[]> {
        const { cutoff, limit = 25 } = params;
        const result = await dynamoDb.send(
            new QueryCommand({
                TableName: this.tableName,
                IndexName: STATUS_EXPIRES_AT_INDEX,
                KeyConditionExpression:
                    "#status = :pending AND expiresAt < :cutoff",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: {
                    ":pending": "PENDING",
                    ":cutoff": cutoff,
                },
                Limit: limit,
            })
        );
        return (result.Items ?? []) as Order[];
    }
}
