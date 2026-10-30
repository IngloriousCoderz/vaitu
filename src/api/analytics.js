import { firebaseAnalytics } from "@inglorious/firebase/analytics"

import { firebaseConfig } from "./firebase.js"

export const analytics = firebaseAnalytics({ firebase: firebaseConfig })
