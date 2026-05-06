export const authAuthorizerFunction = {
    handler: "src/functions/authorizer.handler",
};
export const registerFunction = {
    handler: "src/functions/register.handler",
    events: [
        {
            httpApi: {
                path: "/auth/register",
                method: "post",
            },
        },
    ],
};
export const loginFunction = {
    handler: "src/functions/login.handler",
    events: [
        {
            httpApi: {
                path: "/auth/login",
                method: "post",
            },
        },
    ],
};
export const refreshFunction = {
    handler: "src/functions/refresh.handler",
    events: [
        {
            httpApi: {
                path: "/auth/refresh",
                method: "post",
            },
        },
    ],
};
export const logoutFunction = {
    handler: "src/functions/logout.handler",
    events: [
        {
            httpApi: {
                path: "/auth/logout",
                method: "post",
            },
        },
    ],
};
export const meFunction = {
    handler: "src/functions/me.handler",
    events: [
        {
            httpApi: {
                path: "/auth/me",
                method: "get",
                authorizer: {
                    name: "jwtAuthorizer",
                },
            },
        },
    ],
};
