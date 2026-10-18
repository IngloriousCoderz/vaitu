import { Avatar } from "@inglorious/ui/avatar"
import { Button } from "@inglorious/ui/button"
import { Card } from "@inglorious/ui/card"
import { Flex } from "@inglorious/ui/flex"
import { IconButton } from "@inglorious/ui/icon-button"
import { Input } from "@inglorious/ui/input"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { Progress } from "@inglorious/ui/progress"
import { html } from "@inglorious/web"

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
import { capitalize } from "../../text/index.js"
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

  renderProfile({
    entity,
    onCancel,
    onField,
    onSave,
    onEdit,
    onLogout,
    onOpenApplications,
    onOpenRanks,
    onFavoriteInput,
    onFavoriteAdd,
    onFavoriteRemove,
    renderCountry,
    renderRegion,
    renderFavoriteChoice,
  }) {
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
              loadingText: "Loading profile…",
            }) ??
            html`
              ${Flex.render({
                justify: "center",
                children: [
                  Avatar.render({
                    initials: initials(profile.full_name),
                    size: "lg",
                    backgroundColor:
                      "linear-gradient(135deg, #6b7a5e, #24402f)",
                    textColor: "#fffdf7",
                  }),
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
                          "Applications",
                          "all",
                          onOpenApplications,
                        ),
                        this.renderStat(
                          entity.stats.shortlists_count,
                          "Shortlisted",
                          "shortlisted",
                          onOpenApplications,
                        ),
                        this.renderStat(
                          entity.stats.selections_count,
                          "Wins",
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
                      <h3 class=${styles.sectionTitle}>Edit profile</h3>
                      ${Flex.render({
                        direction: "column",
                        gap: "md",
                        className: styles.editForm,
                        children: html`
                          ${this.renderEditField({
                            label: "Full name",
                            field: "full_name",
                            value: shown.full_name,
                            placeholder: "Your name",
                            onField,
                          })}
                          ${this.renderEditField({
                            label: "Website",
                            field: "website",
                            icon: "https://",
                            value: (shown.website ?? "").replace(
                              /^https?:\/\//i,
                              "",
                            ),
                            placeholder: "your-site.com",
                            lowercase: true,
                            inputmode: "url",
                            onField,
                          })}
                          ${this.renderEditField({
                            label: "Instagram",
                            field: "instagram_handle",
                            icon: "@",
                            value: (shown.instagram_handle ?? "").replace(
                              /^@+/,
                              "",
                            ),
                            placeholder: "handle",
                            lowercase: true,
                            onField,
                          })}
                          ${Flex.render({
                            direction: "column",
                            className: styles.field,
                            children: renderCountry(),
                          })}
                          ${
                            shown.country === ITALY
                              ? Flex.render({
                                  direction: "column",
                                  className: styles.field,
                                  children: renderRegion(),
                                })
                              : this.renderEditField({
                                  label: "Region",
                                  field: "region",
                                  value: shown.region,
                                  placeholder: "Region (optional)",
                                  onField,
                                })
                          }
                          ${FavoriteRegions.render({
                            regions: shown.favorite_regions ?? [],
                            input: entity.favoriteInput ?? "",
                            inputId: "profile-favorite-region",
                            onInput: onFavoriteInput,
                            onAdd: onFavoriteAdd,
                            onRemove: onFavoriteRemove,
                            renderChoice: renderFavoriteChoice,
                          })}
                          ${ErrorAlert.render({
                            error: status === "error" && error ? error : null,
                          })}
                          ${Button.render({
                            children: saving ? "Saving…" : "Save profile",
                            color: "primary",
                            shape: "pill",
                            size: "md",
                            isFullWidth: true,
                            isDisabled: saving,
                            onClick: onSave,
                          })}
                          ${Button.render({
                            children: "Cancel",
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
                          "Website",
                          displayWebsite(profile.website),
                          displayWebsite(profile.website) || null,
                        )}
                        ${this.renderRow(
                          "Instagram",
                          displayInstagram(profile.instagram_handle),
                          instagramUrl(profile.instagram_handle),
                        )}
                        ${this.renderRow("Country", profile.country)}
                        ${this.renderRow("Region", canonicalRegion(profile.region))}
                        ${this.renderRow(
                          "Favorite regions",
                          uniqueRegions(profile.favorite_regions ?? []).join(
                            ", ",
                          ),
                        )}
                        ${this.renderRow("Sub-role", profile.sub_role)}
                      </dl>
                      ${this.renderAccountActions({ onEdit, onLogout })}
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
  renderAccountActions({ onEdit, onLogout }) {
    return Flex.render({
      direction: "column",
      gap: "sm",
      className: styles.accountActions,
      children: [
        Button.render({
          children: "Edit profile",
          variant: "outline",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onEdit,
        }),
        Button.render({
          children: "Log out",
          variant: "ghost",
          color: "secondary",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          onClick: onLogout,
        }),
      ],
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
            children: MaterialIcon.render({
              name: "social_leaderboard",
              size: "lg",
            }),
          }),
          html`<span class=${styles.tierName}>
            ${progress.current ? capitalize(progress.current) : "No rank"}
          </span>`,
          html`<span class=${styles.tierPoints}
            >${stats.points ?? 0} pts</span
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
                icon: MaterialIcon.render({ name: "help", size: "lg" }),
                variant: "ghost",
                color: "secondary",
                ariaLabel: "How ranks work",
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
