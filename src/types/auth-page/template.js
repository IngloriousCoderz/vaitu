import { html } from "@inglorious/web"
import { Button } from "@inglorious/ui/button"

import { renderIcon } from "../icon/index.js"
import styles from "./style.module.css"

function renderSubmit({ busy, label, onClick }) {
  return Button.render({
    children: busy ? "Please wait…" : label,
    color: "primary",
    shape: "pill",
    size: "md",
    isFullWidth: true,
    isDisabled: busy,
    onClick,
  })
}

function renderError(error) {
  return error ? html`<p class=${styles.error}>${error}</p>` : ""
}

function renderEmailStep({ entity, busy, onField, onCheckEmail }) {
  return html`
    <div class=${styles.step} key="email">
      <h2 class=${styles.title}>Welcome to vaitu</h2>
      <p class=${styles.subtitle}>Enter your email to continue.</p>
      <label class=${styles.field}>
        <span>Email</span>
        <input
          type="email"
          placeholder="you@example.com"
          .value=${entity.email}
          @input=${(e) => onField({ field: "email", value: e.target.value })}
        />
      </label>
      ${renderError(entity.error)}
      <div class=${styles.bottomBar}>
        ${Button.render({
          children: busy ? "Checking…" : "Continue",
          color: "primary",
          shape: "pill",
          size: "md",
          isFullWidth: true,
          isDisabled: busy,
          onClick: onCheckEmail,
        })}
      </div>
    </div>
  `
}

function renderLoginStep({
  entity,
  busy,
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
            type=${entity.show_password ? "text" : "password"}
            placeholder="••••••••"
            .value=${entity.password}
            @input=${(e) =>
              onField({ field: "password", value: e.target.value })}
          />
          <button
            class=${styles.eyeButton}
            type="button"
            aria-label=${entity.show_password ? "Hide password" : "Show password"}
            @mousedown=${(e) => e.preventDefault()}
            @click=${() => onTogglePassword("login_password")}
          >
            ${renderIcon({
              name: entity.show_password ? "eye-off" : "eye",
              size: 18,
            })}
          </button>
        </div>
      </label>
      ${renderError(entity.error)}
      <div class=${styles.bottomBar}>
        ${renderSubmit({ busy, label: "Log in", onClick: onLogin })}
      </div>
    </div>
  `
}

function renderSignupStep({
  entity,
  busy,
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
            type=${entity.show_password ? "text" : "password"}
            placeholder="••••••••"
            .value=${entity.password}
            @input=${(e) =>
              onField({ field: "password", value: e.target.value })}
          />
          <button
            class=${styles.eyeButton}
            type="button"
            aria-label=${entity.show_password ? "Hide password" : "Show password"}
            @mousedown=${(e) => e.preventDefault()}
            @click=${() => onTogglePassword("signup_password")}
          >
            ${renderIcon({
              name: entity.show_password ? "eye-off" : "eye",
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
            type=${entity.show_confirm_password ? "text" : "password"}
            placeholder="••••••••"
            .value=${entity.confirm_password}
            @input=${(e) =>
              onField({ field: "confirm_password", value: e.target.value })}
          />
          <button
            class=${styles.eyeButton}
            type="button"
            aria-label=${entity.show_confirm_password ? "Hide password" : "Show password"}
            @mousedown=${(e) => e.preventDefault()}
            @click=${() => onToggleConfirmPassword("signup_confirm")}
          >
            ${renderIcon({
              name: entity.show_confirm_password ? "eye-off" : "eye",
              size: 18,
            })}
          </button>
        </div>
      </label>
      ${renderError(entity.error)}
      <div class=${styles.bottomBar}>
        ${renderSubmit({ busy, label: "Continue", onClick: onContinue })}
      </div>
    </div>
  `
}

function renderRoleStep({ busy, onSelectRole, onBackToEmail }) {
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
              ?disabled=${busy}
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
  const busy = entity.status === "loading"
  return html`
    <div class=${styles.page} data-category="wedding">
      ${entity.step === "email"
        ? renderEmailStep({ entity, busy, ...callbacks })
        : ""}
      ${entity.step === "login"
        ? renderLoginStep({ entity, busy, ...callbacks })
        : ""}
      ${entity.step === "signup"
        ? renderSignupStep({ entity, busy, ...callbacks })
        : ""}
      ${entity.step === "role" ? renderRoleStep({ busy, ...callbacks }) : ""}
    </div>
  `
}
