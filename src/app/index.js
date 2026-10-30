import addOutline from "@iconify-icons/material-symbols/add-outline"
import menuOutline from "@iconify-icons/material-symbols/menu-outline"
import notificationsOutline from "@iconify-icons/material-symbols/notifications-outline"
import { AppBar } from "@inglorious/ui/app-bar"
import { Avatar } from "@inglorious/ui/avatar"
import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { html, nothing } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { readUser } from "../api/session.js"
import { BackButton } from "../common/back-button/index.js"
import { Logo } from "../common/logo/index.js"
import { pathFor } from "../common/notifications/index.js"
import notificationStyles from "../common/notifications/style.module.css"
import { NotificationsPanel } from "../common/notifications/template.js"
import { PromptBar } from "../common/prompt-bar/index.js"
import { ReactivatedBar } from "../common/reactivated-bar/template.js"
import { UpdateBar } from "../common/update-bar/template.js"
import { NO_UNREAD, NOTIFICATION_BADGE_MAX } from "../constants/index.js"
import { t } from "../i18n/index.js"
import { paths } from "../routes"
import { initials } from "../views/profile/helpers.js"
import { AppDrawer } from "./drawer/template.js"
import { Fab } from "./fab/template.js"
import styles from "./style.module.css"
import { TabBar } from "./tab-bar/template.js"

const SIDEBAR_QUERY = "(min-width: 64rem)"

const TAB_PATHS = {
  events: paths.events,
  applications: paths.applications,
  myEvents: paths.myEvents,
  notifications: paths.notifications,
  profile: paths.profile,
}

const CHROME = {
  eventList: { tab: "events", hasFab: true },
  myEvents: { tab: "myEvents", hasFab: true },
  applicationList: { tab: "applications" },
  applicationDetail: { tab: "applications" },
  notifications: { tab: "notifications" },
  profile: { tab: "profile" },
  eventDetail: { isTabbarRendered: false },
  eventCreate: { isHidden: true },
  applicationsReceived: { isHidden: true },
  ranks: { isHidden: true },
  preferences: { tab: "preferences", isHidden: true },
  authentication: { isTabbarRendered: false },
  onboarding: { isTabbarRendered: false },
  notFound: { isTabbarRendered: false },
}

const DEFAULT_CHROME = { tab: "events" }

const NO_WIDE_CHROME = new Set(["authentication", "onboarding"])

const DRAWER_PATHS = {
  events: paths.events,
  myEvents: paths.myEvents,
  applications: paths.applications,
  profile: paths.profile,
  preferences: paths.preferences,
}

export const App = {
  render(_, api) {
    const router = api.getEntity("router")

    const chrome = CHROME[router.route] ?? DEFAULT_CHROME

    const shell = api.getEntity("shell")
    const pwaUpdate = api.getEntity("pwaUpdate")
    const pushPrompt = api.getEntity("pushPrompt")
    const analytics = api.getEntity("analytics")

    if (api.getEntity("appVersion").isUpdateRequired) {
      return this.renderShell({
        content: html`<section class=${styles.page}>
          ${api.render("appVersion")}
        </section>`,
      })
    }

    const showWide = !NO_WIDE_CHROME.has(router.route)

    const updatebar =
      this.renderUpdateBar(api, pwaUpdate) ||
      this.renderReactivatedBar(api, shell)
    const pushPromptBar =
      this.renderAnalyticsPrompt(api, analytics, pwaUpdate) ||
      this.renderPushPrompt(api, pushPrompt, pwaUpdate)

    return this.renderShell({
      appBar: when(showWide, () => this.renderAppBar(api, router.route)),
      drawer: when(showWide, () => this.renderDrawer(api, chrome)),
      isDrawerHidden: shell.isDrawerHidden,
      isDrawerCollapsed: shell.isDrawerCollapsed,
      content: html`
        <!-- Wrapped so the page is not a direct flex child of main: a .page
             using auto side margins, handed to a flex column, suppresses
             stretch and shrink-wraps to its content width. -->
        <section class=${styles.page}>${api.render(router.route)}</section>
      `,
      tabbar: this.renderTabbar(api, chrome),
      fab: when(chrome.hasFab, () =>
        Fab.render({
          pillCount: [updatebar, pushPromptBar].filter(Boolean).length,
          onClick: () => api.notify("#router:navigate", paths.newEvent),
        }),
      ),
      updatebar,
      pushPrompt: pushPromptBar,
      notificationsPanel: this.renderNotificationsPanel(api),
      isTabbarHidden:
        chrome.isTabbarRendered === false || (chrome.isHidden ?? false),
      isWide: showWide,
    })
  },

  renderUpdateBar(api, pwaUpdate) {
    if (!pwaUpdate.isUpdateReady) return ""
    return UpdateBar.render({
      onRefresh: () => api.notify("#pwaUpdate:pwaUpdateApply"),
    })
  },

  renderReactivatedBar(api, shell) {
    if (!shell.isReactivated) return ""
    return ReactivatedBar.render({
      onDismiss: () => api.notify("#shell:reactivatedDismiss"),
    })
  },

  renderAnalyticsPrompt(api, analytics, pwaUpdate) {
    if (!analytics?.isAsking) return ""
    return PromptBar.render({
      message: t("analytics.prompt"),
      askLabel: t("analytics.accept"),
      declineLabel: t("analytics.decline"),
      isStacked: Boolean(pwaUpdate?.isUpdateReady),
      onAsk: () => api.notify("#analytics:analyticsConsent", true),
      onDecline: () => api.notify("#analytics:analyticsConsent", false),
    })
  },

  renderPushPrompt(api, pushPrompt, pwaUpdate) {
    if (!pushPrompt?.isOpen) return ""
    return PromptBar.render({
      message: t("push.prompt"),
      askLabel: t("push.ask"),
      declineLabel: t("push.decline"),
      isStacked: Boolean(pwaUpdate?.isUpdateReady),
      onAsk: () => api.notify("#pushPrompt:pushAsk"),
      onDecline: () => api.notify("#pushPrompt:pushDecline"),
    })
  },

  renderNotificationsPanel(api) {
    const notifications = api.getEntity("notifications")
    if (!notifications) return ""
    return NotificationsPanel.render({
      isOpen: notifications.isPanelOpen ?? false,
      entity: notifications,
      onClose: () => api.notify("#notifications:panelClose"),
      onOpenRow: (item) => {
        const rowId = item.id
        const path = pathFor(item)
        api.notify("#notifications:readSet", rowId)
        api.notify("#notifications:panelClose")
        api.notify("#router:navigate", path)
      },
      onMarkAll: () => api.notify("#notifications:readAll"),
    })
  },

  renderAppBar(api, route) {
    const entity = api.getEntity(route)
    const type = entity && api.getType(entity.type)
    const { title, subtitle, back, actions, isBrand } =
      type?.renderHeader?.(entity, api) ?? {}

    return AppBar.render({
      isElevated: false,
      className: styles.appBar,
      leading: when(
        back,
        () => BackButton.render({ fallback: back }, api),
        () =>
          IconButton.render({
            icon: Icon.render({ icon: menuOutline, size: "lg" }),
            variant: "ghost",
            color: "secondary",
            shape: "round",
            ariaLabel: t("nav.toggle"),
            className: styles.menuButton,
            onClick: () =>
              api.notify("#shell:drawerToggle", {
                isWide: window.matchMedia(SIDEBAR_QUERY).matches,
              }),
          }),
      ),
      title: when(
        isBrand,
        () =>
          html`<span class=${styles.brandTitle}>${Logo.render()}</span
            ><span class=${styles.brandAlt}>${title}</span>`,
        () => title,
      ),
      subtitle,
      trailing: html`${actions ?? nothing}${this.renderGlobalActions(api, route)}`,
    })
  },

  renderGlobalActions(api, route) {
    const notifications = api.getEntity("notifications")
    const profile = api.getEntity("profile").profile
    const name = profile?.full_name || readUser()?.email || t("nav.account")

    return Flex.render({
      align: "center",
      gap: "sm",
      className: styles.globalActions,
      children: [
        when(route !== "eventCreate", () =>
          Button.render({
            children: html`
              ${Icon.render({ icon: addOutline, size: "lg" })}
              <span>${t("nav.newEvent")}</span>
            `,
            color: "primary",
            shape: "pill",
            size: "md",
            onClick: () => api.notify("#router:navigate", paths.newEvent),
          }),
        ),
        Flex.render({
          direction: "row",
          className: notificationStyles.bell,
          children: [
            IconButton.render({
              icon: Icon.render({ icon: notificationsOutline, size: "lg" }),
              variant: "ghost",
              color: "secondary",
              shape: "round",
              ariaLabel: t("nav.notifications"),
              onClick: () => api.notify("#notifications:panelOpen"),
            }),
            when(
              notifications.unread > NO_UNREAD,
              () =>
                html`<span
                  class=${notificationStyles.badge}
                  aria-label=${t("notifications.unreadAria", {
                    count: notifications.unread,
                  })}
                  >${
                    notifications.unread > NOTIFICATION_BADGE_MAX
                      ? "9+"
                      : notifications.unread
                  }</span
                >`,
            ),
          ],
        }),
        Button.render({
          variant: "ghost",
          color: "secondary",
          shape: "round",
          ariaLabel: t("nav.profileOf", { name }),
          className: styles.avatarButton,
          onClick: () => api.notify("#router:navigate", paths.profile),
          children: Avatar.render({
            src: profile?.avatar_url || "",
            alt: name,
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
      onClose: () => api.notify("#shell:drawerClose"),
      onCollapseToggle: () => api.notify("#shell:drawerCollapseToggle"),
      onNavigate: (id) => {
        api.notify("#shell:drawerClose")
        api.notify("#router:navigate", DRAWER_PATHS[id] ?? paths.events)
      },
    })
  },

  renderTabbar(api, chrome) {
    if (chrome.isTabbarRendered === false) return null

    return TabBar.render({
      value: chrome.tab,
      isHidden: chrome.isHidden,
      onNavigate: (value) =>
        api.notify("#router:navigate", TAB_PATHS[value] ?? paths.events),
    })
  },

  renderShell({
    content,
    tabbar,
    fab,
    updatebar,
    pushPrompt,
    notificationsPanel,
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
        !isTabbarHidden && styles.shellTabbar,
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
        ...[fab, updatebar, pushPrompt, notificationsPanel].filter(Boolean),
        Flex.render({
          element: "footer",
          direction: undefined,
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
