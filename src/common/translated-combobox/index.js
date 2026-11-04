import { Combobox, isOptionGroup } from "@inglorious/ui/combobox"

import { t } from "../../i18n/index.js"

export const TranslatedCombobox = {
  ...Combobox,
  create(entity) {
    entity.placeholder ??= "combobox.select"
    entity.searchPlaceholder ??= "combobox.search"
    entity.noOptionsMessage ??= "combobox.noOptions"
    entity.loadingMessage ??= "combobox.loading"
    Combobox.create(entity)
  },
  render(entity, api) {
    return Combobox.render(
      {
        ...entity,
        label: entity.label ? t(entity.label) : "",
        placeholder: t(entity.placeholder),
        searchPlaceholder: t(entity.searchPlaceholder),
        noOptionsMessage: t(entity.noOptionsMessage),
        loadingMessage: t(entity.loadingMessage),
        formatCreateLabel: (term) => t("combobox.addValue", { term }),
        error: t(entity.error),
        options: entity.options.map(translated),
      },
      api,
    )
  },
}

function translated(option) {
  if (isOptionGroup(option)) {
    return {
      ...option,
      label: t(option.label),
      options: option.options.map(translated),
    }
  }
  return { ...option, label: t(option.label) }
}
