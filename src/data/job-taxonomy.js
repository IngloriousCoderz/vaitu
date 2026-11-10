import taxonomy from "../../supabase/functions/_shared/job-taxonomy.json"

const LABEL_GROUPS = { styles: "style", moments: "moment", genres: "genre" }

export const weddingStyles = optionsOf("styles")
export const weddingMoments = optionsOf("moments")
export const musicGenres = optionsOf("genres")

export const GENRE_SETTINGS = ["festival", "concert"]

/** The detail fields a job can have, and every value they can hold. */
export const DETAIL_FIELDS = Object.keys(taxonomy.options)
export const detailOptions = DETAIL_FIELDS.flatMap(optionsOf)

/** By setting, each detail's professions: null when every profession has it. */
export const detailsBySetting = taxonomy.detailsBySetting

const SETTINGS_BY_PROFESSION = taxonomy.settingsByProfession

// Launch is weddings only. The other settings stay defined, so they can come
// back with one line and jobs already posted in them still display.
const OFFERED_SETTINGS = ["wedding"]
const FIRST_SETTING = 0

export const jobTypes = Object.entries(SETTINGS_BY_PROFESSION).flatMap(
  ([profession, settings]) =>
    settings.map((setting) => {
      const id = jobTypeId(setting, profession)
      return {
        id,
        value: id,
        setting,
        profession,
      }
    }),
)

export const availableJobTypes = jobTypes.filter((jobType) =>
  OFFERED_SETTINGS.includes(jobType.setting),
)

export const offeredSettings = OFFERED_SETTINGS.map((id) => ({
  id,
  label: `taxonomy.setting.${id}`,
}))

export const DEFAULT_SETTING = OFFERED_SETTINGS[FIRST_SETTING]

export function settingOption(id) {
  return { value: id, label: `taxonomy.setting.${id}` }
}

/** A job type as a picker lists it once its setting is picked: by its profession. */
export function professionOption(jobType) {
  return { ...jobType, label: `taxonomy.profession.${jobType.profession}` }
}

export const professions = [
  ...new Set(availableJobTypes.map((jobType) => jobType.profession)),
].map((id) => ({ id, label: `taxonomy.profession.${id}` }))

export function jobTypeId(setting, profession) {
  return `${setting}_${profession}`
}

export function jobTypeById(id) {
  return jobTypes.find((jobType) => jobType.id === id)
}

/**
 * The offered job types in these settings and professions. Without a setting
 * on offer, all settings; without a profession practised there, all of the
 * settings' professions.
 */
export function jobTypesFor(professionIds, settingIds = []) {
  const inSettings = withFallback(
    availableJobTypes.filter((jobType) => settingIds.includes(jobType.setting)),
    availableJobTypes,
  )
  return withFallback(
    inSettings.filter((jobType) => professionIds.includes(jobType.profession)),
    inSettings,
  )
}

function withFallback(picked, all) {
  return picked.length ? picked : all
}

function optionsOf(field) {
  return taxonomy.options[field].map((value) => ({
    value,
    label: `taxonomy.${LABEL_GROUPS[field]}.${value}`,
  }))
}
