import "./style.css"

import { Combobox } from "@inglorious/ui/combobox"
import { html } from "@inglorious/web"

import { t, translatedLabel } from "../../i18n/index.js"
import * as handlers from "./handlers.js"

// The entity keeps translation keys for its texts, and keys on the options
// that are copy rather than data (styles, genres, group headings): rendering
// translates them, so the select follows the active language.
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
          noOptionsMessage: t(entity.noOptionsMessage),
          loadingMessage: t(entity.loadingMessage),
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
