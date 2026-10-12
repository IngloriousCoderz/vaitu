import { Flex } from "@inglorious/ui/flex"

// One page frame for every screen. Variants only change padding and
// alignment; the column, max width, and background live in one place.
export function renderPage({
  variant = "document",
  category = "wedding",
  className = "",
  children,
}) {
  return Flex.render({
    element: "div",
    direction: "column",
    justify: variant === "centered" ? "center" : "start",
    className: ["vaitu-frame", `vaitu-frame-${variant}`, className]
      .filter(Boolean)
      .join(" "),
    "data-category": category,
    children: Array.isArray(children) ? children : [children],
  })
}
