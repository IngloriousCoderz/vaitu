import { html } from "@inglorious/web"

import { CountrySelect } from "../country-select/index.js"
import styles from "./style.module.css"

// The app's languages in a searchable combobox, each named in itself: whoever
// needs to switch finds theirs whatever language is showing. The value is the
// active language, read as it renders, so it never needs syncing.
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
