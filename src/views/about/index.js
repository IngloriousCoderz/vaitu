import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { About as renderers } from "./template.js"

export const About = {
  ...renderers,

  renderHeader() {
    return { title: t("about.title"), back: paths.profile }
  },
}
