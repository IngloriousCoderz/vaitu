import { html } from "@inglorious/web"
import { repeat } from "@inglorious/web/directives/repeat"

import {
  renderFab,
  renderTabbar,
  senderTabs,
} from "./types/tab-bar/template.js"

function renderSplash() {
  return html`
    <div
      style="display:flex;align-items:center;justify-content:center;min-height:100dvh;background:#f6f3ea;font-family:Georgia,serif;font-size:30px;letter-spacing:1.5px;color:#24402f;"
    >
      vaitu<span style="color:#e07b39;margin-left:3px;">•</span>
    </div>
  `
}

// Tab destinations switch instantly (market standard); overlay pushes slide.
const TAB_PAGES = new Set(["events", "my_events", "applications", "profile"])
let pageStack = []
let pageDirection = null

function trackPage(key) {
  const top = pageStack[pageStack.length - 1]
  if (!top) {
    pageStack = [key]
    pageDirection = null
    return pageDirection
  }
  if (key === top) return pageDirection
  if (TAB_PAGES.has(key) && TAB_PAGES.has(top)) {
    pageStack = [key]
    pageDirection = null
  } else if (TAB_PAGES.has(key)) {
    pageStack = [key]
    pageDirection = "back"
  } else if (pageStack.length > 1 && key === pageStack[pageStack.length - 2]) {
    pageStack.pop()
    pageDirection = "back"
  } else {
    pageStack.push(key)
    pageDirection = "forward"
  }
  return pageDirection
}

function pageSectionClass(direction) {
  if (direction === "forward") return "vaitu-page vaitu-page-forward"
  if (direction === "back") return "vaitu-page vaitu-page-back"
  return "vaitu-page"
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
      if (value === "events") api.notify("overlaysClose")
      if (value === "applications") {
        api.notify("overlaysClose")
        api.notify("#applications:open")
      }
      if (value === "profile") {
        api.notify("overlaysClose")
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
    const ranks = api.getEntity("ranks")
    const profile = api.getEntity("profile")
    const sender = profile.profile?.role === "sender"
    const tabs = sender ? senderTabs : undefined
    const bar = (active, hidden) =>
      renderTabbar({ active, tabs, hidden, onNavigate })

    let pageKey = null
    if (detail.event_id) {
      page = api.render("detail")
      pageKey = `detail:${detail.event_id}`
    } else if (applicationDetail.application_id) {
      page = api.render("application-detail")
      pageKey = `application-detail:${applicationDetail.application_id}`
    } else if (ranks.isOpen) {
      page = api.render("ranks")
      pageKey = "ranks"
      tabbar = bar(null, true)
    } else {
      const applications = api.getEntity("applications")
      if (applications.isOpen) {
        page = api.render("applications")
        pageKey = "applications"
        tabbar = bar("applications", false)
      } else if (profile.isOpen) {
        page = api.render("profile")
        pageKey = "profile"
        tabbar = bar("profile", false)
      } else if (!profile.profile && !profile.error) {
        return renderSplash()
      } else if (sender) {
        const create_event = api.getEntity("create_event")
        if (create_event.isOpen) {
          page = api.render("create_event")
          pageKey = "create_event"
          tabbar = bar(null, true)
        } else {
          const received = api.getEntity("received")
          if (received.event_id) {
            page = api.render("received")
            pageKey = `received:${received.event_id}`
            tabbar = bar(null, true)
            fab = showFab(true)
          } else {
            page = api.render("my_events")
            pageKey = "my_events"
            tabbar = bar("events", false)
            fab = showFab(false)
          }
        }
      } else {
        page = api.render("events")
        pageKey = "events"
        tabbar = bar("events", false)
      }
    }

    const direction = trackPage(pageKey)
    return html`
      ${repeat(
        [pageKey],
        (key) => key,
        () =>
          html`<section class=${pageSectionClass(direction)}>${page}</section>`,
      )}
      ${fab} ${tabbar}
    `
  },
}
