import { withStorage } from "@inglorious/store/storage"
import { createAnalytics } from "@inglorious/web/analytics"

import { analytics } from "../../api/analytics.js"
import { preferences } from "../../api/storage.js"
import { ANALYTICS_STORAGE_KEY } from "../../constants/index.js"

export const AnalyticsConsent = [
  createAnalytics({ adapter: analytics }),
  withStorage(["consent"], {
    key: ANALYTICS_STORAGE_KEY,
    storage: () => preferences,
  }),
]
