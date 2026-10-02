import { Avatar } from "@inglorious/ui/avatar"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { IconButton } from "@inglorious/ui/icon-button"
import { html } from "@inglorious/web"

import {
  displayInstagram,
  displayWebsite,
  initials,
  instagramUrl,
  progressLabel,
  tierProgress,
} from "./helpers.js"
import { capitalize } from "../../text.js"
import { renderIcon } from "../icon/index.js"
import styles from "./style.module.css"

function renderRow(label, value, href) {
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
}

function renderStat(value, label, status_filter, onOpenApplications) {
  return Button.render({
    children: html`
      <span class=${styles.statValue}>${value}</span>
      <span class=${styles.statLabel}>${label}</span>
    `,
    className: styles.stat,
    onClick: () => onOpenApplications(status_filter),
  })
}

function renderEditField({
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
}

function renderTierBlock({ stats, tiers, onOpenRanks }) {
  const progress = tierProgress(stats.points, tiers)
  return html`
    <div class=${styles.tierBlock}>
      <span class=${styles.tierMedal} data-tier=${progress.current ?? "none"}>
        ${renderIcon({ name: "medal", size: 28 })}
      </span>
      <span class=${styles.tierName}>
        ${progress.current ? capitalize(progress.current) : "No rank"}
      </span>
      <span class=${styles.tierPoints}>${stats.points ?? 0} pts</span>
      <div class=${styles.progressTrack}>
        <div
          class=${styles.progressFill}
          style=${`width: ${progress.percent}%`}
        ></div>
      </div>
      <span class=${styles.progressRow}>
        <span>${progressLabel(stats.points, tiers)}</span>
        ${IconButton.render({
          icon: renderIcon({ name: "help-circle", size: 13 }),
          ariaLabel: "How ranks work",
          className: styles.ranksHelp,
          onClick: onOpenRanks,
        })}
      </span>
    </div>
  `
}

export function renderProfile({
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
  renderCountry,
}) {
  const { profile, status, error } = entity
  const saving = status === "saving"
  const shown = entity.isEditing && entity.draft ? entity.draft : profile

  return html`
    <div class=${styles.page} data-category="wedding">
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
                    icon: renderIcon({ name: "settings", size: 22 }),
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
                          <div class=${styles.menu}>
                            <button
                              class=${styles.menuItem}
                              type="button"
                              @click=${onEdit}
                            >
                              ${renderIcon({ name: "pencil", size: 15 })}
                              <span>Edit profile</span>
                            </button>
                            <button
                              class=${styles.menuItem}
                              type="button"
                              @click=${onLogout}
                            >
                              ${renderIcon({ name: "x", size: 15 })}
                              <span>Log out</span>
                            </button>
                          </div>
                        `
                      : ""
                  }
                </div>
                <h2 class=${styles.name}>${profile.full_name}</h2>
                <p class=${styles.email}>${profile.email}</p>
                ${Chip.render({ children: profile.role })}
                ${
                  profile.role === "seeker" && entity.stats && entity.tierConfig
                    ? renderTierBlock({
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
                          ${renderStat(
                            entity.stats.applications_count,
                            "Applications",
                            "all",
                            onOpenApplications,
                          )}
                          ${renderStat(
                            entity.stats.shortlists_count,
                            "Shortlisted",
                            "shortlisted",
                            onOpenApplications,
                          )}
                          ${renderStat(
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
                        ${renderEditField({
                          label: "Full name",
                          field: "full_name",
                          value: shown.full_name,
                          placeholder: "Your name",
                          onField,
                        })}
                        ${renderEditField({
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
                        ${renderEditField({
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
                        ${renderEditField({
                          label: "Region",
                          field: "region",
                          value: shown.region,
                          placeholder: "Region (optional)",
                          onField,
                        })}
                        ${
                          status === "error" && error
                            ? html`<p class=${styles.error}>${error}</p>`
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
                          ${renderRow(
                            "Website",
                            displayWebsite(profile.website),
                            displayWebsite(profile.website) || null,
                          )}
                          ${renderRow(
                            "Instagram",
                            displayInstagram(profile.instagram_handle),
                            instagramUrl(profile.instagram_handle),
                          )}
                          ${renderRow("Country", profile.country)}
                          ${renderRow("Region", profile.region)}
                          ${renderRow("Sub-role", profile.sub_role)}
                        </dl>
                      `
                }
              `
      }
    </div>
  `
}
