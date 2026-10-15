import { handleAsync } from "@inglorious/store/async"

import { supabase } from "../../api/client.js"
import { defaultTiers } from "../../common/tiers.js"

const DEFAULT_TIERS = defaultTiers()

export const tiersLoad = handleAsync("tiersLoad", {
  start(entity) {
    entity.status = "loading"
    entity.error = null
  },
  async run() {
    const { data, error } = await supabase
      .from("app_config")
      .select("key, value")
    if (error) throw error
    const byKey = Object.fromEntries(
      (data ?? []).map((row) => [row.key, row.value]),
    )
    const tiers = {
      bronzeMin: byKey.tier_bronze_min_points ?? DEFAULT_TIERS.bronzeMin,
      silverMin: byKey.tier_silver_min_points ?? DEFAULT_TIERS.silverMin,
      goldMin: byKey.tier_gold_min_points ?? DEFAULT_TIERS.goldMin,
      perApplication:
        byKey.points_per_application ?? DEFAULT_TIERS.perApplication,
      perShortlist: byKey.points_per_shortlist ?? DEFAULT_TIERS.perShortlist,
      perSelection: byKey.points_per_selection ?? DEFAULT_TIERS.perSelection,
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    let mine = { points: 0, tier: null }
    if (user) {
      const { data: stats } = await supabase
        .from("seeker_stats")
        .select("points, tier")
        .eq("applicant_id", user.id)
        .maybeSingle()
      if (stats) mine = { points: stats.points ?? 0, tier: stats.tier }
    }
    return { tiers, mine }
  },
  success(entity, { tiers, mine }) {
    entity.status = "ready"
    entity.tiers = tiers
    entity.mine = mine
  },
  error(entity, err) {
    entity.status = "error"
    entity.error = err.message ?? "Failed to load ranks"
  },
})
