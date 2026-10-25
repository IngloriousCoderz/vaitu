import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Typography } from "@inglorious/ui/typography"
import { html } from "@inglorious/web"

import { t, trans } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import styles from "./style.module.css"

// Reached through the `*` route. Keeps a bad link or a stale bookmark on a real
// screen with a way out, rather than on the previous page or a blank one.
export const NotFound = {
  render(entity, api) {
    const router = api.getEntity("router")

    return Flex.render({
      align: "center",
      justify: "center",
      isFullWidth: true,
      children: html`
        <div class=${styles.notFound}>
          ${Typography.render({
            variant: "h3",
            hasGutterBottom: true,
            children: t("notFound.title"),
          })}
          ${Typography.render({
            variant: "body",
            hasGutterBottom: true,
            children: trans("notFound.noMatch", {
              values: { path: router.path },
              components: {
                code: (children) => html`<code>${children}</code>`,
              },
            }),
          })}
          ${Button.render({
            color: "primary",
            onClick: goToEvents(api),
            children: t("notFound.goToEvents"),
          })}
        </div>
      `,
    })
  },
}

function goToEvents(api) {
  return () => api.notify("#router:navigate", paths.events)
}
