// First match wins: literal paths before parameterised ones (/events/new before
// /events/:eventId). Values are entity ids.

export const routes = {
  "/login": "authentication",
  "/onboarding": "onboarding",

  "/": "eventList",
  "/events": "eventList",
  "/applications": "applicationList",
  "/profile": "profile",

  "/events/mine": "myEvents",
  "/events/new": "eventCreate",
  "/events/:eventId/edit": "eventCreate",

  "/events/:eventId": "eventDetail",
  "/events/:eventId/applications": "applicationsReceived",
  "/applications/:applicationId": "applicationDetail",
  "/notifications": "notifications",
  "/ranks": "ranks",
  "/preferences": "preferences",

  "*": "notFound",
}

export const paths = {
  events: "/events",
  myEvents: "/events/mine",
  newEvent: "/events/new",
  event: (eventId) => `/events/${eventId}`,
  editEvent: (eventId) => `/events/${eventId}/edit`,
  receivedApplications: (eventId) => `/events/${eventId}/applications`,
  applications: "/applications",
  applicationsByStatus: (status) => `/applications?status=${status}`,
  application: (applicationId) => `/applications/${applicationId}`,
  notifications: "/notifications",
  profile: "/profile",
  ranks: "/ranks",
  preferences: "/preferences",
  login: "/login",
  onboarding: "/onboarding",
}
