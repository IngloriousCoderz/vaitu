import "./style.css"

import { Combobox } from "@inglorious/ui/combobox"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"

export const CountrySelect = {
  ...Combobox,
  create(entity) {
    entity.placeholder ??= "combobox.select"
    entity.searchPlaceholder ??= "combobox.search"
    entity.noOptionsMessage ??= "combobox.noOptions"
    entity.loadingMessage ??= "combobox.loading"
    Combobox.create(entity)
  },
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
          formatCreateLabel: (term) => t("combobox.addValue", { term }),
          error: t(entity.error),
          options: entity.options.map((option) => ({
            ...option,
            label: t(option.label),
          })),
        },
        api,
      )}
    </div>`
  },
}
