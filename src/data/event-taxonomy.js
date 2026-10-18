import { labelled } from "../i18n/index.js"

// Taxonomy for events: the values the backend accepts, paired with the labels
// the UI shows. Data rather than validation — the validators in src/validation
// read their enums from these lists, and the filters and cards read them too,
// so adding a value touches one place.

export const weddingStyles = [
  labelled("taxonomy.style.editorial", { value: "editorial" }),
  labelled("taxonomy.style.documentary", { value: "documentary" }),
  labelled("taxonomy.style.reportage", { value: "reportage" }),
  labelled("taxonomy.style.classic", { value: "classic" }),
  labelled("taxonomy.style.film", { value: "film" }),
  labelled("taxonomy.style.fine_art", { value: "fine_art" }),
]

export const festivalGenres = [
  labelled("taxonomy.genre.house", { value: "house" }),
  labelled("taxonomy.genre.techno", { value: "techno" }),
  labelled("taxonomy.genre.indie", { value: "indie" }),
  labelled("taxonomy.genre.jazz", { value: "jazz" }),
  labelled("taxonomy.genre.electronic", { value: "electronic" }),
]
