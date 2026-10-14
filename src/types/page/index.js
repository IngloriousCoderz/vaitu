import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"

// One page frame for every screen. The frame stays a Flex column. The flow
// inside it is a block, so vertical margins still collapse and a chip row
// cannot widen the column. Variants only change padding and alignment.
export const Page = {
  render({
    variant = "document",
    category = "wedding",
    className = "",
    children,
  }) {
    const flow = Array.isArray(children) ? children : [children]
    return Flex.render({
      element: "div",
      direction: "column",
      justify: variant === "centered" ? "center" : "start",
      className: ["vaitu-frame", `vaitu-frame-${variant}`, className]
        .filter(Boolean)
        .join(" "),
      "data-category": category,
      children: [html`<div class="vaitu-frame-flow">${flow}</div>`],
    })
  },
}
