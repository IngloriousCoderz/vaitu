import { supabaseNativeUpdate } from "@inglorious/supabase"
import { createNativeUpdate } from "@inglorious/web/native-update"

import { supabase } from "../../api/client.js"
import { REQUEST_TIMEOUT_MS } from "../../constants/index.js"
import { template } from "./template.js"

export const NativeUpdate = {
  ...createNativeUpdate({
    adapter: supabaseNativeUpdate(supabase, { timeoutMs: REQUEST_TIMEOUT_MS }),
  }),
  ...template,

  render(entity, api) {
    return this.renderUpdateRequired({
      storeUrl: entity.storeUrl,
      onStoreOpen: () => api.notify(`#${entity.id}:nativeUpdateApply`),
    })
  },
}
