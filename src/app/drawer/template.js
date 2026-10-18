import "./style.module.css"

import { Drawer } from "@inglorious/ui/drawer"
import { List } from "@inglorious/ui/list"
import { MaterialIcon } from "@inglorious/ui/material-icon"

import { Logo } from "../../common/logo/index.js"

const NAV = [
  { id: "events", label: "Events", icon: "event", tab: "events" },
  {
    id: "applications",
    label: "Applications",
    icon: "assignment",
    tab: "applications",
  },
  { id: "profile", label: "Profile", icon: "person", tab: "profile" },
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
          icon: MaterialIcon.render({ name: item.icon, size: "lg" }),
          isSelected: active === item.tab,
          onClick: () => onNavigate(item.id),
        })),
      }),
    })
  },
}
