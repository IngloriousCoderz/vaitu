import { createStore } from "@inglorious/store"

import { AuthPage } from "../types/auth-page/index.js"
import { ApplicationDetail } from "../types/application-detail/index.js"
import { ApplicationsPage } from "../types/applications-page/index.js"
import { EventDetail } from "../types/event-detail/index.js"
import { EventsPage } from "../types/events-page/index.js"
import { MyEventsPage } from "../types/my-events-page/index.js"
import { Profile } from "../types/profile/index.js"
import { Session } from "../types/session/index.js"
import { entities } from "./entities"
import { middlewares } from "./middlewares"

export const store = createStore({
  types: {
    EventsPage,
    EventDetail,
    AuthPage,
    ApplicationsPage,
    ApplicationDetail,
    MyEventsPage,
    Profile,
    Session,
  },
  entities,
  middlewares,
})
