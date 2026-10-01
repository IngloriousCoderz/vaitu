import { Button } from "@inglorious/ui/button"
import { html } from "@inglorious/web"

import { renderIcon } from "../icon/index.js"
import styles from "./style.module.css"

function renderSubmit({ isBusy, label, onClick }) {
  return Button.render({
    children: isBusy ? "Please wait…" : label,
    color: "primary",
    shape: "pill",
    size: "md",
    isFullWidth: true,
    isDisabled: isBusy,
    onClick,
  })
}

function renderError(error) {
  return error ? html`<p class=${styles.error}>${error}</p>` : ""
}

function renderEmailStep({ entity, isBusy, onField, onCheckEmail }) {
  return html`
    <div class=${styles.step} key="email">
      <h2 class=${styles.title}>Welcome to vaitu</h2>
      <p class=${styles.subtitle}>Enter your email to continue.</p>
      <label class=${styles.field}>
        <span>Email</span>
        <input
          type="email"
          placeholder="you@example.com"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          .value=${entity.email}
          @input=${(e) => onField({ field: "email", value: e.target.value })}
        />
      </label>
      ${renderError(entity.error)}
      <div class=${styles.bottomBar}>
        ${Button.render({
          children: isBusy ? "Checking…" : "Continue",
          color: "primary",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          isDisabled: isBusy,
          onClick: onCheckEmail,
        })}
      </div>
    </div>
  `
}

function renderLoginStep({
  entity,
  isBusy,
  onField,
  onLogin,
  onBackToEmail,
  onTogglePassword,
}) {
  return html`
    <div class=${styles.step} key="login">
      <h2 class=${styles.title}>Welcome back</h2>
      <p class=${styles.subtitle}>
        Logging in as <strong>${entity.email}</strong>.
        <button
          class=${styles.linkButton}
          type="button"
          @click=${onBackToEmail}
        >
          Change
        </button>
      </p>
      <label class=${styles.field}>
        <span>Password</span>
        <div class=${styles.passwordWrap}>
          <input
            id="login_password"
            data-pw
            type=${entity.isPasswordVisible ? "text" : "password"}
            placeholder="••••••••"
            .value=${entity.password}
            @input=${(e) =>
              onField({ field: "password", value: e.target.value })}
          />
          <button
            class=${styles.eyeButton}
            type="button"
            aria-label=${entity.isPasswordVisible ? "Hide password" : "Show password"}
            @mousedown=${(e) => e.preventDefault()}
            @click=${() => onTogglePassword("login_password")}
          >
            ${renderIcon({
              name: entity.isPasswordVisible ? "eye-off" : "eye",
              size: 18,
            })}
          </button>
        </div>
      </label>
      ${renderError(entity.error)}
      <div class=${styles.bottomBar}>
        ${renderSubmit({ isBusy, label: "Log in", onClick: onLogin })}
      </div>
    </div>
  `
}

function renderSignupStep({
  entity,
  isBusy,
  onField,
  onContinue,
  onBackToEmail,
  onBackToRoles,
  onTogglePassword,
  onToggleConfirmPassword,
}) {
  return html`
    <div class=${styles.step} key="signup">
      <h2 class=${styles.title}>Create your account</h2>
      <p class=${styles.subtitle}>
        Signing up as <strong>${entity.email}</strong> as a
        <strong>${entity.role}</strong>.
        <button
          class=${styles.linkButton}
          type="button"
          @click=${onBackToEmail}
        >
          Change email
        </button>
        ·
        <button
          class=${styles.linkButton}
          type="button"
          @click=${onBackToRoles}
        >
          Change role
        </button>
      </p>
      <label class=${styles.field}>
        <span>Full name</span>
        <input
          type="text"
          placeholder="Your name"
          .value=${entity.full_name}
          @input=${(e) =>
            onField({ field: "full_name", value: e.target.value })}
        />
      </label>
      <label class=${styles.field}>
        <span>Password</span>
        <div class=${styles.passwordWrap}>
          <input
            id="signup_password"
            data-pw
            type=${entity.isPasswordVisible ? "text" : "password"}
            placeholder="••••••••"
            .value=${entity.password}
            @input=${(e) =>
              onField({ field: "password", value: e.target.value })}
          />
          <button
            class=${styles.eyeButton}
            type="button"
            aria-label=${entity.isPasswordVisible ? "Hide password" : "Show password"}
            @mousedown=${(e) => e.preventDefault()}
            @click=${() => onTogglePassword("signup_password")}
          >
            ${renderIcon({
              name: entity.isPasswordVisible ? "eye-off" : "eye",
              size: 18,
            })}
          </button>
        </div>
      </label>
      <label class=${styles.field}>
        <span>Confirm password</span>
        <div class=${styles.passwordWrap}>
          <input
            id="signup_confirm"
            data-pw
            type=${entity.isConfirmPasswordVisible ? "text" : "password"}
            placeholder="••••••••"
            .value=${entity.confirmPassword}
            @input=${(e) =>
              onField({ field: "confirmPassword", value: e.target.value })}
          />
          <button
            class=${styles.eyeButton}
            type="button"
            aria-label=${entity.isConfirmPasswordVisible ? "Hide password" : "Show password"}
            @mousedown=${(e) => e.preventDefault()}
            @click=${() => onToggleConfirmPassword("signup_confirm")}
          >
            ${renderIcon({
              name: entity.isConfirmPasswordVisible ? "eye-off" : "eye",
              size: 18,
            })}
          </button>
        </div>
      </label>
      ${renderError(entity.error)}
      <div class=${styles.bottomBar}>
        ${renderSubmit({ isBusy, label: "Continue", onClick: onContinue })}
      </div>
    </div>
  `
}

function renderRoleStep({ isBusy, onSelectRole, onBackToEmail }) {
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
}

export function renderAuth({ entity, callbacks }) {
  const isBusy = entity.status === "loading"
  return html`
    <div class=${styles.page} data-category="wedding">
      ${
        entity.step === "email"
          ? renderEmailStep({ entity, isBusy, ...callbacks })
          : ""
      }
      ${
        entity.step === "login"
          ? renderLoginStep({ entity, isBusy, ...callbacks })
          : ""
      }
      ${
        entity.step === "signup"
          ? renderSignupStep({ entity, isBusy, ...callbacks })
          : ""
      }
      ${entity.step === "role" ? renderRoleStep({ isBusy, ...callbacks }) : ""}
    </div>
  `
}
