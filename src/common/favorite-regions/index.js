import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

// The favorite regions editor shared by the event list and the profile: the
// chosen regions as removable chips, the region combobox, and a free-text
// field for names the combobox does not know. Saving stays with the caller,
// because the profile saves through its form and the event list on its own.
export const FavoriteRegions = {
  render(
    {
      regions = [],
      input = "",
      inputId,
      isDisabled = false,
      onInput,
      onAdd,
      onRemove,
      choiceId,
    },
    api,
  ) {
    return html`<div class=${styles.editor}>
      ${when(
        regions.length,
        () =>
          html`<div class=${styles.chips}>
            ${regions.map((region) =>
              Chip.render({
                children: region,
                isRemovable: true,
                onClick: () => onRemove(region),
              }),
            )}
          </div>`,
      )}
      ${api.render(choiceId)}
      ${Input.render({
        id: inputId,
        inputType: "text",
        value: input,
        placeholder: t("favorites.typeRegion"),
        isFullWidth: true,
        onChange: onInput,
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            onAdd(e.target.value)
          }
        },
        autocapitalize: "none",
        autocorrect: "off",
        autocomplete: "off",
        spellcheck: "false",
      })}
      ${Button.render({
        children: t("common.add"),
        variant: "outline",
        shape: "pill",
        size: "md",
        isFullWidth: true,
        isDisabled: input.trim() === "" || isDisabled,
        onClick: () => onAdd(input),
      })}
    </div>`
  },
}
