import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { renderPage } from "../../page.js"
import { EmailStep } from "./email-step.js"
import { LoginStep } from "./login-step.js"
import { RoleStep } from "./role-step.js"
import { SignupStep } from "./signup-step.js"

export const Authentication = {
  render(props, api) {
    return this.renderAuthentication(props, api)
  },

  renderAuthentication({ entity, callbacks }) {
    const isBusy = entity.status === "loading"
    return renderPage({
      variant: "centered",
      children: [
        html`
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
        `,
      ],
    })
  },
}
