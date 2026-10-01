import { html } from "@inglorious/web"
import { Avatar } from "@inglorious/ui/avatar"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"
import { Select } from "@inglorious/ui/select"

import { countries } from "../../data/countries.js"

import {
  displayInstagram,
  displayWebsite,
  instagramUrl,
  initials,
} from "./helpers.js"
import styles from "./style.module.css"

function renderRow(label, value, href) {  return html`
    <div class=${styles.row}>
      <dt>${label}</dt>
      <dd>
        ${href
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
          : (value || "—")}
      </dd>
    </div>
  `
}

function renderStat(value, label) {
  return html`
    <div class=${styles.stat}>
      <span class=${styles.statValue}>${value}</span>
      <span class=${styles.statLabel}>${label}</span>
    </div>
  `
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
        ${prefix
          ? html`<span class=${styles.urlPrefix}>${prefix}</span>`
          : ""}
        ${input}
      </div>
    </label>
  `
}

export function renderProfile({
  entity,
  onEdit,
  onCancel,
  onField,
  onSave,
  onLogout,
}) {
  const { profile, status, error } = entity
  const saving = status === "saving"
  const shown = entity.isEditing && entity.draft ? entity.draft : profile

  return html`
    <div class=${styles.page} data-category="wedding">
      ${status === "loading"
        ? html`<p class=${styles.empty}>Loading profile…</p>`
        : status === "error" && !profile
          ? html`<p class=${styles.empty}>${error}</p>`
          : html`
              ${Avatar.render({
                initials: initials(profile.full_name),
                size: "lg",
                backgroundColor:
                  "linear-gradient(135deg, #6b7a5e, #24402f)",
                textColor: "#fffdf7",
              })}
              <h2 class=${styles.name}>${profile.full_name}</h2>
              <p class=${styles.email}>${profile.email}</p>
              ${Chip.render({ children: profile.role })}
              ${profile.role === "seeker" && entity.stats
                ? html`
                    <div class=${styles.stats}>
                      ${renderStat(
                        entity.stats.applications_count,
                        "Applications",
                      )}
                      ${renderStat(
                        entity.stats.shortlists_count,
                        "Shortlisted",
                      )}
                      ${renderStat(entity.stats.selections_count, "Wins")}
                    </div>
                  `
                : ""}
              ${entity.isEditing
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
                      ${Select.render({
                        value: shown.country ?? "",
                        isFullWidth: true,
                        options: [{ value: "", label: "Select…" }].concat(
                          countries.map((country) => ({
                            value: country,
                            label: country,
                          })),
                        ),
                        onChange: (value) =>
                          onField({ field: "country", value }),
                      })}
                    </label>
                    ${renderEditField({
                      label: "Region",
                      field: "region",
                      value: shown.region,
                      placeholder: "Region (optional)",
                      onField,
                    })}
                    ${status === "error" && error
                      ? html`<p class=${styles.error}>${error}</p>`
                      : ""}
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
                    ${Button.render({
                      children: "Edit profile",
                      color: "primary",
                      shape: "pill",
                      size: "md",
                      isFullWidth: true,
                      className: styles.editButton,
                      onClick: onEdit,
                    })}
                  `}
              ${Button.render({
                children: "Log out",
                variant: "outline",
                isFullWidth: true,
                className: styles.logoutButton,
                onClick: onLogout,
              })}
            `}
    </div>
  `
}
