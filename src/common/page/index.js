import { Container } from "@inglorious/ui/container"
import { Flex } from "@inglorious/ui/flex"

import styles from "./style.module.css"

export const Page = {
  render({
    variant = "document",
    setting = "wedding",
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
      "data-setting": setting,
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
