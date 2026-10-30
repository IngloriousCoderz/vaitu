import { Flex } from "@inglorious/ui/flex"
import { Switch } from "@inglorious/ui/switch"
import { html } from "@inglorious/web"

import { CategoryPicker } from "../../common/category-picker/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { FavoriteRegions } from "../../common/favorite-regions/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

export const Preferences = {
  render(props, api) {
    return this.renderPreferences(props, api)
  },

  renderPreferences(
    {
      entity,
      onToggleInterest,
      onFavoriteInput,
      onFavoriteAdd,
      onFavoriteRemove,
      onEmails,
    },
    api,
  ) {
    return Page.render({
      variant: "document",
      read: true,
      children: [
        PageStatus.render({
          isError: entity.status === "error",
          error: entity.error,
          isLoading: entity.status !== "ready",
        }) ??
          html`
            <h2 class=${styles.sectionTitle}>${t("preferences.feed")}</h2>
            <p class=${styles.sectionHint}>${t("preferences.feedHint")}</p>
            ${Flex.render({
              direction: "column",
              gap: "lg",
              children: [
                CategoryPicker.render({
                  label: t("fields.interestedCategories"),
                  hint: t("fields.interestedCategoriesHint"),
                  value: entity.interested_categories,
                  onToggle: onToggleInterest,
                }),
                html`<fieldset class=${styles.group}>
                  <legend class=${styles.legend}>
                    ${t("preferences.favoriteRegions")}
                  </legend>
                  ${FavoriteRegions.render(
                    {
                      regions: entity.favorite_regions,
                      input: entity.favoriteInput,
                      inputId: "preferences-favorite-region",
                      onInput: onFavoriteInput,
                      onAdd: onFavoriteAdd,
                      onRemove: onFavoriteRemove,
                      choiceId: "favorite-region-preferences",
                    },
                    api,
                  )}
                </fieldset>`,
              ],
            })}

            <h2 class=${styles.sectionTitle}>${t("preferences.app")}</h2>
            ${Flex.render({
              direction: "column",
              gap: "lg",
              children: [
                html`<div class=${styles.language}>
                  <span class=${styles.legend}
                    >${t("preferences.language")}</span
                  >
                  ${api.render("language")}
                </div>`,
                Switch.render({
                  label: t("preferences.emails"),
                  description: t("preferences.emailsDescription"),
                  isChecked: !entity.is_email_opted_out,
                  onChange: onEmails,
                }),
                Switch.render({
                  label: t("preferences.analytics"),
                  description: t("preferences.analyticsDescription"),
                  isChecked: api.getEntity("analytics")?.consent === "granted",
                  onChange: (isOn) =>
                    api.notify("#analytics:analyticsConsent", isOn),
                }),
              ],
            })}
            ${ErrorAlert.render({
              error: entity.saveError,
              className: styles.error,
            })}
          `,
      ],
    })
  },
}
