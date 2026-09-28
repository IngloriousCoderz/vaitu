export function deadlineBadge(event) {
  if (event.is_new) return "NEW"
  if (event.days_left <= 1) return "CLOSING"
  if (event.days_left < 7) return `${event.days_left}D LEFT`
  return `${Math.round(event.days_left / 7)}W LEFT`
}

export function monogram(title) {
  const words = title.split(" ")
  return `${words[0][0]}${words[1]?.[0] ?? ""}`
}

export function thumbGradient(hue) {
  return `linear-gradient(135deg, hsl(${hue} 25% 38%), hsl(${(hue + 40) % 360} 30% 22%))`
}
