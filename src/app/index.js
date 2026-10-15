import { Flex } from "@inglorious/ui/flex"
import { html } from "@inglorious/web"

import { paths } from "../routes"
import styles from "./style.module.css"
import { Fab, TabBar } from "./tab-bar/template.js"

// Which tab a given tab bar entry navigates to. The bar reports a value, the
// router owns the path.
const TAB_PATHS = {
  events: paths.events,
  applications: paths.applications,
  profile: paths.profile,
}

// Chrome per route. The old cascade worked these out while choosing a page; with
// the route already resolved they are a lookup.
//
//   tab            — the active tab, null for a bar that stays mounted with
//                    nothing selected (the pushed-over pages)
//   isHidden       — bar stays mounted and translated away, so it can animate out
//   isRendered     — false for the routes that never had a bar or a button
const CHROME = {
  eventList: { tab: "events" },
  applicationList: { tab: "applications" },
  applicationDetail: { tab: "applications" },
  profile: { tab: "profile" },
  // Detail sits on top of a tab, so the bar is replaced rather than hidden.
  eventDetail: { isTabbarRendered: false },
  eventCreate: { isHidden: true },
  applicationsReceived: { isHidden: true },
  ranks: { isHidden: true },
  // Pre-login, plus the catch-all: nothing to navigate with.
  authentication: { isTabbarRendered: false, isFabRendered: false },
  onboarding: { isTabbarRendered: false, isFabRendered: false },
  notFound: { isTabbarRendered: false, isFabRendered: false },
}

const DEFAULT_CHROME = { tab: "events" }

export const App = {
  render(_, api) {
    const router = api.getEntity("router")

    // No boot gate: the guard reads the session from localStorage, so it can
    // judge this route on the first render rather than after a request.
    const chrome = CHROME[router.route] ?? DEFAULT_CHROME

    return this.renderShell({
      content: html`
        <!-- Wrapped so the page is not a direct flex child of main: a .page
             using auto side margins, handed to a flex column, suppresses
             stretch and shrink-wraps to its content width. -->
        <section class=${styles.page}>${api.render(router.route)}</section>
      `,
      fab: this.renderFab(api, chrome),
      tabbar: this.renderTabbar(api, chrome),
      isTabbarHidden: chrome.isHidden ?? false,
    })
  },

  // The button only makes sense on My events, and stays mounted everywhere else
  // so that showing and hiding it animates instead of remounting.
  renderFab(api, chrome) {
    if (chrome.isFabRendered === false) return null

    const isVisible =
      chrome.tab === "events" &&
      api.getEntity("eventList").activeOwner === "mine"

    return Fab.render({
      low: false,
      hidden: !isVisible,
      onClick: () => api.notify("#router:navigate", paths.newEvent),
    })
  },

  // Single shape so the bar node persists across navigations and hide/show
  // animates via class toggle rather than remounting.
  renderTabbar(api, chrome) {
    if (chrome.isTabbarRendered === false) return null

    return TabBar.render({
      active: chrome.tab,
      hidden: chrome.isHidden ?? false,
      onNavigate: (value) =>
        api.notify("#router:navigate", TAB_PATHS[value] ?? paths.events),
    })
  },

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
  renderShell({ content, fab, tabbar, isTabbarHidden = true }) {
    return Flex.render({
      element: "div",
      direction: "column",
      overflow: "hidden",
      className: styles.shell,
      children: [
        Flex.render({
          element: "main",
          direction: "column",
          overflow: "auto",
          className: styles.main,
          children: [content].filter(Boolean),
        }),
        // FAB floats over the shell, so it is a direct child of the positioned
        // shell. The tab bar must NOT be here as well — it belongs in the
        // footer row only, and listing it in both places renders it twice.
        ...[fab].filter(Boolean),
        Flex.render({
          element: "footer",
          overflow: "hidden",
          className: isTabbarHidden
            ? `${styles.footer} ${styles["footer-hidden"]}`
            : styles.footer,
          children: [tabbar].filter(Boolean),
        }),
      ],
    })
  },
}
