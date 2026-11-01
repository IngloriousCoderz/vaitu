import { Chip } from "@inglorious/ui/chip"
import { html } from "@inglorious/web"

import styles from "./style.module.css"

export const ChipPicker = {
  render({ label, hint, options, value = [], isDisabled = false, onToggle }) {
    return html`
      <fieldset class=${styles.picker}>
        <legend class=${styles.legend}>${label}</legend>
        <div class=${styles.chips}>
          ${options.map((option) =>
            Chip.render({
              children: option.label,
              isSelected: value.includes(option.id),
              isDisabled,
              onClick: () => onToggle(option.id),
            }),
          )}
        </div>
        <p class=${styles.hint}>${hint}</p>
      </fieldset>
    `
  },
}
