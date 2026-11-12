import { html } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { Page } from "../../common/page/index.js"
import { CAPTCHA_ELEMENT_ID } from "../../constants/index.js"
import { ConfirmStep, LinkStep } from "./confirm-step.js"
import { EmailStep } from "./email-step.js"
import { LoginStep } from "./login-step.js"
import { ResetStep } from "./reset-step.js"
import { SignupStep } from "./signup-step.js"
import styles from "./style.module.css"

// What createAuth reports, as Vaitu words it.
const ERRORS = {
  invalidEmail: "validation.validEmail",
  invalidCode: "errors.codeExpired",
  weakPassword: "errors.weakPassword",
  invalidCredentials: "errors.invalidCredentials",
  accountExists: "errors.accountExists",
  rateLimited: "errors.rateLimited",
  captcha: "errors.captcha",
  network: "errors.offline",
}

// An unexpected failure, worded after the step it happened in.
const STEP_ERRORS = {
  email: "errors.checkEmail",
  password: "errors.login",
  signUp: "errors.signup",
  code: "errors.verify",
  reset: "errors.resetPassword",
  link: "errors.verify",
}

export const template = {
  render(props, api) {
    return this.renderAuthentication(props, api)
  },

  renderAuthentication({ entity, callbacks }, api) {
    const isBusy = entity.status === "loading"
    const props = { entity, isBusy, error: errorFor(entity), ...callbacks }
    return Page.render({
      variant: "centered",
      children: [
        html`
          ${when(entity.step === "email", () => EmailStep.render(props, api))}
          ${when(entity.step === "password", () => LoginStep.render(props))}
          ${when(entity.step === "signUp", () => SignupStep.render(props))}
          ${when(entity.step === "code", () => ConfirmStep.render(props))}
          ${when(entity.step === "reset", () => ResetStep.render(props))}
          ${when(entity.step === "link", () => LinkStep.render(props))}
          <div id=${CAPTCHA_ELEMENT_ID} class=${styles.captcha}></div>
        `,
      ],
    })
  },
}

function errorFor({ error, step }) {
  if (!error) return null
  return ERRORS[error] ?? STEP_ERRORS[step]
}
