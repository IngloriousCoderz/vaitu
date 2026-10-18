import { Container } from "@inglorious/ui/container"
import { Flex } from "@inglorious/ui/flex"

import styles from "./style.module.css"

// One page frame for every screen. The frame stays a Flex column that paints
// the background and carries the padding; variants only change those and
// the alignment. Inside it the content is a Container, as in the Inglorious UI
// dashboard: it caps the page at 80rem on large screens and centres it. The
// container is a block, so vertical margins still collapse and a chip row
// cannot widen the column.
export const Page = {
  render({
    variant = "document",
    category = "wedding",
    align = "left",
    wide = false,
    read = false,
    className = "",
    children,
  }) {
    const flow = Array.isArray(children) ? children : [children]
    return Flex.render({
      element: "div",
      direction: "column",
      justify: variant === "centered" ? "center" : "start",
      className: [
        styles.frame,
        styles[`frame-${variant}`],
        wide || read ? styles.frameWide : "",
        read ? styles.frameRead : "",
        align === "center" ? styles["frame-center-text"] : "",
        className,
      ]
        .filter(Boolean)
        .join(" "),
      "data-category": category,
      children: [
        Container.render({
          maxWidth: "xl",
          padding: "none",
          className: styles["frame-flow"],
          children: flow,
        }),
      ],
    })
  },
}
