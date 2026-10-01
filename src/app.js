import { html } from "@inglorious/web"

import { renderFab, renderTabbar, senderTabs } from "./types/tab-bar/template.js"

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
    const auth = api.getEntity("auth")
    if (auth.justSignedUp) return api.render("onboarding")

    const onNavigate = (value) => {
      if (value === "events") api.notify("closeOverlays")
      if (value === "applications") {
        api.notify("closeOverlays")
        api.notify("#applications:open")
      }
      if (value === "profile") {
        api.notify("closeOverlays")
        api.notify("#profile:open")
      }
    }

    // Single template shape so the tab bar node persists across navigations
    // and hide/show animates via class toggle instead of remounting.
    let page = null
    let tabbar = null
    const showFab = (low) =>
      renderFab({
        low,
        hidden: false,
        onClick: () => api.notify("#create_event:open"),
      })
    const hideFab = () =>
      renderFab({
        low: true,
        hidden: true,
        onClick: () => {},
      })
    let fab = hideFab()

    const detail = api.getEntity("detail")
    const applicationDetail = api.getEntity("application-detail")
    if (detail.event_id) {
      page = api.render("detail")
    } else if (applicationDetail.application_id) {
      page = api.render("application-detail")
    } else {
      const profile = api.getEntity("profile")
      const sender = profile.profile?.role === "sender"
      const tabs = sender ? senderTabs : undefined
      const bar = (active, hidden) =>
        renderTabbar({ active, tabs, hidden, onNavigate })

      const applications = api.getEntity("applications")
      if (applications.isOpen) {
        page = api.render("applications")
        tabbar = bar("applications", false)
      } else if (profile.isOpen) {
        page = api.render("profile")
        tabbar = bar("profile", false)
      } else if (!profile.profile && !profile.error) {
        return renderSplash()
      } else if (sender) {
        const create_event = api.getEntity("create_event")
        if (create_event.isOpen) {
          page = api.render("create_event")
          tabbar = bar(null, true)
        } else {
          const received = api.getEntity("received")
          if (received.event_id) {
            page = api.render("received")
            tabbar = bar(null, true)
            fab = showFab(true)
          } else {
            page = api.render("my_events")
            tabbar = bar("events", false)
            fab = showFab(false)
          }
        }
      } else {
        page = api.render("events")
        tabbar = bar("events", false)
      }
    }

    return html`
      ${page}
      ${fab}
      ${tabbar}
    `
  },
}
