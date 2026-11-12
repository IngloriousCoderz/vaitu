import { withStorage } from "@inglorious/store/storage"
import { createPushPrompt } from "@inglorious/web/push"

import { push } from "../../api/push.js"
import { PUSH_STORAGE_KEY } from "../../constants/index.js"

const prompt = createPushPrompt({ adapter: push })

export const PushPrompt = [
  {
    ...prompt,
    sessionStart: prompt.pushStart,
    sessionEnd: prompt.pushStop,
  },
  withStorage(["isDeclined"], { key: PUSH_STORAGE_KEY }),
]
