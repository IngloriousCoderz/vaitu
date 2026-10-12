import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"
import { repeat } from "@inglorious/web/directives/repeat"

import { Fab, senderTabs, TabBar } from "./types/tab-bar/template.js"

// Pre-login routes (splash, auth, onboarding) have no page-transition
// direction, but they still need the block <section> wrapper. main is a flex
// column, and a .page handed to it directly becomes a flex item — where
// `margin: 0 auto` suppresses stretch and it shrink-wraps (measured 239px
// instead of the full 26.875rem column). The logged-in routes avoid this
// because their content is already wrapped.
function renderBareShell(content) {
  return renderShell({
    content: html`<section class="vaitu-page">${content}</section>`,
  })
}

function renderSplash() {
  return html`
    <div class="vaitu-splash">
      <img src="/logo.svg" alt="vaitu" class="vaitu-splashLogo" />
    </div>
  `
}

// App shell: header / scrolling content / footer, per the ScrollableContent
// story in @inglorious/ui's flex primitives.
//
// The tab bar used to be `position: fixed`, which made the bar a floating
// overlay rather than layout. Everything downstream paid for that: pages had
// to reserve bottom padding equal to the bar (and a different amount per page,
// because the FAB moved), and the reserved strip had to be painted separately
// or content showed through it. Giving the bar its own footer row removes the
// whole class of problem — no page reserves space for it any more.
//
// `.iw-flex-overflow-auto` also sets min-height:0, without which the content
// row expands the shell instead of scrolling inside it.
function renderShell({ content, fab, tabbar, isTabbarHidden = true }) {
  return Flex.render({
    element: "div",
    direction: "column",
    overflow: "hidden",
    style: {
      height: "100dvh",
      background: "var(--vbg)",
      // Containing block for the absolutely positioned FAB, so "bottom" is
      // measured inside the shell rather than against the viewport.
      position: "relative",
      // The shell spans the full viewport (viewport-fit=cover), so it has to
      // absorb the notch itself. That also lets a page's sticky <header> pin
      // at the top of the content row — which now starts below the safe area —
      // instead of pinning under the notch with a gap above it.
      paddingTop: "env(safe-area-inset-top)",
    },
    children: [
      Flex.render({
        element: "main",
        direction: "column",
        overflow: "auto",
        className: "appMain",
        style: { flex: "1 1 0" },
        children: [content],
      }),
      // FAB floats over the shell, so it is a direct child of the positioned
      // shell. The tab bar must NOT be here as well — it belongs in the
      // footer row only, and listing it in both places renders it twice.
      ...[fab].filter(Boolean),
      Flex.render({
        element: "footer",
        style: { flex: "0 0 auto", overflow: "hidden" },
        className: isTabbarHidden ? "appFooter appFooterHidden" : "appFooter",
        children: [tabbar].filter(Boolean),
      }),
    ],
  })
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
    // Splash, login and onboarding must go through the shell too. Returning
    // them bare rendered them straight into #root, which has no definite
    // height — so their `min-height: 100%` resolved against nothing and the
    // centred login form collapsed to its content height (~253px) instead of
    // filling the screen. No tab bar or FAB on these routes.
    if (session.status === "unknown") {
      return renderBareShell(renderSplash())
    }
    // Gated: logged out always lands on login.
    if (!session.user_id) {
      return renderBareShell(api.render("authentication"))
    }
    const auth = api.getEntity("authentication")
    if (auth.justSignedUp) {
      return renderBareShell(api.render("onboarding"))
    }

    const onNavigate = (value) => {
      if (value === "events") api.notify("overlaysClose")
      if (value === "applications") {
        api.notify("overlaysClose")
        api.notify("#applicationList:open")
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
      Fab.render({
        low,
        hidden: false,
        onClick: () => api.notify("#eventCreate:open"),
      })
    const hideFab = () =>
      Fab.render({
        low: true,
        hidden: true,
        onClick: () => {},
      })
    let fab = hideFab()
    // Pages that keep the bar mounted but slide it away still occupy a footer
    // row, so the shell needs to know to collapse it.
    let tabbarHidden = true

    const eventDetail = api.getEntity("eventDetail")
    const applicationDetail = api.getEntity("applicationDetail")
    const ranks = api.getEntity("ranks")
    const profile = api.getEntity("profile")
    const sender = profile.profile?.role === "sender"
    const tabs = sender ? senderTabs : undefined
    const bar = (active, hidden) => {
      tabbarHidden = hidden
      return TabBar.render({ active, tabs, hidden, onNavigate })
    }

    let pageKey = null
    if (eventDetail.event_id) {
      page = api.render("eventDetail")
      pageKey = `event-detail:${eventDetail.event_id}`
      fab = hideFab()
    } else if (applicationDetail.application_id) {
      page = api.render("applicationDetail")
      pageKey = `application-detail:${applicationDetail.application_id}`
      tabbar = bar("applications", false)
    } else if (ranks.isOpen) {
      page = api.render("ranks")
      pageKey = "ranks"
      tabbar = bar(null, true)
    } else {
      const applications = api.getEntity("applicationList")
      if (applications.isOpen) {
        page = api.render("applicationList")
        pageKey = "applications"
        tabbar = bar("applications", false)
      } else if (profile.isOpen) {
        page = api.render("profile")
        pageKey = "profile"
        tabbar = bar("profile", false)
      } else if (!profile.profile && !profile.error) {
        return renderSplash()
      } else if (sender) {
        const eventCreate = api.getEntity("eventCreate")
        if (eventCreate.isOpen) {
          page = api.render("eventCreate")
          pageKey = "event-create"
          tabbar = bar(null, true)
        } else {
          const applicationsReceived = api.getEntity("applicationsReceived")
          if (applicationsReceived.event_id) {
            page = api.render("applicationsReceived")
            pageKey = `applications-received:${applicationsReceived.event_id}`
            tabbar = bar(null, true)
            fab = hideFab()
          } else {
            page = api.render("myEvents")
            pageKey = "my_events"
            tabbar = bar("events", false)
            fab = showFab(false)
          }
        }
      } else {
        page = api.render("eventList")
        pageKey = "events"
        tabbar = bar("events", false)
      }
    }

    const direction = trackPage(pageKey)
    return renderShell({
      content: html`
        ${repeat(
          [pageKey],
          (key) => key,
          () =>
            html`<section class=${pageSectionClass(direction)}>
              ${page}
            </section>`,
        )}
      `,
      fab,
      tabbar,
      isTabbarHidden: tabbarHidden,
    })
  },
}
