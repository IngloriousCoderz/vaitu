import { t } from "../../i18n/index.js"
import { paths } from "../../routes.js"
import { template } from "./template.js"

export const About = {
  ...template,

  renderHeader() {
    return { title: t("about.title"), back: paths.profile }
  },
}
