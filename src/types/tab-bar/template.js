import { BottomNavigation } from "@inglorious/ui/bottom-navigation"
import { Fab as IwFab } from "@inglorious/ui/fab"
import { html } from "@inglorious/web"

import { Icon } from "../icon/index.js"
import styles from "./style.module.css"

// Shared bottom tab bar. Stays mounted at App level so hide/show animates
// via CSS instead of remounting per page.
export const TabBar = {
  render({ active, tabs, hidden, onNavigate }) {
    return html`
      <nav
        class=${hidden ? `${styles.tabbar} ${styles.tabbarHidden}` : styles.tabbar}
      >
        ${BottomNavigation.render({
          value: active,
          onChange: (value) => onNavigate(value),
          actions: (tabs ?? seekerTabs).map((tab) => ({
            value: tab.value,
            label: tab.label,
            icon: Icon.render({ name: tab.icon }),
          })),
        })}
      </nav>
    `
  },
}

const seekerTabs = [
  { value: "events", label: "Events", icon: "compass" },
  { value: "applications", label: "Applications", icon: "clipboard-list" },
  { value: "profile", label: "Profile", icon: "user" },
]

export const senderTabs = [
  { value: "events", label: "My Events", icon: "compass" },
  { value: "profile", label: "Profile", icon: "user" },
]

// Floating action button for event creation (sender only). Stays mounted
// while visible so position/appear animates instead of remounting.
//
// Everything except placement comes from the package: `size` sets the box,
// `color="primary"` resolves through --iw-color-primary (bridged to the app's
// dark green in src/theme/tokens.css), and `shape` is fixed to round by the
// Fab itself. .fab in style.module.css therefore only owns where it sits.
export const Fab = {
  render({ onClick, low, hidden }) {
    return IwFab.render({
      children: Icon.render({ name: "plus", size: 32 }),
      size: "lg",
      color: "primary",
      shape: "round",
      ariaLabel: "New event",
      className: [
        styles.fab,
        low ? styles.fabLow : "",
        hidden ? styles.fabHidden : "",
      ]
        .filter(Boolean)
        .join(" "),
      onClick,
    })
  },
}
