import { LoadStatus as BaseLoadStatus } from "@inglorious/ui/load-status"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"

export const LoadStatus = {
  render(props) {
    return BaseLoadStatus.render({
      ...props,
      error: t(props.error),
      loader: html`<img
        src="/loader.svg"
        alt=${t("common.loading")}
        width="80"
        height="80"
      />`,
    })
  },
}
