export const weddingStyles = [
  { value: "editorial", label: "taxonomy.style.editorial" },
  { value: "documentary", label: "taxonomy.style.documentary" },
  { value: "reportage", label: "taxonomy.style.reportage" },
  { value: "classic", label: "taxonomy.style.classic" },
  { value: "film", label: "taxonomy.style.film" },
  { value: "fine_art", label: "taxonomy.style.fine_art" },
]

export const weddingMoments = [
  { value: "ceremony", label: "taxonomy.moment.ceremony" },
  { value: "aperitivo", label: "taxonomy.moment.aperitivo" },
  { value: "dinner", label: "taxonomy.moment.dinner" },
  { value: "party", label: "taxonomy.moment.party" },
]

export const GENRE_SETTINGS = ["festival", "concert"]

export const musicGenres = [
  { value: "house", label: "taxonomy.genre.house" },
  { value: "techno", label: "taxonomy.genre.techno" },
  { value: "indie", label: "taxonomy.genre.indie" },
  { value: "jazz", label: "taxonomy.genre.jazz" },
  { value: "electronic", label: "taxonomy.genre.electronic" },
  { value: "rock", label: "taxonomy.genre.rock" },
  { value: "pop", label: "taxonomy.genre.pop" },
  { value: "classical", label: "taxonomy.genre.classical" },
  { value: "acoustic", label: "taxonomy.genre.acoustic" },
  { value: "swing", label: "taxonomy.genre.swing" },
  { value: "soul_funk", label: "taxonomy.genre.soul_funk" },
  { value: "latin", label: "taxonomy.genre.latin" },
  { value: "italian", label: "taxonomy.genre.italian" },
  { value: "country", label: "taxonomy.genre.country" },
]

/** The detail fields a job can have, and every value they can hold. */
export const DETAIL_FIELDS = ["styles", "moments", "genres"]
export const detailOptions = [
  ...weddingStyles,
  ...weddingMoments,
  ...musicGenres,
]

const SETTINGS_BY_PROFESSION = {
  photographer: ["wedding", "festival", "concert"],
  videographer: ["wedding", "festival", "concert"],
  musician: ["wedding", "festival", "concert"],
  dj: ["wedding", "festival"],
  sound_technician: ["festival", "concert"],
  planner: ["wedding"],
  makeup_artist: ["wedding"],
  cleaner: ["apartment", "house", "office"],
  electrician: ["apartment", "house", "office"],
}

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
