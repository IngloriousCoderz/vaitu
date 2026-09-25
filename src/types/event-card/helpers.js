const styleLabels = {
  editorial: "Editorial",
  documentary: "Documentary",
  reportage: "Reportage",
  classic: "Classic",
  film: "Film",
  fine_art: "Fine Art",
}

export function styleLabel(value) {
  return styleLabels[value] ?? value
}

export function coupleName(event) {
  return `${event.spouseFirstName1} & ${event.spouseFirstName2}`
}

export function monogram(event) {
  return `${event.spouseFirstName1[0]}&${event.spouseFirstName2[0]}`
}

export function deadlineBadge(event) {
  if (event.isNew) return "NEW"
  if (event.daysLeft <= 1) return "CLOSING"
  if (event.daysLeft < 7) return `${event.daysLeft}D LEFT`
  return `${Math.round(event.daysLeft / 7)}W LEFT`
}

export function thumbGradient(hue) {
  return `linear-gradient(135deg, hsl(${hue} 25% 38%), hsl(${(hue + 40) % 360} 30% 22%))`
}
