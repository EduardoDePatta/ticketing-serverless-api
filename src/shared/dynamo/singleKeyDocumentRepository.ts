import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

export interface SingleKeyDocumentRepositoryParams {
  client: DynamoDBDocumentClient;
  tableName: string;
  keyAttributeName?: string;
}
export class SingleKeyDocumentRepository<
  T extends {
    id: string;
  },
> {
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly keyAttributeName: string;
  constructor(params: SingleKeyDocumentRepositoryParams) {
    const { client, tableName, keyAttributeName = "id" } = params;
    this.client = client;
    this.tableName = tableName;
    this.keyAttributeName = keyAttributeName;
  }
  private key(keyValue: string): Record<string, string> {
    return { [this.keyAttributeName]: keyValue };
  }
  async get(keyValue: string): Promise<T | null> {
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: this.key(keyValue),
      })
    );
    return (result.Item as T) ?? null;
  }
  async put(params: { item: T; conditionExpression?: string }): Promise<void> {
    const { item, conditionExpression } = params;
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ...(conditionExpression && {
          ConditionExpression: conditionExpression,
        }),
      })
    );
  }
  async scan(): Promise<T[]> {
    const result = await this.client.send(
      new ScanCommand({
        TableName: this.tableName,
      })
    );
    return (result.Items ?? []) as T[];
  }
  async delete(keyValue: string): Promise<void> {
    await this.client.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: this.key(keyValue),
      })
    );
  }
}
