import { Alert } from "@inglorious/ui/alert"
import { Avatar } from "@inglorious/ui/avatar"
import { Button } from "@inglorious/ui/button"
import { Card } from "@inglorious/ui/card"
import { Chip } from "@inglorious/ui/chip"
import { IconButton } from "@inglorious/ui/icon-button"
import { Menu } from "@inglorious/ui/menu"
import { Progress } from "@inglorious/ui/progress"
import { html } from "@inglorious/web"

import { renderPage } from "../../page.js"
import { canonicalRegion, ITALY, uniqueRegions } from "../../regions.js"
import { capitalize } from "../../text.js"
import { Icon } from "../icon/index.js"
import {
  displayInstagram,
  displayWebsite,
  initials,
  instagramUrl,
  progressLabel,
  tierProgress,
} from "./helpers.js"
import styles from "./style.module.css"

export const Profile = {
  render(props, api) {
    this.renderProfile(props, api)
  },

  renderProfile({
    entity,
    onEdit,
    onCancel,
    onField,
    onSave,
    onLogout,
    onOpenApplications,
    onOpenRanks,
    onToggleMenu,
    onCloseMenu,
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

    return renderPage({
      variant: "document",
      className: "vaitu-frame-centerText",
      children: [
        html`
          ${
            status === "loading"
              ? html`<p class=${styles.empty}>Loading profile…</p>`
              : status === "error" && !profile
                ? html`<p class=${styles.empty}>${error}</p>`
                : html`
                    <div class=${styles.header}>
                      ${Avatar.render({
                        initials: initials(profile.full_name),
                        size: "lg",
                        backgroundColor:
                          "linear-gradient(135deg, #6b7a5e, #24402f)",
                        textColor: "#fffdf7",
                      })}
                      ${IconButton.render({
                        icon: Icon.render({ name: "settings", size: 22 }),
                        ariaLabel: "Profile options",
                        className: styles.gearButton,
                        onClick: onToggleMenu,
                      })}
                      ${
                        entity.isMenuOpen
                          ? html`
                              <div
                                class=${styles.menuBackdrop}
                                @click=${onCloseMenu}
                              ></div>
                              ${Menu.render({
                                isOpen: true,
                                className: styles.menu,
                                items: [
                                  {
                                    icon: Icon.render({
                                      name: "pencil",
                                      size: 15,
                                    }),
                                    label: "Edit profile",
                                    onClick: onEdit,
                                  },
                                  {
                                    icon: Icon.render({ name: "x", size: 15 }),
                                    label: "Log out",
                                    onClick: onLogout,
                                  },
                                ],
                              })}
                            `
                          : ""
                      }
                    </div>
                    <h2 class=${styles.name}>${profile.full_name}</h2>
                    <p class=${styles.email}>${profile.email}</p>
                    ${Chip.render({ children: profile.role })}
                    ${
                      profile.role === "seeker" &&
                      entity.stats &&
                      entity.tierConfig
                        ? this.renderTierBlock({
                            stats: entity.stats,
                            tiers: entity.tierConfig,
                            onOpenRanks,
                          })
                        : ""
                    }
                    ${
                      profile.role === "seeker" && entity.stats
                        ? html`
                            <div class=${styles.stats}>
                              ${this.renderStat(
                                entity.stats.applications_count,
                                "Applications",
                                "all",
                                onOpenApplications,
                              )}
                              ${this.renderStat(
                                entity.stats.shortlists_count,
                                "Shortlisted",
                                "shortlisted",
                                onOpenApplications,
                              )}
                              ${this.renderStat(
                                entity.stats.selections_count,
                                "Wins",
                                "selected",
                                onOpenApplications,
                              )}
                            </div>
                          `
                        : ""
                    }
                    ${
                      entity.isEditing
                        ? html`
                            <h3 class=${styles.sectionTitle}>Edit profile</h3>
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
                              value: (shown.website ?? "").replace(
                                /^https?:\/\//i,
                                "",
                              ),
                              placeholder: "your-site.com",
                              prefix: "https://",
                              lowercase: true,
                              inputmode: "url",
                              onField,
                            })}
                            ${this.renderEditField({
                              label: "Instagram",
                              field: "instagram_handle",
                              value: (shown.instagram_handle ?? "").replace(
                                /^@+/,
                                "",
                              ),
                              placeholder: "handle",
                              prefix: "@",
                              lowercase: true,
                              onField,
                            })}
                            <label class=${styles.field}>
                              <span>Country</span>
                              ${renderCountry()}
                            </label>
                            ${
                              shown.country === ITALY
                                ? html`
                                    <label class=${styles.field}>
                                      <span>Region</span>
                                      ${renderRegion()}
                                    </label>
                                  `
                                : this.renderEditField({
                                    label: "Region",
                                    field: "region",
                                    value: shown.region,
                                    placeholder: "Region (optional)",
                                    onField,
                                  })
                            }
                            ${this.renderFavorites({
                              favorites: shown.favorite_regions ?? [],
                              input: entity.favoriteInput ?? "",
                              onFavoriteInput,
                              onFavoriteAdd,
                              onFavoriteRemove,
                              renderFavoriteChoice,
                            })}
                            ${
                              status === "error" && error
                                ? Alert.render({
                                    severity: "error",
                                    className: `vaitu-alert ${styles.error}`,
                                    children: error,
                                  })
                                : ""
                            }
                            ${Button.render({
                              children: saving ? "Saving…" : "Save profile",
                              color: "primary",
                              shape: "pill",
                              size: "md",
                              isFullWidth: true,
                              isDisabled: saving,
                              className: styles.editButton,
                              onClick: onSave,
                            })}
                            ${Button.render({
                              children: "Cancel",
                              variant: "outline",
                              shape: "pill",
                              size: "md",
                              isFullWidth: true,
                              className: styles.cancelButton,
                              onClick: onCancel,
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
                          `
                    }
                  `
          }
        `,
      ],
    })
  },

  renderRow(label, value, href) {
    return html`
      <div class=${styles.row}>
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
      </div>
    `
  },

  renderStat(value, label, status_filter, onOpenApplications) {
    return Button.render({
      children: html`
        <span class=${styles.statValue}>${value}</span>
        <span class=${styles.statLabel}>${label}</span>
      `,
      className: styles.stat,
      onClick: () => onOpenApplications(status_filter),
    })
  },

  renderEditField({
    label,
    field,
    value,
    placeholder,
    prefix,
    lowercase,
    inputmode,
    onField,
  }) {
    const handleInput = (e) => {
      const raw = e.target.value
      onField({ field, value: lowercase ? raw.toLowerCase() : raw })
    }
    const input = html`
      <input
        type="text"
        placeholder=${placeholder}
        spellcheck="false"
        autocapitalize="none"
        autocorrect="off"
        autocomplete="off"
        inputmode=${inputmode ?? "text"}
        .value=${value ?? ""}
        @input=${handleInput}
      />
    `
    return html`
      <label class=${styles.field}>
        <span>${label}</span>
        <div class=${styles.urlWrap}>
          ${prefix ? html`<span class=${styles.urlPrefix}>${prefix}</span>` : ""}
          ${input}
        </div>
      </label>
    `
  },

  renderFavorites({
    favorites,
    input,
    onFavoriteInput,
    onFavoriteAdd,
    onFavoriteRemove,
    renderFavoriteChoice,
  }) {
    return html`
      <div class=${styles.field}>
        <span>Favorite regions (optional)</span>
        ${
          favorites.length
            ? html`
                <div class=${styles.favoriteChips}>
                  ${favorites.map(
                    (region) => html`
                      <span class=${styles.favoriteChip}>
                        ${region}
                        <button
                          class=${styles.favoriteRemove}
                          type="button"
                          aria-label=${`Remove ${region}`}
                          @click=${() => onFavoriteRemove(region)}
                        >
                          ${Icon.render({ name: "x", size: 13 })}
                        </button>
                      </span>
                    `,
                  )}
                </div>
              `
            : ""
        }
        ${renderFavoriteChoice()}
        <div class=${styles.urlWrap}>
          <input
            type="text"
            placeholder="Or type a region"
            autocapitalize="none"
            autocorrect="off"
            autocomplete="off"
            spellcheck="false"
            .value=${input}
            @input=${(e) => onFavoriteInput(e.target.value)}
            @keydown=${(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onFavoriteAdd(e.target.value)
              }
            }}
          />
          ${Button.render({
            children: "Add",
            variant: "outline",
            shape: "pill",
            size: "md",
            isDisabled: input.trim() === "",
            onClick: () => onFavoriteAdd(input),
          })}
        </div>
      </div>
    `
  },

  renderTierBlock({ stats, tiers, onOpenRanks }) {
    const progress = tierProgress(stats.points, tiers)
    return Card.render({
      element: "div",
      className: styles.tierBlock,
      body: html`
        <span class=${styles.tierMedal} data-tier=${progress.current ?? "none"}>
          ${Icon.render({ name: "medal", size: 28 })}
        </span>
        <span class=${styles.tierName}>
          ${progress.current ? capitalize(progress.current) : "No rank"}
        </span>
        <span class=${styles.tierPoints}>${stats.points ?? 0} pts</span>
        ${Progress.render({
          color: "primary",
          value: progress.percent,
          className: styles.progressTrack,
        })}
        <span class=${styles.progressRow}>
          <span>${progressLabel(stats.points, tiers)}</span>
          ${IconButton.render({
            icon: Icon.render({ name: "help-circle", size: 13 }),
            ariaLabel: "How ranks work",
            className: styles.ranksHelp,
            onClick: onOpenRanks,
          })}
        </span>
      `,
    })
  },
}
