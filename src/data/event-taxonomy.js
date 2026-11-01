import { labelled } from "../i18n/index.js"

export const weddingStyles = [
  labelled("taxonomy.style.editorial", { value: "editorial" }),
  labelled("taxonomy.style.documentary", { value: "documentary" }),
  labelled("taxonomy.style.reportage", { value: "reportage" }),
  labelled("taxonomy.style.classic", { value: "classic" }),
  labelled("taxonomy.style.film", { value: "film" }),
  labelled("taxonomy.style.fine_art", { value: "fine_art" }),
]

export const GENRE_CATEGORIES = ["festival", "concert"]

export const musicGenres = [
  labelled("taxonomy.genre.house", { value: "house" }),
  labelled("taxonomy.genre.techno", { value: "techno" }),
  labelled("taxonomy.genre.indie", { value: "indie" }),
  labelled("taxonomy.genre.jazz", { value: "jazz" }),
  labelled("taxonomy.genre.electronic", { value: "electronic" }),
  labelled("taxonomy.genre.rock", { value: "rock" }),
  labelled("taxonomy.genre.pop", { value: "pop" }),
  labelled("taxonomy.genre.classical", { value: "classical" }),
]

const SETTINGS_BY_PROFESSION = {
  photographer: ["wedding", "festival", "concert", "office"],
  videographer: ["wedding", "festival", "concert"],
  musician: ["wedding", "festival", "concert"],
  dj: ["wedding", "festival"],
  sound_technician: ["festival", "concert"],
  planner: ["wedding"],
  makeup_artist: ["wedding"],
  cleaner: ["apartment", "house", "office"],
  electrician: ["apartment", "house", "office"],
}

export const professions = Object.keys(SETTINGS_BY_PROFESSION).map((id) =>
  labelled(`taxonomy.profession.${id}`, { id }),
)

export const jobTypes = Object.entries(SETTINGS_BY_PROFESSION).flatMap(
  ([profession, settings]) =>
    settings.map((category) => {
      const id = jobTypeId(category, profession)
      return labelled(`taxonomy.jobType.${id}`, {
        id,
        value: id,
        category,
        profession,
      })
    }),
)

export function jobTypeId(category, profession) {
  return `${category}_${profession}`
}

export function jobTypeById(id) {
  return jobTypes.find((jobType) => jobType.id === id)
}

export function jobTypesFor(professionIds) {
  if (!professionIds.length) return jobTypes
  return jobTypes.filter((jobType) =>
    professionIds.includes(jobType.profession),
  )
}

export function interestsFor(interests, professionIds) {
  const available = jobTypesFor(professionIds).map((jobType) => jobType.id)
  return interests.filter((id) => available.includes(id))
}
