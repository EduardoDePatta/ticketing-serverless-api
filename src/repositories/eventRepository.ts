import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TicketingEvent } from "../entities/event";
import { buildSetUpdateExpression } from "../shared/dynamo/setUpdateExpression";
import { SingleKeyDocumentRepository } from "../shared/dynamo/singleKeyDocumentRepository";
import { dynamoDb } from "../shared/dynamoClient";
import { requireEnv } from "../shared/env";
export class EventRepository {
    private readonly tableName: string;
    private readonly store: SingleKeyDocumentRepository<TicketingEvent>;
    constructor(tableName?: string) {
        this.tableName = tableName ?? requireEnv("EVENTS_TABLE_NAME");
        this.store = new SingleKeyDocumentRepository({
            client: dynamoDb,
            tableName: this.tableName,
        });
    }
    async create(event: TicketingEvent): Promise<TicketingEvent> {
        await this.store.put({
            item: event,
            conditionExpression: "attribute_not_exists(id)",
        });
        return event;
    }
    async list(): Promise<TicketingEvent[]> {
        return this.store.scan();
    }
    async findById(id: string): Promise<TicketingEvent | null> {
        return this.store.get(id);
    }
    async update(params: {
        id: string;
        input: Partial<TicketingEvent>;
    }): Promise<TicketingEvent | null> {
        const { id, input } = params;
        const existingEvent = await this.store.get(id);
        if (!existingEvent) {
            return null;
        }
        const updatedEvent: TicketingEvent = {
            ...existingEvent,
            ...input,
            id,
            updatedAt: new Date().toISOString(),
        };
        const updateParts = buildSetUpdateExpression({ item: updatedEvent });
        await dynamoDb.send(new UpdateCommand({
            TableName: this.tableName,
            Key: { id },
            ...updateParts,
        }));
        return updatedEvent;
    }
    async delete(id: string): Promise<boolean> {
        const existingEvent = await this.store.get(id);
        if (!existingEvent) {
            return false;
        }
        await this.store.delete(id);
        return true;
    }
    async incrementAvailableTickets(params: {
        id: string;
        quantity: number;
    }): Promise<void> {
        const { id, quantity } = params;
        await dynamoDb.send(new UpdateCommand({
            TableName: this.tableName,
            Key: { id },
            UpdateExpression: "SET availableTickets = availableTickets + :qty, updatedAt = :now",
            ConditionExpression: "attribute_exists(id)",
            ExpressionAttributeValues: {
                ":qty": quantity,
                ":now": new Date().toISOString(),
            },
        }));
    }
    async decrementAvailableTickets(params: {
        id: string;
        quantity: number;
    }): Promise<boolean> {
        const { id, quantity } = params;
        try {
            await dynamoDb.send(new UpdateCommand({
                TableName: this.tableName,
                Key: { id },
                UpdateExpression: "SET availableTickets = availableTickets - :qty, updatedAt = :now",
                ConditionExpression: "attribute_exists(id) AND #status = :active AND availableTickets >= :qty",
                ExpressionAttributeNames: {
                    "#status": "status",
                },
                ExpressionAttributeValues: {
                    ":qty": quantity,
                    ":active": "ACTIVE",
                    ":now": new Date().toISOString(),
                },
            }));
            return true;
        }
        catch (err) {
            if (err instanceof ConditionalCheckFailedException) {
                return false;
            }
            throw err;
        }
    }
}
