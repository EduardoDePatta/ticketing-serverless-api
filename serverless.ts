import type { AWS } from "@serverless/typescript";

import {
    createEventFunction,
    deleteEventFunction,
    getEventFunction,
    listEventsFunction,
    updateEventFunction,
} from "./serverless/functions/events";
import { healthFunction } from "./serverless/functions/health";
import { dynamoDbResources } from "./serverless/resources/dynamodb";
import { iamRoleStatements } from "./serverless/iam/statements";

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
        },
        iam: {
            role: {
                statements: iamRoleStatements,
            },
        },
    },
    functions: {
        health: healthFunction,
        createEvent: createEventFunction,
        listEvents: listEventsFunction,
        getEvent: getEventFunction,
        updateEvent: updateEventFunction,
        deleteEvent: deleteEventFunction,
    },
    resources: {
        Resources: {
            ...dynamoDbResources,
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
