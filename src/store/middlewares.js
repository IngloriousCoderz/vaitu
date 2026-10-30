import { createDevtools } from "@inglorious/store/client/devtools"
import { withTransitions } from "@inglorious/ui/view-transitions"

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
