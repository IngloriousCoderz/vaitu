import { Share as SharePlugin } from "@capacitor/share"
import { LiveUpdate as LiveUpdatePlugin } from "@capawesome/capacitor-live-update"
import { createStore } from "@inglorious/store"
import { createLiveUpdate } from "@inglorious/web/live-update"
import { PwaUpdate } from "@inglorious/web/pwa"
import { Router, setRoutes } from "@inglorious/web/router"
import { NetworkStatus } from "@inglorious/web/sensors/network-status"
import { createShare } from "@inglorious/web/share"

import { liveAlways, livePage, liveSession } from "../api/live.js"
import { Shell } from "../app/shell.js"
import { AnalyticsConsent } from "../common/analytics-consent/index.js"
import { LanguageSelect } from "../common/language-select/index.js"
import { Notifications } from "../common/notifications/index.js"
import { PushPrompt } from "../common/push-prompt/index.js"
import { Safety } from "../common/safety/index.js"
import { Session } from "../common/session/index.js"
import { Toasts } from "../common/toasts/index.js"
import { TranslatedCombobox } from "../common/translated-combobox/index.js"
import { NativeUpdate } from "../common/update-required/index.js"
import { I18n } from "../i18n/index.js"
import { routes } from "../routes"
import { About } from "../views/about/index.js"
import { ApplicationDetail } from "../views/application-detail/index.js"
import { ApplicationList } from "../views/application-list/index.js"
import { ApplicationsReceived } from "../views/applications-received/index.js"
import { Authentication } from "../views/authentication/index.js"
import { EraseAccount } from "../views/erase-account/index.js"
import { CoverCropper } from "../views/job-create/cover-cropper.js"
import { JobCreate } from "../views/job-create/index.js"
import { JobDetail } from "../views/job-detail/index.js"
import { JobList, searchDebounce } from "../views/job-list/index.js"
import { MyJobs } from "../views/my-jobs/index.js"
import { NotFound } from "../views/not-found/index.js"
import { Onboarding } from "../views/onboarding/index.js"
import { Preferences } from "../views/preferences/index.js"
import { AvatarCropper } from "../views/profile/avatar-cropper.js"
import { Profile } from "../views/profile/index.js"
import { Ranks } from "../views/ranks/index.js"
import { Unsubscribe } from "../views/unsubscribe/index.js"
import { entities } from "./entities"
import { guards } from "./guards"
import { middlewares } from "./middlewares"

setRoutes(routes)

export const store = createStore({
  types: {
    Router,
    Session,
    Shell,
    I18n,
    Authentication,
    JobList: [JobList, searchDebounce, liveAlways(["jobs", "applications"])],
    MyJobs: [MyJobs, livePage(["jobs", "applications"])],
    JobDetail: [JobDetail, livePage(["jobs"], (e) => e.job_id)],
    ApplicationList: [ApplicationList, livePage(["applications", "jobs"])],
    ApplicationDetail: [
      ApplicationDetail,
      livePage(["applications", "jobs"], (e) => e.application_id),
    ],
    ApplicationsReceived: [
      ApplicationsReceived,
      livePage(["applications", "jobs"], (e) => e.job_id),
    ],
    Profile: [Profile, livePage(["applications"])],
    Notifications: [Notifications, liveSession(["notifications"])],
    Toasts,

    JobCreate,
    CoverCropper,
    TranslatedCombobox,
    LanguageSelect,
    PwaUpdate,
    LiveUpdate: createLiveUpdate({ plugin: LiveUpdatePlugin }),
    NetworkStatus,
    NativeUpdate,
    PushPrompt,
    // The share sheet in the app, a download for files in a browser.
    Share: createShare({ plugin: SharePlugin }),
    AnalyticsConsent,
    NotFound,
    Onboarding,
    Preferences,
    About,
    AvatarCropper,
    Ranks,
    Safety,
    EraseAccount,
    Unsubscribe,
    ...guards,
  },
  entities,
  middlewares,
  autoCreateEntities: true,
})
