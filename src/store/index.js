import { createStore } from "@inglorious/store"
import { PwaUpdate } from "@inglorious/web/pwa"
import { Router, setRoutes } from "@inglorious/web/router"

import { Shell } from "../app/shell.js"
import { CountrySelect } from "../common/country-select/index.js"
import { LanguageSelect } from "../common/language-select/index.js"
import { Notifications } from "../common/notifications/index.js"
import { AppVersion } from "../common/update-required/index.js"
import { I18n } from "../i18n/index.js"
import { routes } from "../routes"
import { ApplicationDetail } from "../views/application-detail/index.js"
import { ApplicationList } from "../views/application-list/index.js"
import { ApplicationsReceived } from "../views/applications-received/index.js"
import { Authentication } from "../views/authentication/index.js"
import { CoverCropper } from "../views/event-create/cover-cropper.js"
import { EventCreate } from "../views/event-create/index.js"
import { EventDetail } from "../views/event-detail/index.js"
import { EventList } from "../views/event-list/index.js"
import { NotFound } from "../views/not-found/index.js"
import { Onboarding } from "../views/onboarding/index.js"
import { AvatarCropper } from "../views/profile/avatar-cropper.js"
import { Profile } from "../views/profile/index.js"
import { Ranks } from "../views/ranks/index.js"
import { entities } from "./entities"
import { guards } from "./guards"
import { middlewares } from "./middlewares"

setRoutes(routes)

export const store = createStore({
  types: {
    Router,
    Shell,
    I18n,
    Authentication,
    EventList,
    EventDetail,
    EventCreate,
    CoverCropper,
    ApplicationList,
    ApplicationDetail,
    CountrySelect,
    LanguageSelect,
    PwaUpdate,
    AppVersion,
    Notifications,
    ApplicationsReceived,
    NotFound,
    Onboarding,
    Profile,
    AvatarCropper,
    Ranks,
    ...guards,
  },
  entities,
  middlewares,
  autoCreateEntities: true,
})
