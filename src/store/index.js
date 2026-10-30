import { createStore } from "@inglorious/store"
import { PwaUpdate } from "@inglorious/web/pwa"
import { Router, setRoutes } from "@inglorious/web/router"

import { liveAlways, livePage, liveSession } from "../api/live.js"
import { Shell } from "../app/shell.js"
import { AnalyticsConsent } from "../common/analytics-consent/index.js"
import { CountrySelect } from "../common/country-select/index.js"
import { LanguageSelect } from "../common/language-select/index.js"
import { Notifications } from "../common/notifications/index.js"
import { PushPrompt } from "../common/push-prompt/index.js"
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
import { MyEvents } from "../views/my-events/index.js"
import { NotFound } from "../views/not-found/index.js"
import { Onboarding } from "../views/onboarding/index.js"
import { Preferences } from "../views/preferences/index.js"
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
    // Live: each reloads when a table it reads changes (src/api/live.js).
    EventList: [EventList, liveAlways(["events", "applications"])],
    MyEvents: [MyEvents, livePage(["events", "applications"])],
    EventDetail: [EventDetail, livePage(["events"], (e) => e.event_id)],
    ApplicationList: [ApplicationList, livePage(["applications", "events"])],
    ApplicationDetail: [
      ApplicationDetail,
      livePage(["applications", "events"], (e) => e.application_id),
    ],
    ApplicationsReceived: [
      ApplicationsReceived,
      livePage(["applications", "events"], (e) => e.event_id),
    ],
    Profile: [Profile, livePage(["applications"])],
    Notifications: [Notifications, liveSession(["notifications"])],

    EventCreate,
    CoverCropper,
    CountrySelect,
    LanguageSelect,
    PwaUpdate,
    AppVersion,
    PushPrompt,
    AnalyticsConsent,
    NotFound,
    Onboarding,
    Preferences,
    AvatarCropper,
    Ranks,
    ...guards,
  },
  entities,
  middlewares,
  autoCreateEntities: true,
})
