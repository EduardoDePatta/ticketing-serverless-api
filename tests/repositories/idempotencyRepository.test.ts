import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { IdempotencyRepository } from "../../src/repositories/idempotencyRepository";
const send = jest.fn();
jest.mock("../../src/shared/dynamoClient", () => ({
    dynamoDb: {
        send: (...args: unknown[]) => send(...args),
    },
}));
describe("IdempotencyRepository", () => {
    beforeEach(() => {
        send.mockReset();
    });
    function makeRepo(): IdempotencyRepository {
        return new IdempotencyRepository("idem-table");
    }
    describe("tryReserve", () => {
        it("returns reserved when conditional put succeeds", async () => {
            send.mockResolvedValueOnce({});
            const r = await makeRepo().tryReserve({
                pk: "u-1#key-1",
                requestHash: "abc",
                ttlSeconds: 60,
                now: new Date("2026-01-01T00:00:00.000Z"),
            });
            expect(r.kind).toBe("reserved");
            expect(send).toHaveBeenCalledTimes(1);
            const cmd = send.mock.calls[0][0] as {
                input: {
                    TableName: string;
                    ConditionExpression: string;
                    Item: Record<string, unknown>;
                };
            };
            expect(cmd.input.TableName).toBe("idem-table");
            expect(cmd.input.ConditionExpression).toContain("attribute_not_exists(pk)");
            expect(cmd.input.Item.pk).toBe("u-1#key-1");
            expect(cmd.input.Item.status).toBe("in_progress");
            expect(cmd.input.Item.requestHash).toBe("abc");
        });
        it("returns existing on conditional check failure (replay) including the previous record", async () => {
            send.mockRejectedValueOnce(new ConditionalCheckFailedException({
                $metadata: {},
                message: "exists",
            }));
            send.mockResolvedValueOnce({
                Item: {
                    pk: "u-1#key-1",
                    status: "completed",
                    requestHash: "abc",
                    statusCode: 201,
                    responseBody: "{\"ok\":true}",
                    createdAt: "2026-01-01T00:00:00.000Z",
                    expiresAtEpoch: 1700000000,
                },
            });
            const r = await makeRepo().tryReserve({
                pk: "u-1#key-1",
                requestHash: "abc",
                ttlSeconds: 60,
                now: new Date(),
            });
            expect(r.kind).toBe("existing");
            if (r.kind === "existing") {
                expect(r.record.status).toBe("completed");
                expect(r.record.responseBody).toBe("{\"ok\":true}");
                expect(r.record.statusCode).toBe(201);
            }
        });
        it("re-throws unexpected errors from put", async () => {
            send.mockRejectedValueOnce(new Error("network"));
            await expect(makeRepo().tryReserve({
                pk: "u-1#key-1",
                requestHash: "abc",
                ttlSeconds: 60,
                now: new Date(),
            })).rejects.toThrow("network");
        });
    });
    describe("complete", () => {
        it("updates the record with status completed, statusCode and responseBody", async () => {
            send.mockResolvedValueOnce({});
            await makeRepo().complete({
                pk: "u-1#key-1",
                statusCode: 201,
                responseBody: "{\"ok\":true}",
            });
            const cmd = send.mock.calls[0][0] as {
                input: {
                    TableName: string;
                    Key: Record<string, unknown>;
                    UpdateExpression: string;
                    ExpressionAttributeValues: Record<string, unknown>;
                };
            };
            expect(cmd.input.Key.pk).toBe("u-1#key-1");
            expect(cmd.input.UpdateExpression).toContain("#s = :completed");
            expect(cmd.input.ExpressionAttributeValues[":completed"]).toBe("completed");
            expect(cmd.input.ExpressionAttributeValues[":code"]).toBe(201);
            expect(cmd.input.ExpressionAttributeValues[":body"]).toBe("{\"ok\":true}");
        });
    });
});
