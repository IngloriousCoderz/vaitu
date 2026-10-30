import { firebaseAnalytics } from "@inglorious/firebase/analytics"

import { firebaseConfig } from "./firebase.js"

// Google Analytics for Firebase: the PWA reports to the web stream, the
// Android and iOS apps to theirs. createAnalytics calls it only after the
// user agreed (src/common/analytics-consent/), and the native apps start
// with collection off (AndroidManifest.xml, Info.plist).
export const analytics = firebaseAnalytics({ firebase: firebaseConfig })
