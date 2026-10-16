// Taxonomy for events: the values the backend accepts, paired with the labels
// the UI shows. Data rather than validation — the validators in src/validation
// read their enums from these lists, and the filters and cards read them too,
// so adding a value touches one place.

export const weddingStyles = [
  { value: "editorial", label: "Editorial" },
  { value: "documentary", label: "Documentary" },
  { value: "reportage", label: "Reportage" },
  { value: "classic", label: "Classic" },
  { value: "film", label: "Film" },
  { value: "fine_art", label: "Fine Art" },
]

export const festivalGenres = [
  { value: "house", label: "House" },
  { value: "techno", label: "Techno" },
  { value: "indie", label: "Indie" },
  { value: "jazz", label: "Jazz" },
  { value: "electronic", label: "Electronic" },
]
