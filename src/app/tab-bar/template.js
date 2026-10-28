import assignmentOutline from "@iconify-icons/material-symbols/assignment-outline"
import editCalendarOutline from "@iconify-icons/material-symbols/edit-calendar-outline"
import eventOutline from "@iconify-icons/material-symbols/event-outline"
import notificationsOutline from "@iconify-icons/material-symbols/notifications-outline"
import personOutline from "@iconify-icons/material-symbols/person-outline"
import { BottomNavigation } from "@inglorious/ui/bottom-navigation"
import { Icon } from "@inglorious/ui/icon"
import { html } from "@inglorious/web"

import { labelled } from "../../i18n/index.js"
import styles from "./style.module.css"

// Tab labels are short forms of their own: five share one bar's width, and
// about nine characters fit a tab on a 360px phone before the label truncates.
// The drawer and the page titles keep the long ones, where there is room.
const tabs = [
  labelled("nav.tabs.events", { value: "events", icon: eventOutline }),
  labelled("nav.tabs.applications", {
    value: "applications",
    icon: assignmentOutline,
  }),
  labelled("nav.tabs.myEvents", {
    value: "myEvents",
    icon: editCalendarOutline,
  }),
  labelled("nav.tabs.notifications", {
    value: "notifications",
    icon: notificationsOutline,
  }),
  labelled("nav.tabs.profile", { value: "profile", icon: personOutline }),
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
