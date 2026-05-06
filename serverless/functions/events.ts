export const createEventFunction = {
  handler: "src/functions/createEvent.handler",
  events: [
    {
      httpApi: {
        path: "/events",
        method: "post",
        authorizer: {
          name: "jwtAuthorizer",
        },
      },
    },
  ],
};
export const listEventsFunction = {
  handler: "src/functions/listEvents.handler",
  events: [
    {
      httpApi: {
        path: "/events",
        method: "get",
      },
    },
  ],
};
export const getEventFunction = {
  handler: "src/functions/getEvent.handler",
  events: [
    {
      httpApi: {
        path: "/events/{id}",
        method: "get",
      },
    },
  ],
};
export const updateEventFunction = {
  handler: "src/functions/updateEvent.handler",
  events: [
    {
      httpApi: {
        path: "/events/{id}",
        method: "put",
        authorizer: {
          name: "jwtAuthorizer",
        },
      },
    },
  ],
};
export const deleteEventFunction = {
  handler: "src/functions/deleteEvent.handler",
  events: [
    {
      httpApi: {
        path: "/events/{id}",
        method: "delete",
        authorizer: {
          name: "jwtAuthorizer",
        },
      },
    },
  ],
};
