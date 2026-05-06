import type { AWS } from "@serverless/typescript";
import { authAuthorizerFunction, loginFunction, logoutFunction, meFunction, refreshFunction, registerFunction, } from "./serverless/functions/auth";
import { createEventFunction, deleteEventFunction, getEventFunction, listEventsFunction, updateEventFunction, } from "./serverless/functions/events";
import { healthFunction } from "./serverless/functions/health";
import { cleanupExpiredOrdersFunction, createOrderFunction, getOrderFunction, payOrderFunction, } from "./serverless/functions/orders";
import { iamRoleStatements } from "./serverless/iam/statements";
import { dynamoDbResources } from "./serverless/resources/dynamodb";
import { secretsResources } from "./serverless/resources/secrets";
const serverlessConfiguration: AWS = {
    service: "ticketing-serverless-api",
    frameworkVersion: "4",
    provider: {
        name: "aws",
        runtime: "nodejs20.x",
        region: "us-east-1",
        stage: "${opt:stage, 'dev'}",
        architecture: "arm64",
        memorySize: 256,
        timeout: 10,
        environment: {
            STAGE: "${self:provider.stage}",
            EVENTS_TABLE_NAME: "${self:service}-${self:provider.stage}-events",
            ORDERS_TABLE_NAME: "${self:service}-${self:provider.stage}-orders",
            PAYMENTS_TABLE_NAME: "${self:service}-${self:provider.stage}-payments",
            IDEMPOTENCY_TABLE_NAME: "${self:service}-${self:provider.stage}-idempotency",
            USERS_TABLE_NAME: "${self:service}-${self:provider.stage}-users",
            REFRESH_TOKENS_TABLE_NAME: "${self:service}-${self:provider.stage}-refresh-tokens",
            AUTH_PEPPER_SECRET_ID: { Ref: "AuthPepperSecret" },
            AUTH_JWT_SIGNING_KEY_SECRET_ID: { Ref: "AuthJwtSigningKeySecret" },
            AUTH_JWT_ISSUER: "${self:service}-${self:provider.stage}",
            AUTH_JWT_AUDIENCE: "${self:service}-${self:provider.stage}-clients",
            AUTH_ACCESS_TOKEN_TTL_SECONDS: "900",
            AUTH_REFRESH_TOKEN_TTL_SECONDS: "2592000",
        },
        httpApi: {
            authorizers: {
                jwtAuthorizer: {
                    type: "request",
                    functionName: "authAuthorizer",
                    identitySource: ["$request.header.Authorization"],
                    resultTtlInSeconds: 300,
                    enableSimpleResponses: true,
                },
            },
        },
        iam: {
            role: {
                statements: iamRoleStatements,
            },
        },
    },
    functions: {
        health: healthFunction,
        authAuthorizer: authAuthorizerFunction,
        register: registerFunction,
        login: loginFunction,
        refresh: refreshFunction,
        logout: logoutFunction,
        me: meFunction,
        createEvent: createEventFunction,
        listEvents: listEventsFunction,
        getEvent: getEventFunction,
        updateEvent: updateEventFunction,
        deleteEvent: deleteEventFunction,
        createOrder: createOrderFunction,
        getOrder: getOrderFunction,
        payOrder: payOrderFunction,
        cleanupExpiredOrders: cleanupExpiredOrdersFunction,
    },
    resources: {
        Resources: {
            ...dynamoDbResources,
            ...secretsResources,
        },
    },
    build: {
        esbuild: {
            bundle: true,
            minify: false,
            sourcemap: true,
            target: "node20",
        },
    },
};
module.exports = serverlessConfiguration;
