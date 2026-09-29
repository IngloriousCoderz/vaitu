import { html } from "@inglorious/web"
import { Avatar } from "@inglorious/ui/avatar"
import { Button } from "@inglorious/ui/button"
import { Chip } from "@inglorious/ui/chip"

import { renderIcon } from "../icon/index.js"
import { initials } from "./helpers.js"
import styles from "./style.module.css"

function renderRow(label, value) {
  return html`
    <div class=${styles.row}>
      <dt>${label}</dt>
      <dd>${value || "—"}</dd>
    </div>
  `
}

export function renderProfile({ entity, onBack, onLogout }) {
  const { profile, status, error } = entity

  return html`
    <div class=${styles.page} data-category="wedding">
      <button class=${styles.back} type="button" @click=${onBack}>
        ${renderIcon({ name: "arrow-left", size: 16 })}
        <span>Back</span>
      </button>

      ${status === "loading"
        ? html`<p class=${styles.empty}>Loading profile…</p>`
        : status === "error"
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
              <dl class=${styles.rows}>
                ${renderRow("Country", profile.country)}
                ${renderRow("Region", profile.region)}
                ${renderRow("Sub-role", profile.sub_role)}
              </dl>
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
