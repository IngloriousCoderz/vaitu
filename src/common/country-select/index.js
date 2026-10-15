import "./style.css"

import { Combobox } from "@inglorious/ui/combobox"
import { html } from "@inglorious/web"

import * as handlers from "./handlers.js"

export const CountrySelect = {
  ...Combobox,
  ...handlers,
  render(entity, api) {
    return html`<div class="vaitu-country-select">
      ${Combobox.render(entity, api)}
    </div>`
  },
}
