import eventOutline from "@iconify-icons/material-symbols/event-outline"
import markEmailReadOutline from "@iconify-icons/material-symbols/mark-email-read-outline"
import notificationsActiveOutline from "@iconify-icons/material-symbols/notifications-active-outline"
import personCheckOutline from "@iconify-icons/material-symbols/person-check-outline"
import personRemoveOutline from "@iconify-icons/material-symbols/person-remove-outline"
import { Drawer } from "@inglorious/ui/drawer"
import { Flex } from "@inglorious/ui/flex"
import { Icon } from "@inglorious/ui/icon"
import { html } from "@inglorious/web"

import { LIST_STAGGER_CAP } from "../../constants/index.js"
import { currentLocale, t } from "../../i18n/index.js"
import { Page } from "../page/index.js"
import { PageStatus } from "../page-status/index.js"
import styles from "./style.module.css"

// Whose notification is which: one icon per type, read straight from the
// database's type column. Event edits and closures share the event glyph —
// they differ in tone, not in shape.
const INBOX_ICONS = {
  application_received: notificationsActiveOutline,
  application_selected: personCheckOutline,
  application_rejected: personRemoveOutline,
  event_updated: eventOutline,
  event_closed: eventOutline,
}

export const Notifications = {
  render(props, api) {
    return this.renderInbox(props, api)
  },

  // The app bar names the tab; "Mark all read" lives here so the rows and
  // the button that empties their badge stay together.
  renderHeader(entity, api) {
    const unread = entity.unread ?? 0
    return {
      title: t("notifications.title"),
      actions:
        unread > 0
          ? html`<button type="button" class=${styles.markAll}
              @click=${() => api.notify("#notifications:readAll")}
              >${Icon.render({
                icon: markEmailReadOutline,
                size: "md",
              })}<span>${t("notifications.markAll")}</span></button
            >`
          : "",
    }
  },

  renderInbox({ entity, onOpenRow }) {
    const { items = [], status = "idle", error = null } = entity
    return Page.render({
      variant: "sticky",
      wide: true,
      children: [
        html`
          <main class="${styles.list} vaitu-list">
            ${
              PageStatus.render({
                isError: status === "error",
                error,
                isLoading: status === "loading" || status === "idle",
                loadingText: t("notifications.loading"),
                isEmpty: !items.length,
                emptyText: t("notifications.empty"),
              }) ??
              items.map((item, index) =>
                renderFeedItem({ item, onOpenRow, index })
              )
            }
          </main>
        `,
      ],
    })
  },
}

// The tablet+ bell: a right-anchored drawer over the page, wired by the
// shell. The rows are the feed's rows; the page stays for the phone tab.
export const NotificationsPanel = {
  render({ isOpen, entity, onClose, onOpenRow, onMarkAll }) {
    const { items = [], status = "idle", unread = 0, error = null } = entity
    return Drawer.render({
      isOpen,
      /* The package drawer doubles as a docked sidebar at ≥64rem, where its
         closed state keeps `transform: none` — a closed panel would paint on
         the right edge of the page forever. `isHidden` is that state's off
         switch: it slides this one out of the viewport whenever it is not
         open, at every width. */
      isHidden: !isOpen,
      anchor: "right",
      className: styles.panel,
      onClose,
      title: Flex.render({
        direction: "row",
        align: "center",
        gap: "sm",
        children: [
          html`<span class=${styles.panelTitle}
            >${t("notifications.title")}</span
          >`,
          unread > 0
            ? html`<button type="button" class=${styles.markAll}
                @click=${onMarkAll}>${Icon.render({
                  icon: markEmailReadOutline,
                  size: "md",
                })}<span>${t("notifications.markAll")}</span></button
              >`
            : "",
        ],
      }),
      children: html`
        <div class="${styles.panelBody} vaitu-list">
          ${
            PageStatus.render({
              isError: status === "error",
              error,
              isLoading: status === "loading" || status === "idle",
              loadingText: t("notifications.loading"),
              isEmpty: !items.length,
              emptyText: t("notifications.empty"),
            }) ??
            items.map((item, index) =>
              renderFeedItem({ item, onOpenRow, index })
            )
          }
        </div>
      `,
    })
  },
}

// One feed row on any surface it is shown on: the inbox page, or the
// right-side drawer the shell opens over it. Clicking always hands the row
// back to the surface that rendered it — the type maps the row elsewhere:
// the owner's review page while the event is open, the application's own
// detail once decided, the event's detail for anything about the event.
function renderFeedItem({ item, onOpenRow, index }) {
  const classes = [
    styles.item,
    "vaitu-list-item",
    item.read ? styles.read : styles.unread,
  ]
    .filter(Boolean)
    .join(" ")
  return Flex.render({
    direction: "row",
    align: "center",
    gap: "sm",
    className: classes,
    style: `--vaitu-list-index:${Math.min(index, LIST_STAGGER_CAP)}`,
    role: "button",
    tabIndex: 0,
    onClick: () => onOpenRow(item),
    children: [
      html`<span class=${styles.glyph}
        >${Icon.render({
          icon: INBOX_ICONS[item.type] ?? eventOutline,
          size: "md",
        })}${item.read ? "" : html`<i class=${styles.dot}></i>`}</span
      >`,
      Flex.render({
        direction: "column",
        gap: "sm",
        className: styles.copy,
        children: [
          html`<span class=${styles.title}>${feedLine(item)}</span>`,
          html`<time class=${styles.stamp} datetime=${item.created_at}
            >${formatStamp(item.created_at)}</time
          >`,
        ],
      }),
    ],
  })
}

// One textual line per type, driven by the row itself: the applicant's name
// for a received application, the event's title for everything else.
function feedLine(item) {
  const title = item.event_title ?? ""
  switch (item.type) {
    case "application_received":
      return t("notifications.types.applicationReceived", {
        name: item.applicant_name ?? "",
        title,
      })
    case "application_selected":
      return t("notifications.types.applicationSelected", { title })
    case "application_rejected":
      return t("notifications.types.applicationRejected", { title })
    case "event_closed":
      return t("notifications.types.eventClosed", { title })
    default:
      return t("notifications.types.eventUpdated", { title })
  }
}

function formatStamp(iso) {
  const stamp = new Date(iso)
  const locale = currentLocale()
  const day = stamp.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  })
  const time = stamp.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  })
  return `${day} · ${time}`
}
