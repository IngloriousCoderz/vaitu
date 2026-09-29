import { html } from "@inglorious/web"

function renderSplash() {
  return html`
    <div
      style="display:flex;align-items:center;justify-content:center;min-height:100dvh;background:#f6f3ea;font-family:Georgia,serif;font-size:30px;letter-spacing:1.5px;color:#24402f;"
    >
      vaitu<span style="color:#e07b39;margin-left:3px;">•</span>
    </div>
  `
}

export const App = {
  render(_, api) {
    const session = api.getEntity("session")
    if (session.status === "unknown") return renderSplash()
    // Gated: logged out always lands on login.
    if (!session.user_id) return api.render("auth")
    const detail = api.getEntity("detail")
    if (detail.event_id) return api.render("detail")
    const application_detail = api.getEntity("application-detail")
    if (application_detail.application_id)
      return api.render("application-detail")
    const applications = api.getEntity("applications")
    if (applications.open) return api.render("applications")
    const profile = api.getEntity("profile")
    if (profile.open) return api.render("profile")
    return api.render("events")
  },
}
