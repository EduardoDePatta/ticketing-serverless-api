export const healthFunction = {
    handler: "src/functions/health.handler",
    events: [
        {
            httpApi: {
                path: "/health",
                method: "get",
            },
        },
    ],
};
