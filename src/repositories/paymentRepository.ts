import { Payment } from "../entities/payment";
import { SingleKeyDocumentRepository } from "../shared/dynamo/singleKeyDocumentRepository";
import { dynamoDb } from "../shared/dynamoClient";
import { requireEnv } from "../shared/env";

export class PaymentRepository {
    private readonly tableName: string;
    private readonly store: SingleKeyDocumentRepository<Payment>;

    constructor(tableName?: string) {
        this.tableName = tableName ?? requireEnv("PAYMENTS_TABLE_NAME");
        this.store = new SingleKeyDocumentRepository({
            client: dynamoDb,
            tableName: this.tableName,
        });
    }

    async create(payment: Payment): Promise<Payment> {
        await this.store.put({
            item: payment,
            conditionExpression: "attribute_not_exists(id)",
        });
        return payment;
    }

    async findById(id: string): Promise<Payment | null> {
        return this.store.get(id);
    }
}
