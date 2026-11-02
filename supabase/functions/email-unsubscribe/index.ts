import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"

import { json, serve, STATUS_CODE } from "../_shared/http.ts"
import { admin } from "../_shared/supabase.ts"

const TYPE = /^[a-z_]{1,40}$/

// POST only, because mail scanners follow links. The app's page and mail
// providers' one-click button both end up here, with no account signed in: the
// token is what proves the email was theirs.
serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "POST only" }, STATUS_CODE.MethodNotAllowed)
  }
  const query = new URL(req.url).searchParams
  const token = query.get("token")
  const type = query.get("type")
  if (!token || !type || !TYPE.test(type)) {
    return json({ error: "link_expired" }, STATUS_CODE.NotFound)
  }

  const { data, error } = await admin().rpc("mute_email_type", {
    p_token: token,
    p_type: type,
  })
  if (error) throw error
  if (!data) return json({ error: "link_expired" }, STATUS_CODE.NotFound)
  return json({ muted: type })
}, "unsubscribe failed")
