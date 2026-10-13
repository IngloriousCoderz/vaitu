import { createStore } from "@inglorious/store"

import { ApplicationDetail } from "../types/application-detail/index.js"
import { ApplicationList } from "../types/application-list/index.js"
import { ApplicationsReceived } from "../types/applications-received/index.js"
import { Authentication } from "../types/authentication/index.js"
import { CountrySelect } from "../types/country-select/index.js"
import { EventCreate } from "../types/event-create/index.js"
import { EventDetail } from "../types/event-detail/index.js"
import { EventList } from "../types/event-list/index.js"
import { MyEvents } from "../types/my-events/index.js"
import { Onboarding } from "../types/onboarding/index.js"
import { Profile } from "../types/profile/index.js"
import { Ranks } from "../types/ranks/index.js"
import { Session } from "../types/session/index.js"
import { entities } from "./entities"
import { middlewares } from "./middlewares"

export const store = createStore({
  types: {
    Authentication,
    MyEvents,
    EventList,
    EventDetail,
    EventCreate,
    ApplicationList,
    ApplicationDetail,
    CountrySelect,
    ApplicationsReceived,
    Onboarding,
    Profile,
    Ranks,
    Session,
  },
  entities,
  middlewares,
  autoCreateEntities: true,
})
