import { createDevtools } from "@inglorious/store/client/devtools"
import { withTransitions } from "@inglorious/ui/view-transitions"

// Navigations into and out of the pages with a back button slide in the
// direction travelled; switching between top-level pages stays instant.
export const middlewares = [
  withTransitions({
    routes: [
      "eventDetail",
      "eventCreate",
      "applicationsReceived",
      "applicationDetail",
      "ranks",
    ],
  }),
]

if (import.meta.env.DEV) {
  middlewares.push(createDevtools().middleware)
}
