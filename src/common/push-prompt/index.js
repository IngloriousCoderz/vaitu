import { createPushPrompt } from "@inglorious/web/push"

import { push } from "../../api/push.js"
import { PUSH_DECLINE_KEY } from "../../constants/index.js"

const prompt = createPushPrompt({ adapter: push, declineKey: PUSH_DECLINE_KEY })

export const PushPrompt = {
  ...prompt,
  sessionStart: prompt.pushStart,
  sessionEnd: prompt.pushStop,
}
