import "./style.css"

import { Combobox } from "@inglorious/ui/combobox"
import { html } from "@inglorious/web"

import { t, translated, translatedLabel } from "../../i18n/index.js"
import * as handlers from "./handlers.js"

export const CountrySelect = {
  ...Combobox,
  ...handlers,
  render(entity, api) {
    return html`<div class="vaitu-country-select">
      ${Combobox.render(
        {
          ...entity,
          label: entity.label ? t(entity.label) : "",
          placeholder: t(entity.placeholder),
          searchPlaceholder: t(entity.searchPlaceholder),
          noOptionsMessage: t(entity.noOptionsMessage),
          loadingMessage: t(entity.loadingMessage),
          error: translated(entity.error),
          options: entity.options.map((option) => ({
            ...option,
            label: translatedLabel(option),
          })),
        },
        api,
      )}
    </div>`
  },
}
