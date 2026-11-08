import helpOutline from "@iconify-icons/material-symbols/help-outline"
import socialLeaderboardOutline from "@iconify-icons/material-symbols/social-leaderboard-outline"
import { Button } from "@inglorious/ui/button"
import { Card } from "@inglorious/ui/card"
import { CropDialog } from "@inglorious/ui/crop-dialog"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { Progress } from "@inglorious/ui/progress"
import { html, nothing } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { Badges } from "../../common/badges/index.js"
import { ConfirmDialog } from "../../common/confirm-dialog/index.js"
import { ErrorAlert } from "../../common/error-alert/index.js"
import { LoadStatus } from "../../common/load-status/index.js"
import { Page } from "../../common/page/index.js"
import { telUrl } from "../../common/profile.js"
import { ProfileAvatar } from "../../common/profile-avatar/index.js"
import { progressLabel, tierProgress } from "../../common/tiers.js"
import { NO_POINTS } from "../../constants/index.js"
import { t } from "../../i18n/index.js"
import { AVATAR_CROPPER } from "./avatar-cropper.js"
import { displayWebsite } from "./helpers.js"
import styles from "./style.module.css"

export const template = {
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
      onPhotoCropCancel,
      onPhotoCropApply,
      onLogout,
      onDeactivateAsk,
      onDeactivateCancel,
      onDeactivate,
      onDeleteAsk,
      onDeleteCancel,
      onDelete,
      onOpenApplications,
      onOpenRanks,
      onOpenPreferences,
      onOpenAbout,
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
          ${LoadStatus.render({
            isError: status === "error" && !profile,
            error,
            isLoading: !profile,
            content: () => html`
              ${Flex.render({
                direction: "column",
                align: "center",
                gap: "sm",
                children: [
                  ProfileAvatar.render({
                    name: profile.full_name,
                    src: profile.avatar_url,
                    size: "2xl",
                  }),
                  Button.render({
                    children:
                      entity.avatarStatus === "saving"
                        ? t("common.saving")
                        : t("profile.changePhoto"),
                    variant: "outline",
                    shape: "pill",
                    size: "sm",
                    isDisabled: entity.avatarStatus === "saving",
                    accept: "image/jpeg,image/png,image/webp",
                    onFileSelect: ([file]) => onPhoto(file),
                  }),
                  when(!entity.isAvatarCropOpen, () =>
                    ErrorAlert.render({ error: entity.avatarError }),
                  ),
                  this.renderAvatarCrop({
                    entity,
                    api,
                    onPhotoCropCancel,
                    onPhotoCropApply,
                  }),
                ],
              })}
              <h2 class=${styles.name}>${profile.full_name}</h2>
              <p class=${styles.email}>${profile.email}</p>
              ${when(entity.stats && entity.tierConfig, () =>
                this.renderTierBlock({
                  stats: entity.stats,
                  tiers: entity.tierConfig,
                  onOpenRanks,
                }),
              )}
              ${when(
                entity.stats?.review_count,
                () =>
                  html`<p class=${styles.rating}>
                    ${t("reputation.rating", {
                      rating: entity.stats.average_rating,
                      count: entity.stats.review_count,
                    })}
                  </p>`,
              )}
              ${when(
                entity.stats?.badges?.length,
                () =>
                  html`<div class=${styles.badges}>
                    ${Badges.render({
                      badges: entity.stats.badges,
                      justify: "center",
                    })}
                  </div>`,
              )}
              ${when(entity.stats, () =>
                Flex.render({
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
                }),
              )}
              ${when(
                entity.isEditing,
                () => html`
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
                        label: t("fields.phone"),
                        field: "phone",
                        value: shown.phone,
                        placeholder: t("fields.phoneExample"),
                        hint: t("fields.phoneHint"),
                        inputmode: "tel",
                        onField,
                      })}
                      ${Flex.render({
                        direction: "column",
                        className: styles.field,
                        children: api.render("countryProfile"),
                      })}
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
                `,
                () => html`
                  <dl class=${styles.rows}>
                    ${this.renderRow(
                      t("fields.website"),
                      displayWebsite(profile.website),
                      displayWebsite(profile.website) || null,
                    )}
                    ${this.renderRow(
                      t("fields.phone"),
                      profile.phone,
                      telUrl(profile.phone),
                    )}
                    ${this.renderRow(t("fields.country"), profile.country)}
                  </dl>
                  ${this.renderAccountActions({
                    onEdit,
                    onOpenPreferences,
                    onOpenAbout,
                    onLogout,
                    onDeactivateAsk,
                    onDeleteAsk,
                  })}
                  ${this.renderDeleteAccount({
                    entity,
                    onDeleteCancel,
                    onDelete,
                  })}
                  ${this.renderDeactivateAccount({
                    entity,
                    onDeactivateCancel,
                    onDeactivate,
                  })}
                `,
              )}
            `,
          })}
        `,
      ],
    })
  },

  renderAvatarCrop({ entity, api, onPhotoCropCancel, onPhotoCropApply }) {
    if (!entity.isAvatarCropOpen) return nothing
    return CropDialog.render(
      {
        cropperId: AVATAR_CROPPER,
        title: t("profile.cropTitle"),
        description: t("profile.cropHint"),
        applyLabel: t("profile.cropApply"),
        cancelLabel: t("common.cancel"),
        savingLabel: t("common.saving"),
        closeLabel: t("common.close"),
        loadErrorText: t("errors.imageCrop"),
        error: t(entity.avatarError),
        isOpen: true,
        isSaving: entity.avatarStatus === "saving",
        onCancel: onPhotoCropCancel,
        onApply: onPhotoCropApply,
      },
      api,
    )
  },

  renderRow(label, value, href) {
    return Flex.render({
      justify: "between",
      className: styles.row,
      children: html`
        <dt>${label}</dt>
        <dd>
          ${when(
            href,
            () => html`
              <a
                class=${styles.rowLink}
                href=${href}
                target="_blank"
                rel="noopener"
              >
                ${value || "—"}
              </a>
            `,
            () => value || "—",
          )}
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
    hint,
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
      hint,
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

  renderAccountActions({
    onEdit,
    onOpenPreferences,
    onOpenAbout,
    onLogout,
    onDeactivateAsk,
    onDeleteAsk,
  }) {
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
          children: t("nav.preferences"),
          variant: "outline",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onOpenPreferences,
        }),
        Button.render({
          children: t("nav.about"),
          variant: "outline",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onOpenAbout,
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
        Button.render({
          children: t("profile.deleteAccount"),
          variant: "ghost",
          color: "error",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onDeleteAsk,
        }),
      ],
    })
  },

  renderDeactivateAccount({ entity, onDeactivateCancel, onDeactivate }) {
    return ConfirmDialog.render({
      id: "deactivate-account-confirm",
      isOpen: entity.isConfirmingDeactivate,
      message: t("profile.deactivateConfirm"),
      error: entity.deactivateError,
      confirmLabel: t("profile.yesDeactivate"),
      busyLabel: t("profile.deactivating"),
      isBusy: entity.deactivateStatus === "deactivating",
      onConfirm: onDeactivate,
      onCancel: onDeactivateCancel,
    })
  },

  renderDeleteAccount({ entity, onDeleteCancel, onDelete }) {
    return ConfirmDialog.render({
      id: "delete-account-confirm",
      isOpen: entity.isConfirmingDelete,
      message: t("eraseAccount.warning"),
      error: entity.deleteError,
      confirmLabel: t("eraseAccount.confirm"),
      busyLabel: t("eraseAccount.erasing"),
      isBusy: entity.deleteStatus === "deleting",
      onConfirm: onDelete,
      onCancel: onDeleteCancel,
    })
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
            >${t("ranks.points", { count: stats.points ?? NO_POINTS })}</span
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
                shape: "round",
                size: "sm",
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
