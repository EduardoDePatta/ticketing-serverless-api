export const createOrderFunction = {
    handler: "src/functions/createOrder.handler",
    events: [
        {
            httpApi: {
                path: "/orders",
                method: "post",
                authorizer: {
                    name: "jwtAuthorizer",
                },
            },
        },
    ],
};

export const getOrderFunction = {
    handler: "src/functions/getOrder.handler",
    events: [
        {
            httpApi: {
                path: "/orders/{id}",
                method: "get",
                authorizer: {
                    name: "jwtAuthorizer",
                },
            },
        },
    ],
};

export const payOrderFunction = {
    handler: "src/functions/payOrder.handler",
    events: [
        {
            httpApi: {
                path: "/orders/{id}/pay",
                method: "post",
                authorizer: {
                    name: "jwtAuthorizer",
                },
            },
        },
    ],
};

export const cleanupExpiredOrdersFunction = {
    handler: "src/functions/cleanupExpiredOrders.handler",
    timeout: 60,
    events: [
        {
            schedule: "rate(1 minute)",
        },
    ],
};
