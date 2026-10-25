import addOutline from "@iconify-icons/material-symbols/add-outline"
import assignmentOutline from "@iconify-icons/material-symbols/assignment-outline"
import eventOutline from "@iconify-icons/material-symbols/event-outline"
import notificationsOutline from "@iconify-icons/material-symbols/notifications-outline"
import personOutline from "@iconify-icons/material-symbols/person-outline"
import { BottomNavigation } from "@inglorious/ui/bottom-navigation"
import { Icon } from "@inglorious/ui/icon"
import { html } from "@inglorious/web"

import { labelled } from "../../i18n/index.js"
import styles from "./style.module.css"

const tabs = [
  labelled("nav.events", { value: "events", icon: eventOutline }),
  labelled("nav.applications", {
    value: "applications",
    icon: assignmentOutline,
  }),
  labelled("nav.new", { value: "new", icon: addOutline }),
  // The tab label is the short form: five labels share one bar's width, and
  // the full word truncates on a phone. The bell's aria-label keeps the long
  // one, where there is room for it.
  labelled("nav.notificationsShort", {
    value: "notifications",
    icon: notificationsOutline,
  }),
  labelled("nav.profile", { value: "profile", icon: personOutline }),
]

// Shared bottom tab bar. Stays mounted at App level so hide/show animates
// via CSS instead of remounting per page.
export const TabBar = {
  render({ value, isHidden = false, onNavigate }) {
    return html`
      <nav
        class=${isHidden ? `${styles.tabbar} ${styles.tabbarHidden}` : styles.tabbar}
      >
        ${BottomNavigation.render({
          value,
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
