export function deadlineBadge(event) {
  if (event.isNew) return "NEW"
  if (event.daysLeft <= 1) return "CLOSING"
  if (event.daysLeft < 7) return `${event.daysLeft}D LEFT`
  return `${Math.round(event.daysLeft / 7)}W LEFT`
}

export function monogram(title) {
  const parts = title.split(" ").filter((word) => word && word !== "&")
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ""
  return last === "" ? first : `${first}&${last}`
}

export function thumbGradient(hue) {
  return `linear-gradient(135deg, hsl(${hue} 25% 38%), hsl(${(hue + 40) % 360} 30% 22%))`
}
