import { html } from "@inglorious/web"

import styles from "./style.module.css"

export const RoleStep = {
  render({ isBusy, onSelectRole, onBackToEmail }) {
    return html`
      <div class=${styles.step} key="role">
        <h2 class=${styles.title}>You are a...</h2>
        <p class=${styles.subtitle}>Pick the side that fits you.</p>
        <div class=${styles.roleList}>
          ${[
            { id: "seeker", label: "Seeker", hint: "I want to find work" },
            { id: "sender", label: "Sender", hint: "I want to post events" },
          ].map(
            (option) => html`
              <button
                type="button"
                class=${styles.roleBig}
                @click=${() => onSelectRole(option.id)}
                ?disabled=${isBusy}
              >
                <span class=${styles.roleLabel}>${option.label}</span>
                <span class=${styles.roleHint}>${option.hint}</span>
              </button>
            `,
          )}
        </div>
        <div class=${styles.bottomBar}>
          <button
            class=${styles.linkButton}
            type="button"
            @click=${onBackToEmail}
          >
            ← Back to email
          </button>
        </div>
      </div>
    `
  },
}
