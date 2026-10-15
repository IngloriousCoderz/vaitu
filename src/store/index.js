import { createStore } from "@inglorious/store"
import { Router, setRoutes } from "@inglorious/web/router"

import { routes } from "../routes"
import { ApplicationDetail } from "../types/application-detail/index.js"
import { ApplicationList } from "../types/application-list/index.js"
import { ApplicationsReceived } from "../types/applications-received/index.js"
import { Authentication } from "../types/authentication/index.js"
import { CountrySelect } from "../types/country-select/index.js"
import { EventCreate } from "../types/event-create/index.js"
import { EventDetail } from "../types/event-detail/index.js"
import { EventList } from "../types/event-list/index.js"
import { NotFound } from "../types/not-found/index.js"
import { Onboarding } from "../types/onboarding/index.js"
import { Profile } from "../types/profile/index.js"
import { Ranks } from "../types/ranks/index.js"
import { entities } from "./entities"
import { guards } from "./guards"
import { middlewares } from "./middlewares"

setRoutes(routes)

export const store = createStore({
  types: {
    Router,
    Authentication,
    EventList,
    EventDetail,
    EventCreate,
    ApplicationList,
    ApplicationDetail,
    CountrySelect,
    ApplicationsReceived,
    NotFound,
    Onboarding,
    Profile,
    Ranks,
    ...guards,
  },
  entities,
  middlewares,
  autoCreateEntities: true,
})
