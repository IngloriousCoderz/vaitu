import { html } from "@inglorious/web"
import { BottomNavigation } from "@inglorious/ui/bottom-navigation"

import { renderIcon } from "../icon/index.js"
import styles from "./style.module.css"

// Shared bottom tab bar. `active` is "events" | "applications" | "profile".
export function renderTabbar({ active, onNavigate }) {
  return html`
    <nav class=${styles.tabbar}>
      ${BottomNavigation.render({
        value: active,
        onChange: (value) => onNavigate(value),
        actions: [
          {
            value: "events",
            label: "Events",
            icon: renderIcon({ name: "compass" }),
          },
          {
            value: "applications",
            label: "Applications",
            icon: renderIcon({ name: "clipboard-list" }),
          },
          {
            value: "profile",
            label: "Profile",
            icon: renderIcon({ name: "user" }),
          },
        ],
      })}
    </nav>
  `
}
