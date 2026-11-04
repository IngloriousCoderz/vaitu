import assignmentOutline from "@iconify-icons/material-symbols/assignment-outline"
import editCalendarOutline from "@iconify-icons/material-symbols/edit-calendar-outline"
import eventOutline from "@iconify-icons/material-symbols/event-outline"
import notificationsOutline from "@iconify-icons/material-symbols/notifications-outline"
import personOutline from "@iconify-icons/material-symbols/person-outline"
import { BottomNavigation } from "@inglorious/ui/bottom-navigation"
import { Icon } from "@inglorious/ui/icon"
import { html } from "@inglorious/web"

import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const tabs = [
  { value: "jobs", icon: eventOutline, label: "nav.tabs.jobs" },
  {
    value: "applications",
    icon: assignmentOutline,
    label: "nav.tabs.applications",
  },
  { value: "myJobs", icon: editCalendarOutline, label: "nav.tabs.myJobs" },
  {
    value: "notifications",
    icon: notificationsOutline,
    label: "nav.tabs.notifications",
  },
  { value: "profile", icon: personOutline, label: "nav.tabs.profile" },
]

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
            label: t(tab.label),
            icon: Icon.render({ icon: tab.icon, size: "lg" }),
          })),
        })}
      </nav>
    `
  },
}
