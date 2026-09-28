import { html } from "@inglorious/web"

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
              <div class=${styles.avatar}>${initials(profile.full_name)}</div>
              <h2 class=${styles.name}>${profile.full_name}</h2>
              <p class=${styles.email}>${profile.email}</p>
              <span class=${styles.roleChip}>${profile.role}</span>
              <dl class=${styles.rows}>
                ${renderRow("Country", profile.country)}
                ${renderRow("Region", profile.region)}
                ${renderRow("Sub-role", profile.sub_role)}
              </dl>
              <button
                class=${styles.logout}
                type="button"
                @click=${onLogout}
              >
                Log out
              </button>
            `}
    </div>
  `
}
