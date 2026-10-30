import { html } from "@inglorious/web"

import { CountrySelect } from "../country-select/index.js"
import styles from "./style.module.css"

export const LanguageSelect = {
  ...CountrySelect,
  render(entity, api) {
    return html`<div class=${styles.languageSelect}>
      ${CountrySelect.render(
        { ...entity, selectedValue: api.getEntity("i18n")?.locale ?? null },
        api,
      )}
    </div>`
  },
}
