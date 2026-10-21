import helpOutline from "@iconify-icons/material-symbols/help-outline"
import socialLeaderboardOutline from "@iconify-icons/material-symbols/social-leaderboard-outline"
import { Avatar } from "@inglorious/ui/avatar"
import { Button } from "@inglorious/ui/button"
import { Card } from "@inglorious/ui/card"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { Progress } from "@inglorious/ui/progress"
import { html } from "@inglorious/web"

import { ConfirmPrompt } from "../../common/confirm-prompt/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { FavoriteRegions } from "../../common/favorite-regions/index.js"
import { Page } from "../../common/page/index.js"
import { PageStatus } from "../../common/page-status/index.js"
import { progressLabel, tierProgress } from "../../common/tiers.js"
import {
  canonicalRegion,
  ITALY,
  uniqueRegions,
} from "../../data/regions/resolve.js"
import { t } from "../../i18n/index.js"
import {
  displayInstagram,
  displayWebsite,
  initials,
  instagramUrl,
} from "./helpers.js"
import styles from "./style.module.css"

export const Profile = {
  render(props, api) {
    return this.renderProfile(props, api)
  },

  renderProfile(
    {
      entity,
      onCancel,
      onField,
      onSave,
      onEdit,
      onPhoto,
      onLogout,
      onDeactivateAsk,
      onDeactivateCancel,
      onDeactivate,
      onOpenApplications,
      onOpenRanks,
      onFavoriteInput,
      onFavoriteAdd,
      onFavoriteRemove,
    },
    api,
  ) {
    const { profile, status, error } = entity
    const saving = status === "saving"
    const shown = entity.isEditing ? entity.values : profile

    return Page.render({
      variant: "document",
      align: "center",
      read: true,
      children: [
        html`
          ${
            PageStatus.render({
              isError: status === "error" && !profile,
              error,
              isLoading: status === "loading" || !profile,
              loadingText: t("profile.loading"),
            }) ??
            html`
              ${Flex.render({
                direction: "column",
                align: "center",
                gap: "sm",
                children: [
                  Avatar.render({
                    src: profile.avatar_url || "",
                    alt: profile.full_name ?? "",
                    initials: initials(profile.full_name),
                    size: "lg",
                    backgroundColor:
                      "linear-gradient(135deg, #6b7a5e, #24402f)",
                    textColor: "#fffdf7",
                  }),
                  html`<div class=${styles.photoPick}>
                    ${Button.render({
                      children:
                        entity.avatarStatus === "saving"
                          ? t("common.saving")
                          : t("profile.changePhoto"),
                      variant: "outline",
                      shape: "pill",
                      size: "sm",
                      isDisabled: entity.avatarStatus === "saving",
                    })}
                    <input
                      class=${styles.fileInput}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      ?disabled=${entity.avatarStatus === "saving"}
                      @change=${(e) => {
                        const [file] = e.target.files ?? []
                        if (file) onPhoto(file)
                        e.target.value = ""
                      }}
                    />
                  </div>`,
                  ErrorAlert.render({ error: entity.avatarError }),
                ],
              })}
              <h2 class=${styles.name}>${profile.full_name}</h2>
              <p class=${styles.email}>${profile.email}</p>
              ${
                entity.stats && entity.tierConfig
                  ? this.renderTierBlock({
                      stats: entity.stats,
                      tiers: entity.tierConfig,
                      onOpenRanks,
                    })
                  : ""
              }
              ${
                entity.stats
                  ? Flex.render({
                      justify: "center",
                      gap: "sm",
                      className: styles.stats,
                      children: [
                        this.renderStat(
                          entity.stats.applications_count,
                          t("profile.applications"),
                          "all",
                          onOpenApplications,
                        ),
                        this.renderStat(
                          entity.stats.shortlists_count,
                          t("profile.shortlisted"),
                          "shortlisted",
                          onOpenApplications,
                        ),
                        this.renderStat(
                          entity.stats.selections_count,
                          t("profile.wins"),
                          "selected",
                          onOpenApplications,
                        ),
                      ],
                    })
                  : ""
              }
              ${
                entity.isEditing
                  ? html`
                      <h3 class=${styles.sectionTitle}>${t("profile.edit")}</h3>
                      ${Flex.render({
                        direction: "column",
                        gap: "md",
                        className: styles.editForm,
                        children: html`
                          ${this.renderEditField({
                            label: t("auth.fullName"),
                            field: "full_name",
                            value: shown.full_name,
                            placeholder: t("auth.yourName"),
                            onField,
                          })}
                          ${this.renderEditField({
                            label: t("fields.website"),
                            field: "website",
                            icon: "https://",
                            value: (shown.website ?? "").replace(
                              /^https?:\/\//i,
                              "",
                            ),
                            placeholder: t("fields.websiteExample"),
                            lowercase: true,
                            inputmode: "url",
                            onField,
                          })}
                          ${this.renderEditField({
                            label: t("fields.instagram"),
                            field: "instagram_handle",
                            icon: "@",
                            value: (shown.instagram_handle ?? "").replace(
                              /^@+/,
                              "",
                            ),
                            placeholder: t("fields.instagramExample"),
                            lowercase: true,
                            onField,
                          })}
                          ${Flex.render({
                            direction: "column",
                            className: styles.field,
                            children: api.render("country-profile"),
                          })}
                          ${
                            shown.country === ITALY
                              ? Flex.render({
                                  direction: "column",
                                  className: styles.field,
                                  children: api.render("region-profile"),
                                })
                              : this.renderEditField({
                                  label: t("fields.region"),
                                  field: "region",
                                  value: shown.region,
                                  placeholder: t("fields.regionOptional"),
                                  onField,
                                })
                          }
                          ${FavoriteRegions.render(
                            {
                              regions: shown.favorite_regions ?? [],
                              input: entity.favoriteInput ?? "",
                              inputId: "profile-favorite-region",
                              onInput: onFavoriteInput,
                              onAdd: onFavoriteAdd,
                              onRemove: onFavoriteRemove,
                              choiceId: "favorite-region-profile",
                            },
                            api,
                          )}
                          ${ErrorAlert.render({
                            error: status === "error" && error ? error : null,
                          })}
                          ${Button.render({
                            children: saving
                              ? t("common.saving")
                              : t("profile.save"),
                            color: "primary",
                            shape: "pill",
                            size: "md",
                            isFullWidth: true,
                            isDisabled: saving,
                            onClick: onSave,
                          })}
                          ${Button.render({
                            children: t("common.cancel"),
                            variant: "outline",
                            shape: "pill",
                            size: "md",
                            isFullWidth: true,
                            onClick: onCancel,
                          })}
                        `,
                      })}
                    `
                  : html`
                      <dl class=${styles.rows}>
                        ${this.renderRow(
                          t("fields.website"),
                          displayWebsite(profile.website),
                          displayWebsite(profile.website) || null,
                        )}
                        ${this.renderRow(
                          t("fields.instagram"),
                          displayInstagram(profile.instagram_handle),
                          instagramUrl(profile.instagram_handle),
                        )}
                        ${this.renderRow(t("fields.country"), profile.country)}
                        ${this.renderRow(t("fields.region"), canonicalRegion(profile.region))}
                        ${this.renderRow(
                          t("profile.favoriteRegions"),
                          uniqueRegions(profile.favorite_regions ?? []).join(
                            ", ",
                          ),
                        )}
                        ${this.renderRow(t("profile.subRole"), profile.sub_role)}
                      </dl>
                      ${this.renderLanguage(api)}
                      ${this.renderAccountActions({
                        onEdit,
                        onLogout,
                        onDeactivateAsk,
                      })}
                      ${this.renderDeactivateAccount({
                        entity,
                        onDeactivateCancel,
                        onDeactivate,
                      })}
                    `
              }
            `
          }
        `,
      ],
    })
  },

  renderRow(label, value, href) {
    return Flex.render({
      justify: "between",
      className: styles.row,
      children: html`
        <dt>${label}</dt>
        <dd>
          ${
            href
              ? html`
                  <a
                    class=${styles.rowLink}
                    href=${href}
                    target="_blank"
                    rel="noopener"
                  >
                    ${value || "—"}
                  </a>
                `
              : value || "—"
          }
        </dd>
      `,
    })
  },

  renderStat(value, label, status_filter, onOpenApplications) {
    return Button.render({
      children: Flex.render({
        direction: "column",
        align: "stretch",
        isFullWidth: true,
        children: html`
          <span class=${styles.statValue}>${value}</span>
          <span class=${styles.statLabel}>${label}</span>
        `,
      }),
      className: styles.stat,
      onClick: () => onOpenApplications(status_filter),
    })
  },

  renderEditField({
    label,
    field,
    icon,
    value,
    placeholder,
    lowercase,
    inputmode,
    onField,
  }) {
    return Input.render({
      id: `profile-${field}`,
      label,
      icon,
      inputType: "text",
      value: value ?? "",
      placeholder,
      isFullWidth: true,
      onChange: (raw) =>
        onField({ field, value: lowercase ? raw.toLowerCase() : raw }),
      spellcheck: "false",
      autocapitalize: "none",
      autocorrect: "off",
      autocomplete: "off",
      inputmode: inputmode ?? "text",
    })
  },

  // Editing is the profile's main action; logging out is there when you need
  // it, quieter, and never in the way.
  // The app's language, each named in itself.
  renderLanguage(api) {
    return Flex.render({
      justify: "between",
      align: "center",
      gap: "md",
      className: styles.language,
      children: [
        html`<span class=${styles.languageLabel}
          >${t("profile.language")}</span
        >`,
        api.render("language"),
      ],
    })
  },

  renderAccountActions({ onEdit, onLogout, onDeactivateAsk }) {
    return Flex.render({
      direction: "column",
      gap: "sm",
      className: styles.accountActions,
      children: [
        Button.render({
          children: t("profile.edit"),
          variant: "outline",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onEdit,
        }),
        Button.render({
          children: t("profile.logOut"),
          variant: "ghost",
          color: "secondary",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onLogout,
        }),
        Button.render({
          children: t("profile.deactivateAccount"),
          variant: "ghost",
          color: "error",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onDeactivateAsk,
        }),
      ],
    })
  },

  // Soft-deactivate: data stays for re-engagement; signing in again restores.
  renderDeactivateAccount({ entity, onDeactivateCancel, onDeactivate }) {
    if (!entity.isConfirmingDeactivate) return ""
    return html`
      ${ConfirmPrompt.render({
        id: "deactivate-account-confirm",
        message: t("profile.deactivateConfirm"),
        confirmLabel: t("profile.yesDeactivate"),
        busyLabel: t("profile.deactivating"),
        isBusy: entity.deactivateStatus === "deactivating",
        isStacked: true,
        className: styles.deactivateConfirm,
        onConfirm: onDeactivate,
        onCancel: onDeactivateCancel,
      })}
      ${ErrorAlert.render({ error: entity.deactivateError })}
    `
  },

  renderTierBlock({ stats, tiers, onOpenRanks }) {
    const progress = tierProgress(stats.points, tiers)
    return Card.render({
      element: "div",
      className: styles.tierBlock,
      body: Flex.render({
        direction: "column",
        align: "center",
        gap: "sm",
        children: [
          Flex.render({
            element: "span",
            isInline: true,
            className: styles.tierMedal,
            "data-tier": progress.current ?? "none",
            children: Icon.render({
              icon: socialLeaderboardOutline,
              size: "lg",
            }),
          }),
          html`<span class=${styles.tierName}>
            ${progress.current ? t(`ranks.tier.${progress.current}`) : t("ranks.noRank")}
          </span>`,
          html`<span class=${styles.tierPoints}
            >${t("ranks.points", { count: stats.points ?? 0 })}</span
          >`,
          Progress.render({
            color: "primary",
            value: progress.percent,
            className: styles.progressTrack,
          }),
          Flex.render({
            element: "span",
            isInline: true,
            align: "center",
            className: styles.progressRow,
            children: [
              html`<span>${progressLabel(stats.points, tiers)}</span>`,
              IconButton.render({
                icon: Icon.render({ icon: helpOutline, size: "lg" }),
                variant: "ghost",
                color: "secondary",
                ariaLabel: t("profile.howRanksWork"),
                className: styles.ranksHelp,
                onClick: onOpenRanks,
              }),
            ],
          }),
        ],
      }),
    })
  },
}
