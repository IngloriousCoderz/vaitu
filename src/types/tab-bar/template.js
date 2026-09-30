import { html } from "@inglorious/web"
import { BottomNavigation } from "@inglorious/ui/bottom-navigation"

import { renderIcon } from "../icon/index.js"
import styles from "./style.module.css"
// Shared bottom tab bar. Stays mounted at App level so hide/show animates
// via CSS instead of remounting per page.
export function renderTabbar({ active, tabs, hidden, onNavigate }) {
  return html`
    <nav class=${hidden ? `${styles.tabbar} ${styles.tabbarHidden}` : styles.tabbar}>
      ${BottomNavigation.render({
        value: active,
        onChange: (value) => onNavigate(value),
        actions: (tabs ?? seekerTabs).map((tab) => ({
          value: tab.value,
          label: tab.label,
          icon: renderIcon({ name: tab.icon }),
        })),
      })}
    </nav>
  `
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
export function renderFab({ onClick, low, hidden }) {
  return html`
    <button
      class=${hidden
        ? `${styles.fab} ${styles.fabLow} ${styles.fabHidden}`
        : low
          ? `${styles.fab} ${styles.fabLow}`
          : styles.fab}
      type="button"
      aria-label="New event"
      @click=${onClick}
    >
      ${renderIcon({ name: "plus", size: 24 })}
    </button>
  `
}
