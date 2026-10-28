import assignmentOutline from "@iconify-icons/material-symbols/assignment-outline"
import editCalendarOutline from "@iconify-icons/material-symbols/edit-calendar-outline"
import eventOutline from "@iconify-icons/material-symbols/event-outline"
import personOutline from "@iconify-icons/material-symbols/person-outline"
import { Drawer } from "@inglorious/ui/drawer"
import { Icon } from "@inglorious/ui/icon"
import { List } from "@inglorious/ui/list"

import { Logo } from "../../common/logo/index.js"
import { labelled } from "../../i18n/index.js"

const NAV = [
  labelled("nav.events", { id: "events", icon: eventOutline, tab: "events" }),
  labelled("nav.myEvents", {
    id: "myEvents",
    icon: editCalendarOutline,
    tab: "myEvents",
  }),
  labelled("nav.applications", {
    id: "applications",
    icon: assignmentOutline,
    tab: "applications",
  }),
  labelled("nav.profile", {
    id: "profile",
    icon: personOutline,
    tab: "profile",
  }),
]

// The package drawer with the brand in its header, as in the Inglorious UI
// dashboard. Who is signed in lives at the end of the app bar instead.
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
      title: Logo.render(),
      onClose,
      onCollapseToggle,
      children: List.render({
        isInset: true,
        padding: "sm",
        items: NAV.map((item) => ({
          id: item.id,
          primary: item.label,
          icon: Icon.render({ icon: item.icon, size: "lg" }),
          isSelected: active === item.tab,
          onClick: () => onNavigate(item.id),
        })),
      }),
    })
  },
}
