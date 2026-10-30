import { createAnalytics } from "@inglorious/web/analytics"

import { analytics } from "../../api/analytics.js"
import { ANALYTICS_CONSENT_KEY } from "../../constants/index.js"

export const AnalyticsConsent = createAnalytics({
  adapter: analytics,
  consentKey: ANALYTICS_CONSENT_KEY,
})
