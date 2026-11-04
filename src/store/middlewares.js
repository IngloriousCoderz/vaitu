import { createDevtools } from "@inglorious/store/client/devtools"
import { withTransitions } from "@inglorious/ui/view-transitions"

import { WIDE_QUERY } from "../constants/index.js"

// Tab bar order: a tab switch slides towards the tab that was tapped.
const TAB_POSITIONS = {
  jobList: 0,
  applicationList: 1,
  applicationDetail: 1,
  myJobs: 2,
  notifications: 3,
  profile: 4,
}

const SLIDING_ROUTES = new Set([
  "jobDetail",
  "jobCreate",
  "applicationsReceived",
  "applicationDetail",
  "ranks",
])

function isTabSwitch({ from, to }) {
  const fromTab = TAB_POSITIONS[from.route]
  const toTab = TAB_POSITIONS[to.route]
  return fromTab != null && toTab != null && fromTab !== toTab
}

export const middlewares = [
  withTransitions({
    // Wide screens show the drawer and the page beside it, where a sliding page
    // reads as jank rather than as moving between screens.
    routes: (navigation) =>
      !window.matchMedia(WIDE_QUERY).matches &&
      (isTabSwitch(navigation) ||
        SLIDING_ROUTES.has(navigation.from.route) ||
        SLIDING_ROUTES.has(navigation.to.route)),
    direction: (navigation) => {
      if (!isTabSwitch(navigation)) return navigation.type
      const { from, to } = navigation
      return TAB_POSITIONS[to.route] > TAB_POSITIONS[from.route]
        ? "forward"
        : "back"
    },
  }),
]

if (import.meta.env.DEV) {
  middlewares.push(createDevtools().middleware)
}
