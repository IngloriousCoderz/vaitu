import addOutline from "@iconify-icons/material-symbols/add-outline"
import menuOutline from "@iconify-icons/material-symbols/menu-outline"
import notificationsOutline from "@iconify-icons/material-symbols/notifications-outline"
import { AppBar } from "@inglorious/ui/app-bar"
import { Button } from "@inglorious/ui/button"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { IconButton } from "@inglorious/ui/icon-button"
import { html, nothing } from "@inglorious/web"
import { when } from "@inglorious/web/directives/when"

import { BackButton } from "../common/back-button/index.js"
import { Logo } from "../common/logo/index.js"
import { NotificationsPanel, pathFor } from "../common/notifications/index.js"
import notificationStyles from "../common/notifications/style.module.css"
import { OfflineBar } from "../common/offline-bar/index.js"
import { ProfileAvatar } from "../common/profile-avatar/index.js"
import { PromptBar } from "../common/prompt-bar/index.js"
import { ReactivatedBar } from "../common/reactivated-bar/index.js"
import { UpdateBar } from "../common/update-bar/index.js"
import { NO_UNREAD, NOTIFICATION_BADGE_MAX } from "../constants/index.js"
import { t } from "../i18n/index.js"
import { paths } from "../routes"
import { AppDrawer } from "./drawer/index.js"
import { Fab } from "./fab/index.js"
import styles from "./style.module.css"
import { TabBar } from "./tab-bar/index.js"

const SIDEBAR_QUERY = "(min-width: 64rem)"

const TAB_PATHS = {
  jobs: paths.jobs,
  applications: paths.applications,
  myJobs: paths.myJobs,
  notifications: paths.notifications,
  profile: paths.profile,
}

const CHROME = {
  jobList: { tab: "jobs", hasFab: true },
  myJobs: { tab: "myJobs", hasFab: true },
  applicationList: { tab: "applications" },
  applicationDetail: { tab: "applications" },
  notifications: { tab: "notifications" },
  profile: { tab: "profile" },
  jobDetail: { isTabbarRendered: false },
  jobCreate: { isHidden: true },
  applicationsReceived: { isHidden: true },
  ranks: { isHidden: true },
  preferences: { tab: "preferences", isHidden: true },
  about: { tab: "about", isHidden: true },
  eraseAccount: { isTabbarRendered: false },
  unsubscribe: { isTabbarRendered: false },
  authentication: { isTabbarRendered: false },
  onboarding: { isTabbarRendered: false },
  notFound: { isTabbarRendered: false },
}

const DEFAULT_CHROME = { tab: "jobs" }

const NO_WIDE_CHROME = new Set([
  "authentication",
  "onboarding",
  "eraseAccount",
  "unsubscribe",
])

const DRAWER_PATHS = {
  jobs: paths.jobs,
  myJobs: paths.myJobs,
  applications: paths.applications,
  profile: paths.profile,
  preferences: paths.preferences,
  about: paths.about,
}

/** The top-level pages: back from one closes the app on Android. */
export const ROOT_PATHS = [
  ...new Set([
    "/",
    ...Object.values(TAB_PATHS),
    ...Object.values(DRAWER_PATHS),
  ]),
]

export const App = {
  render(_, api) {
    const router = api.getEntity("router")

    const chrome = CHROME[router.route] ?? DEFAULT_CHROME

    const shell = api.getEntity("shell")
    const update = readyUpdate(api)
    const pushPrompt = api.getEntity("pushPrompt")
    const analytics = api.getEntity("analytics")

    if (api.getEntity("nativeUpdate").isUpdateRequired) {
      return this.renderShell({
        content: html`<section class=${styles.page}>
          ${api.render("nativeUpdate")}
        </section>`,
      })
    }

    const showWide = !NO_WIDE_CHROME.has(router.route)

    const updatebar =
      this.renderOfflineBar(api) ||
      this.renderUpdateBar(api, update) ||
      this.renderReactivatedBar(api, shell)
    const pushPromptBar =
      this.renderAnalyticsPrompt(api, analytics, update) ||
      this.renderPushPrompt(api, pushPrompt, update)

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
        ${api.render("safety")} ${api.render("toasts")}
      `,
      tabbar: this.renderTabbar(api, chrome),
      fab: when(chrome.hasFab, () =>
        Fab.render({
          pillCount: [updatebar, pushPromptBar].filter(Boolean).length,
          onClick: () => api.notify("#router:navigate", paths.newJob),
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

  renderOfflineBar(api) {
    if (api.getEntity("network")?.isOnline !== false) return ""
    return OfflineBar.render()
  },

  renderUpdateBar(api, update) {
    if (!update) return ""
    return UpdateBar.render({ onRefresh: () => api.notify(update.apply) })
  },

  renderReactivatedBar(api, shell) {
    if (!shell.isReactivated) return ""
    return ReactivatedBar.render({
      onDismiss: () => api.notify("#shell:reactivatedDismiss"),
    })
  },

  renderAnalyticsPrompt(api, analytics, update) {
    if (!analytics?.isAsking) return ""
    return PromptBar.render({
      message: t("analytics.prompt"),
      askLabel: t("analytics.accept"),
      declineLabel: t("analytics.decline"),
      isStacked: Boolean(update),
      onAsk: () => api.notify("#analytics:analyticsConsent", true),
      onDecline: () => api.notify("#analytics:analyticsConsent", false),
    })
  },

  renderPushPrompt(api, pushPrompt, update) {
    if (!pushPrompt?.isOpen) return ""
    return PromptBar.render({
      message: t("push.prompt"),
      askLabel: t("push.ask"),
      declineLabel: t("push.decline"),
      isStacked: Boolean(update),
      onAsk: () => api.notify("#pushPrompt:pushAsk"),
      onDecline: () => api.notify("#pushPrompt:pushDecline"),
    })
  },

  renderNotificationsPanel(api) {
    const notifications = api.getEntity("notifications")
    if (!notifications) return nothing
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
    const name =
      profile?.full_name ||
      api.getEntity("session").user?.email ||
      t("nav.account")

    return Flex.render({
      align: "center",
      gap: "sm",
      className: styles.globalActions,
      children: [
        when(route !== "jobCreate", () =>
          Button.render({
            children: html`
              ${Icon.render({ icon: addOutline, size: "lg" })}
              <span>${t("nav.newJob")}</span>
            `,
            color: "primary",
            shape: "pill",
            size: "md",
            onClick: () => api.notify("#router:navigate", paths.newJob),
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
          children: ProfileAvatar.render({
            name,
            src: profile?.avatar_url,
            size: "sm",
            alt: "",
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
        api.notify("#router:navigate", {
          to: DRAWER_PATHS[id] ?? paths.jobs,
          replace: true,
        })
      },
    })
  },

  renderTabbar(api, chrome) {
    if (chrome.isTabbarRendered === false) return null

    return TabBar.render({
      value: chrome.tab,
      isHidden: chrome.isHidden,
      onNavigate: (value) =>
        api.notify("#router:navigate", {
          to: TAB_PATHS[value] ?? paths.jobs,
          replace: true,
        }),
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

// The web's service worker or the native live update, whichever has a version waiting.
function readyUpdate(api) {
  if (api.getEntity("liveUpdate")?.isUpdateReady) {
    return { apply: "#liveUpdate:liveUpdateApply" }
  }
  if (api.getEntity("pwaUpdate")?.isUpdateReady) {
    return { apply: "#pwaUpdate:pwaUpdateApply" }
  }
  return null
}
