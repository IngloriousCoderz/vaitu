import { createAnalytics } from "@inglorious/web/analytics"

import { analytics } from "../../api/analytics.js"
import { ANALYTICS_CONSENT_KEY } from "../../constants/index.js"

// Usage statistics, only once the user said yes: the shell asks in the same
// pill as the push permission, before it, and Preferences can change the
// answer. Page views follow the router by themselves.
export const AnalyticsConsent = createAnalytics({
  adapter: analytics,
  consentKey: ANALYTICS_CONSENT_KEY,
})
