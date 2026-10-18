import addOutline from "@iconify-icons/material-symbols/add-outline"
import assignmentOutline from "@iconify-icons/material-symbols/assignment-outline"
import eventOutline from "@iconify-icons/material-symbols/event-outline"
import personOutline from "@iconify-icons/material-symbols/person-outline"
import { BottomNavigation } from "@inglorious/ui/bottom-navigation"
import { Fab as IwFab } from "@inglorious/ui/fab"
import { Icon } from "@inglorious/ui/icon"
import { html } from "@inglorious/web"

import { labelled, t } from "../../i18n/index.js"
import styles from "./style.module.css"

const tabs = [
  labelled("nav.events", { value: "events", icon: eventOutline }),
  labelled("nav.applications", {
    value: "applications",
    icon: assignmentOutline,
  }),
  labelled("nav.new", { value: "new", icon: addOutline }),
  labelled("nav.profile", { value: "profile", icon: personOutline }),
]

// Shared bottom tab bar. Stays mounted at App level so hide/show animates
// via CSS instead of remounting per page.
export const TabBar = {
  render({ active, hidden, onNavigate }) {
    return html`
      <nav
        class=${hidden ? `${styles.tabbar} ${styles.tabbarHidden}` : styles.tabbar}
      >
        ${BottomNavigation.render({
          value: active,
          onChange: (value) => onNavigate(value),
          actions: tabs.map((tab) => ({
            value: tab.value,
            label: tab.label,
            icon: Icon.render({ icon: tab.icon, size: "lg" }),
          })),
        })}
      </nav>
    `
  },
}

// Floating action button for event creation, shown on My events. Stays mounted
// while visible so position/appear animates instead of remounting.
//
// Everything except placement comes from the package: `size` sets the box,
// `color="primary"` resolves through --iw-color-primary (bridged to the app's
// dark green in src/theme/tokens.css), and `shape` is fixed to round by the
// Fab itself. .fab in style.module.css therefore only owns where it sits.
export const Fab = {
  render({ onClick, low, hidden }) {
    return IwFab.render({
      children: Icon.render({ icon: addOutline, size: "lg" }),
      size: "lg",
      color: "primary",
      shape: "round",
      ariaLabel: t("nav.newEvent"),
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
