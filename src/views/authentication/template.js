import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { Page } from "../../common/page/index.js"
import { ConfirmStep } from "./confirm-step.js"
import { EmailStep } from "./email-step.js"
import { LoginStep } from "./login-step.js"
import { SignupStep } from "./signup-step.js"

export const Authentication = {
  render(props, api) {
    return this.renderAuthentication(props, api)
  },

  renderAuthentication({ entity, callbacks }, api) {
    const isBusy = entity.status === "loading"
    return Page.render({
      variant: "centered",
      children: [
        html`
          ${when(entity.step === "email", () =>
            EmailStep.render({ entity, isBusy, ...callbacks }, api),
          )}
          ${when(entity.step === "login", () =>
            LoginStep.render({ entity, isBusy, ...callbacks }),
          )}
          ${when(entity.step === "signup", () =>
            SignupStep.render({ entity, isBusy, ...callbacks }),
          )}
          ${when(entity.step === "confirm", () =>
            ConfirmStep.render({ entity, isBusy, ...callbacks }),
          )}
        `,
      ],
    })
  },
}
