import assignmentOutline from "@iconify-icons/material-symbols/assignment-outline"
import editCalendarOutline from "@iconify-icons/material-symbols/edit-calendar-outline"
import eventOutline from "@iconify-icons/material-symbols/event-outline"
import helpOutline from "@iconify-icons/material-symbols/help-outline"
import personOutline from "@iconify-icons/material-symbols/person-outline"
import settingsOutline from "@iconify-icons/material-symbols/settings-outline"
import { Drawer } from "@inglorious/ui/drawer"
import { Icon } from "@inglorious/ui/icon"
import { List } from "@inglorious/ui/list"

import { Logo } from "../../common/logo/index.js"
import { t } from "../../i18n/index.js"
import styles from "./style.module.css"

const NAV = [
  { id: "events", icon: eventOutline, tab: "events", label: "nav.events" },
  {
    id: "applications",
    icon: assignmentOutline,
    tab: "applications",
    label: "nav.applications",
  },
  {
    id: "myEvents",
    icon: editCalendarOutline,
    tab: "myEvents",
    label: "nav.myEvents",
  },
  { id: "profile", icon: personOutline, tab: "profile", label: "nav.profile" },
  {
    id: "preferences",
    icon: settingsOutline,
    tab: "preferences",
    label: "nav.preferences",
  },
  { id: "about", icon: helpOutline, tab: "about", label: "nav.about" },
]

export const AppDrawer = {
  render({
    isOpen,
    isHidden,
    isCollapsed,
    active,
    onClose,
    onCollapseToggle,
    onNavigate,
  }) {
    return Drawer.render({
      isOpen,
      isHidden,
      isCollapsed,
      anchor: "left",
      className: styles.drawer,
      title: Logo.render(),
      closeLabel: t("common.close"),
      collapseLabel: t("nav.collapse"),
      expandLabel: t("nav.expand"),
      onClose,
      onCollapseToggle,
      children: List.render({
        isInset: true,
        padding: "sm",
        items: NAV.map((item) => ({
          id: item.id,
          primary: t(item.label),
          icon: Icon.render({ icon: item.icon, size: "lg" }),
          isSelected: active === item.tab,
          onClick: () => onNavigate(item.id),
        })),
      }),
    })
  },
}
