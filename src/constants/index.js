// Shared numeric constants (keeps no-magic-numbers happy in one place).
export const MS_PER_SECOND = 1000
export const SECONDS_PER_MINUTE = 60
export const MINUTES_PER_HOUR = 60
export const HOURS_PER_DAY = 24
export const DAY_MS =
  MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY
export const HOUR_MS = MS_PER_SECOND * SECONDS_PER_MINUTE * MINUTES_PER_HOUR
export const REQUEST_TIMEOUT_MS = 15000
export const MIN_PASSWORD_LENGTH = 6
export const MIN_TEXT_LENGTH = 1
export const DEFAULT_MAX_APPLICANTS = 5
export const DEFAULT_EVENT_CATEGORY = "wedding"
export const DEFAULT_TRANSCRIPT_STATUS = "none"
export const CLOSING_MAX_DAYS = 1
export const DATE_PAD_LENGTH = 2
export const WEEK_DAYS = 7
export const FIRST_INDEX = 0
// List rows after this one share its enter delay (index 8 is the 9th row).
export const LIST_STAGGER_CAP = 8
export const LAST_INDEX_OFFSET = 1
export const HASH_MULTIPLIER = 31
export const HASH_SEED = 7
export const HUE_DEGREES = 360
export const HUE_SHIFT = 40
export const JUST_OPENED_MIN_DAYS = 2
export const SINGULAR = 1
export const ZERO = 0
export const MONTH_INDEX_OFFSET = 1
export const PAD_LENGTH = 2
export const DATETIME_LOCAL_LENGTH = 16
export const DATE_ISO_LENGTH = 10
// Tier thresholds fallback (live values come from app_config).
export const TIER_BRONZE_MIN_POINTS = 75
export const TIER_SILVER_MIN_POINTS = 125
export const TIER_GOLD_MIN_POINTS = 200
export const POINTS_PER_APPLICATION = 2
export const POINTS_PER_SHORTLIST = 5
export const POINTS_PER_SELECTION = 10
export const PERCENT_MAX = 100
// Voice dictation cap (auto-stops, shows elapsed).
export const AUDIO_MAX_SECONDS = 120
// UUID v4 fallback (insecure contexts lack crypto.randomUUID).
export const UUID_RANDOM_BYTES = 16
export const UUID_VERSION_INDEX = 6
export const UUID_VARIANT_INDEX = 8
export const UUID_VERSION_MASK = 0x0f
export const UUID_VERSION_BITS = 0x40
export const UUID_VARIANT_MASK = 0x3f
export const UUID_VARIANT_BITS = 0x80
export const UUID_SECTION_SIZES = [8, 4, 4, 4, 12]
export const UUID_HEX_RADIX = 16
// Wedding application window: deadline defaults this far before the event.
export const APPLICATION_DEADLINE_LEAD_DAYS = 45
export const DEADLINE_END_OF_DAY = "23:59"
// Recordings smaller than this are treated as empty (bytes).
export const MIN_AUDIO_BYTES = 1024
// Local Supabase ports (dev over LAN: same host as the page serves these).
export const SUPABASE_API_PORT = 54321
export const VITE_DEV_PORT = 5173
