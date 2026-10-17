import { Avatar } from "@inglorious/ui/avatar"
import { Button } from "@inglorious/ui/button"
import { Drawer } from "@inglorious/ui/drawer"
import { Flex } from "@inglorious/ui/flex"
import { IconButton } from "@inglorious/ui/icon-button"
import { List } from "@inglorious/ui/list"
import { MaterialIcon } from "@inglorious/ui/material-icon"
import { html } from "@inglorious/web"

import styles from "./style.module.css"

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

export const AppDrawer = {
  render({ isOpen, name, initials, active, onClose, onNavigate, onLogout }) {
    return Drawer.render({
      isOpen,
      anchor: "left",
      title: Flex.render({
        align: "center",
        justify: "between",
        gap: "sm",
        isFullWidth: true,
        className: styles.who,
        children: [
          Flex.render({
            align: "center",
            gap: "md",
            className: styles.identity,
            children: [
              Avatar.render({
                initials,
                backgroundColor: "linear-gradient(135deg, #6b7a5e, #24402f)",
                textColor: "#fffdf7",
              }),
              html`<span class=${styles.name}>${name}</span>`,
            ],
          }),
          IconButton.render({
            icon: MaterialIcon.render({ name: "close", size: "lg" }),
            variant: "ghost",
            ariaLabel: "Close",
            className: `vaitu-compact ${styles.close}`,
            onClick: onClose,
          }),
        ],
      }),
      onClose,
      children: Flex.render({
        direction: "column",
        className: styles.body,
        children: [
          List.render({
            isInset: true,
            padding: "sm",
            items: [
              ...NAV.map((item) => ({
                id: item.id,
                primary: item.label,
                icon: MaterialIcon.render({
                  name: item.icon,
                  size: "lg",
                }),
                isSelected: active === item.tab,
                onClick: () => onNavigate(item.id),
              })),
            ],
          }),
          Flex.render({
            padding: "sm",
            className: styles.logout,
            children: [
              Button.render({
                children: "Logout",
                variant: "ghost",
                color: "secondary",
                isFullWidth: true,
                onClick: onLogout,
              }),
            ],
          }),
        ],
      }),
    })
  },
}
