// Paths are matched in declaration order and the first match wins, so a literal
// path has to come before the parameterised one it would otherwise be captured
// by: `/events/new` before `/events/:eventId`. `*` is always matched last, whatever
// order it is declared in.
//
// Values are entity ids, not type names, because the router renders whatever id
// the route resolves to.

export const routes = {
  // Pre-login. Guarded the other way round — these bounce a signed-in user away.
  "/login": "authentication",
  "/onboarding": "onboarding",

  // Tabs. A bare / is the same page as /events rather than a redirect, so a cold
  // start on the app's home link does not bounce through a second entry.
  "/": "eventList",
  "/events": "eventList",
  "/applications": "applicationList",
  "/profile": "profile",

  // Literal before parameterised, see above.
  "/events/new": "eventCreate",
  "/events/:eventId/edit": "eventCreate",

  // Pushed on top of a tab root.
  "/events/:eventId": "eventDetail",
  "/events/:eventId/applications": "applicationsReceived",
  "/applications/:applicationId": "applicationDetail",
  "/ranks": "ranks",

  "*": "notFound",
}

// Paths the entity handlers need to build. Kept beside the table so a route and
// the link that reaches it cannot drift apart.
export const paths = {
  events: "/events",
  newEvent: "/events/new",
  event: (eventId) => `/events/${eventId}`,
  editEvent: (eventId) => `/events/${eventId}/edit`,
  receivedApplications: (eventId) => `/events/${eventId}/applications`,
  applications: "/applications",
  applicationsByStatus: (status) => `/applications?status=${status}`,
  application: (applicationId) => `/applications/${applicationId}`,
  profile: "/profile",
  ranks: "/ranks",
  login: "/login",
  onboarding: "/onboarding",
}
