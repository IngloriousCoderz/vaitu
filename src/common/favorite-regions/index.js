import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Input } from "@inglorious/ui/input"
import { html } from "@inglorious/web"

import styles from "./style.module.css"

// The favorite regions editor shared by the event list and the profile: the
// chosen regions as removable chips, the region combobox, and a free-text
// field for names the combobox does not know. Saving stays with the caller,
// because the profile saves through its form and the event list on its own.
export const FavoriteRegions = {
  render({
    regions = [],
    input = "",
    inputId,
    isDisabled = false,
    onInput,
    onAdd,
    onRemove,
    renderChoice,
  }) {
    return html`<div class=${styles.editor}>
      ${
        regions.length
          ? html`<div class=${styles.chips}>
              ${regions.map((region) =>
                Chip.render({
                  children: region,
                  isRemovable: true,
                  onClick: () => onRemove(region),
                }),
              )}
            </div>`
          : ""
      }
      ${renderChoice()}
      ${Input.render({
        id: inputId,
        inputType: "text",
        value: input,
        placeholder: "Or type a region",
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
        children: "Add",
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
