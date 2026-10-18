import { AppBar } from "@inglorious/ui/app-bar"
import { Avatar } from "@inglorious/ui/avatar"
import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { IconButton } from "@inglorious/ui/icon-button"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { html } from "@inglorious/web"

import { readUser } from "../api/session.js"
import { BackButton } from "../common/back-button/index.js"
import { Logo } from "../common/logo/index.js"
import { t } from "../i18n/index.js"
import { paths } from "../routes"
import { initials } from "../views/profile/helpers.js"
import { AppDrawer } from "./drawer/template.js"
import styles from "./style.module.css"
import { Fab, TabBar } from "./tab-bar/template.js"

// Where the package drawer turns from an overlay into a sidebar.
const SIDEBAR_QUERY = "(min-width: 64rem)"

// Which tab a given tab bar entry navigates to. The bar reports a value, the
// router owns the path.
const TAB_PATHS = {
  events: paths.events,
  applications: paths.applications,
  new: paths.newEvent,
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

// Login and onboarding have no app chrome. Everywhere else, tablet and desktop
// keep the drawer even when the phone hides the bottom bar.
const NO_WIDE_CHROME = new Set(["authentication", "onboarding"])

const DRAWER_PATHS = {
  events: paths.events,
  applications: paths.applications,
  profile: paths.profile,
}

export const App = {
  render(_, api) {
    const router = api.getEntity("router")

    // No boot gate: the guard reads the session from localStorage, so it can
    // judge this route on the first render rather than after a request.
    const chrome = CHROME[router.route] ?? DEFAULT_CHROME

    const showWide = !NO_WIDE_CHROME.has(router.route)

    const shell = api.getEntity("shell")

    return this.renderShell({
      appBar: showWide ? this.renderAppBar(api, router.route) : null,
      drawer: showWide ? this.renderDrawer(api, chrome) : null,
      isDrawerHidden: shell.isDrawerHidden,
      isDrawerCollapsed: shell.isDrawerCollapsed,
      content: html`
        <!-- Wrapped so the page is not a direct flex child of main: a .page
             using auto side margins, handed to a flex column, suppresses
             stretch and shrink-wraps to its content width. -->
        <section class=${styles.page}>${api.render(router.route)}</section>
      `,
      fab: this.renderFab(api, chrome),
      tabbar: this.renderTabbar(api, chrome),
      isTabbarHidden: chrome.isHidden ?? false,
      isWide: showWide,
    })
  },

  // One app bar for every page. The page fills it through an optional
  // renderHeader(entity, api) on its type, returning { title, subtitle, back,
  // actions, isBrand }: `back` is the fallback path for the back button, which
  // then replaces the menu button; `actions` go before the app's own.
  renderAppBar(api, route) {
    const entity = api.getEntity(route)
    const type = entity && api.getType(entity.type)
    const { title, subtitle, back, actions, isBrand } =
      type?.renderHeader?.(entity, api) ?? {}

    return AppBar.render({
      isElevated: false,
      className: styles.appBar,
      leading: back
        ? BackButton.render({ fallback: back }, api)
        : IconButton.render({
            icon: MaterialIcon.render({ name: "menu", size: "lg" }),
            variant: "ghost",
            color: "secondary",
            ariaLabel: t("nav.toggle"),
            className: styles.menuButton,
            onClick: () =>
              api.notify("#shell:toggleDrawer", {
                isWide: window.matchMedia(SIDEBAR_QUERY).matches,
              }),
          }),
      // The brand stands in for the title where no sidebar shows it already.
      title: isBrand
        ? html`<span class=${styles.brandTitle}>${Logo.render()}</span
            ><span class=${styles.brandAlt}>${title}</span>`
        : title,
      subtitle,
      trailing: html`${actions ?? ""}${this.renderGlobalActions(api, route)}`,
    })
  },

  // New event, notifications and who is signed in. The tab bar carries the
  // first and the last on a phone, so these start at tablet width. The form
  // itself does not offer to start another one.
  renderGlobalActions(api, route) {
    const profile = api.getEntity("profile").profile
    const name = profile?.full_name || readUser()?.email || t("nav.account")

    return Flex.render({
      align: "center",
      gap: "sm",
      className: styles.globalActions,
      children: [
        route === "eventCreate"
          ? ""
          : Button.render({
              children: html`
                ${MaterialIcon.render({ name: "add", size: "lg" })}
                <span>${t("nav.newEvent")}</span>
              `,
              color: "primary",
              shape: "pill",
              size: "md",
              onClick: () => api.notify("#router:navigate", paths.newEvent),
            }),
        IconButton.render({
          icon: MaterialIcon.render({ name: "notifications_none", size: "lg" }),
          variant: "ghost",
          color: "secondary",
          ariaLabel: t("nav.notifications"),
        }),
        Button.render({
          variant: "ghost",
          color: "secondary",
          shape: "round",
          ariaLabel: t("nav.profileOf", { name }),
          className: styles.avatarButton,
          onClick: () => api.notify("#router:navigate", paths.profile),
          children: Avatar.render({
            initials: initials(name),
            size: "sm",
            backgroundColor: "linear-gradient(135deg, #6b7a5e, #24402f)",
            textColor: "#fffdf7",
          }),
        }),
      ],
    })
  },

  renderDrawer(api, chrome) {
    const shell = api.getEntity("shell")

    return AppDrawer.render({
      isOpen: shell.isDrawerOpen,
      isHidden: shell.isDrawerHidden,
      isCollapsed: shell.isDrawerCollapsed,
      active: chrome.tab,
      onClose: () => api.notify("#shell:closeDrawer"),
      onCollapseToggle: () => api.notify("#shell:toggleDrawerCollapse"),
      onNavigate: (id) => {
        api.notify("#shell:closeDrawer")
        api.notify("#router:navigate", DRAWER_PATHS[id] ?? paths.events)
      },
    })
  },

  // The button only makes sense on My events, and stays mounted everywhere else
  // so that showing and hiding it animates instead of remounting.
  renderFab(api, chrome) {
    if (chrome.isFabRendered === false) return null

    return Fab.render({
      low: false,
      hidden: true,
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
  renderShell({
    content,
    fab,
    tabbar,
    appBar,
    drawer,
    isDrawerHidden = false,
    isDrawerCollapsed = false,
    isTabbarHidden = true,
    isWide = false,
  }) {
    return Flex.render({
      element: "div",
      direction: "column",
      overflow: "hidden",
      className: [
        styles.shell,
        isWide && styles.shellWide,
        isDrawerHidden && styles.shellDrawerHidden,
        isDrawerCollapsed && styles.shellDrawerCollapsed,
      ]
        .filter(Boolean)
        .join(" "),
      children: [
        ...[drawer, appBar].filter(Boolean),
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
