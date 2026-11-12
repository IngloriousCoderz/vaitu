import { handleRequest } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"
import { errorKey } from "../../api/errors.js"
import { fetchProfileStats } from "../../api/reputation.js"
import { tiersFromConfig } from "../../common/tiers.js"
import { NO_POINTS } from "../../constants/index.js"

export const tiersLoad = handleRequest(
  "tiersLoad",
  {
    async run() {
      const { data, error } = await supabase
        .from("app_config")
        .select("key, value")
      if (error) throw error
      const tiers = tiersFromConfig(data)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      let mine = { points: 0, tier: null }
      if (user) {
        const stats = (await fetchProfileStats([user.id]))[user.id]
        if (stats)
          mine = { points: stats.points ?? NO_POINTS, tier: stats.tier }
      }
      return { tiers, mine }
    },
    success(entity, { tiers, mine }) {
      entity.tiers = tiers
      entity.mine = mine
    },
  },
  { toError: (error) => errorKey(error, "errors.loadRanks") },
)
