import { html } from "@inglorious/web"

import { TranslatedCombobox } from "../translated-combobox/index.js"
import styles from "./style.module.css"

export const LanguageSelect = {
  ...TranslatedCombobox,
  render(entity, api) {
    return html`<div class=${styles.languageSelect}>
      ${TranslatedCombobox.render(
        { ...entity, selectedValue: api.getEntity("i18n")?.locale ?? null },
        api,
      )}
    </div>`
  },
}
