export const weddingStyles = [
  { value: "editorial", label: "taxonomy.style.editorial" },
  { value: "documentary", label: "taxonomy.style.documentary" },
  { value: "reportage", label: "taxonomy.style.reportage" },
  { value: "classic", label: "taxonomy.style.classic" },
  { value: "film", label: "taxonomy.style.film" },
  { value: "fine_art", label: "taxonomy.style.fine_art" },
]

export const GENRE_CATEGORIES = ["festival", "concert"]

export const musicGenres = [
  { value: "house", label: "taxonomy.genre.house" },
  { value: "techno", label: "taxonomy.genre.techno" },
  { value: "indie", label: "taxonomy.genre.indie" },
  { value: "jazz", label: "taxonomy.genre.jazz" },
  { value: "electronic", label: "taxonomy.genre.electronic" },
  { value: "rock", label: "taxonomy.genre.rock" },
  { value: "pop", label: "taxonomy.genre.pop" },
  { value: "classical", label: "taxonomy.genre.classical" },
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
// back with one line and events already posted in them still display.
const OFFERED_CATEGORIES = ["wedding"]

export const jobTypes = Object.entries(SETTINGS_BY_PROFESSION).flatMap(
  ([profession, settings]) =>
    settings.map((category) => {
      const id = jobTypeId(category, profession)
      return {
        id,
        value: id,
        category,
        profession,
        label: `taxonomy.jobType.${id}`,
      }
    }),
)

export const availableJobTypes = jobTypes.filter((jobType) =>
  OFFERED_CATEGORIES.includes(jobType.category),
)

export const professions = [
  ...new Set(availableJobTypes.map((jobType) => jobType.profession)),
].map((id) => ({ id, label: `taxonomy.profession.${id}` }))

export function jobTypeId(category, profession) {
  return `${category}_${profession}`
}

export function jobTypeById(id) {
  return jobTypes.find((jobType) => jobType.id === id)
}

export function jobTypesFor(professionIds) {
  const picked = availableJobTypes.filter((jobType) =>
    professionIds.includes(jobType.profession),
  )
  return picked.length ? picked : availableJobTypes
}

export function interestsFor(interests, professionIds) {
  const available = jobTypesFor(professionIds).map((jobType) => jobType.id)
  return interests.filter((id) => available.includes(id))
}
