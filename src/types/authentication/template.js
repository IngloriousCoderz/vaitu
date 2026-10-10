import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { EmailStep } from "./email-step.js"
import { LoginStep } from "./login-step.js"
import { RoleStep } from "./role-step.js"
import { SignupStep } from "./signup-step.js"
import styles from "./style.module.css"

export const Authentication = {
  render(props, api) {
    return this.renderAuthentication(props, api)
  },

  renderAuthentication({ entity, callbacks }) {
    const isBusy = entity.status === "loading"
    return html`
      <div class=${styles.page} data-category="wedding">
        ${when(entity.step === "email", () =>
          EmailStep.render({ entity, isBusy, ...callbacks }),
        )}
        ${when(entity.step === "login", () =>
          LoginStep.render({ entity, isBusy, ...callbacks }),
        )}
        ${when(entity.step === "signup", () =>
          SignupStep.render({ entity, isBusy, ...callbacks }),
        )}
        ${when(entity.step === "role", () =>
          RoleStep.render({ isBusy, ...callbacks }),
        )}
      </div>
    `
  },
}
