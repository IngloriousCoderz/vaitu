import { html } from "@inglorious/web"
import { BottomNavigation } from "@inglorious/ui/bottom-navigation"

import { renderIcon } from "../icon/index.js"
import styles from "./style.module.css"

// Shared bottom tab bar. `active` matches the selected tab value.
// `tabs` overrides the default seeker tabs (sender shows its own set).
export function renderTabbar({ active, onNavigate, tabs }) {
  return html`
    <nav class=${styles.tabbar}>
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
