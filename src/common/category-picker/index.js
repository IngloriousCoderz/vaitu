import { Chip } from "@inglorious/ui/chip"
import { html } from "@inglorious/web"

import { categories } from "../../views/event-list/categories.js"
import styles from "./style.module.css"

export const CategoryPicker = {
  render({ label, hint, value = [], isDisabled = false, onToggle }) {
    return html`
      <fieldset class=${styles.picker}>
        <legend class=${styles.legend}>${label}</legend>
        <div class=${styles.chips}>
          ${categories.map((category) =>
            Chip.render({
              children: category.label,
              isSelected: value.includes(category.id),
              isDisabled,
              onClick: () => onToggle(category.id),
            }),
          )}
        </div>
        <p class=${styles.hint}>${hint}</p>
      </fieldset>
    `
  },
}
