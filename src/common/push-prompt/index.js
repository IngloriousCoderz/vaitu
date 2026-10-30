import { createPushPrompt } from "@inglorious/web/push"

import { push } from "../../api/push.js"
import { PUSH_DECLINE_KEY } from "../../constants/index.js"

// Asks for the permission pushes need, in a pill before the system's dialog,
// in the PWA and the native apps alike (createPushPrompt, through the FCM
// adapter in src/api/push.js). Every sign-in registers a device already
// allowed; signing out removes its token (see endSession in
// src/api/session.js). The shell renders the pill.
const prompt = createPushPrompt({ adapter: push, declineKey: PUSH_DECLINE_KEY })

export const PushPrompt = {
  ...prompt,
  sessionStart: prompt.pushStart,
  sessionEnd: prompt.pushStop,
}
