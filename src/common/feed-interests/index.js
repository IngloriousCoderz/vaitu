import { ChipPicker } from "@inglorious/ui/chip-picker"
import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { offeredSettings, professions } from "../../data/job-taxonomy.js"
import { t } from "../../i18n/index.js"
import { ProfessionRequest } from "../profession-request/index.js"
import styles from "./style.module.css"

/** The professions and settings a feed shows by default. */
export const FeedInterests = {
  /**
   * @param {{
   *   professions: string[],
   *   settings?: string[],
   *   hasSettings?: boolean,
   *   isDisabled?: boolean,
   *   onToggleProfession: (id: string | number) => void,
   *   onToggleSetting?: (id: string | number) => void,
   * }} props
   */
  render({
    professions: picked,
    settings = [],
    hasSettings = false,
    isDisabled = false,
    onToggleProfession,
    onToggleSetting,
  }) {
    return html`
      <div class=${styles.interests}>
        ${ChipPicker.render({
          label: t("fields.professions"),
          hint: html`${t("fields.professionsHint")}
          ${ProfessionRequest.render()}`,
          options: options(professions),
          value: picked,
          isDisabled,
          onToggle: onToggleProfession,
        })}
        ${when(hasSettings, () =>
          ChipPicker.render({
            label: t("fields.settings"),
            hint: t("fields.settingsHint"),
            options: options(offeredSettings),
            value: settings,
            isDisabled,
            onToggle: onToggleSetting,
          }),
        )}
      </div>
    `
  },
}

function options(items) {
  return items.map(({ id, label }) => ({ value: id, label: t(label) }))
}
