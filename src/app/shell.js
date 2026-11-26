import { stampLogin } from "../api/session.js"

export const Shell = {
  create(entity) {
    entity.isDrawerOpen = false
    entity.isDrawerHidden = false
    entity.isDrawerCollapsed = false
    entity.isReactivated = false
  },

  drawerToggle(entity, { isWide } = {}) {
    if (isWide) entity.isDrawerHidden = !entity.isDrawerHidden
    else entity.isDrawerOpen = !entity.isDrawerOpen
  },

  drawerClose(entity) {
    entity.isDrawerOpen = false
  },

  drawerCollapseToggle(entity) {
    entity.isDrawerCollapsed = !entity.isDrawerCollapsed
  },

  reactivatedShow(entity) {
    entity.isReactivated = true
  },

  reactivatedDismiss(entity) {
    entity.isReactivated = false
  },

  // Records the sign-in, and says so if it brought a deactivated account back.
  sessionStart(_entity, _, api) {
    stampLogin().then((isReactivated) => {
      if (isReactivated) api.notify("#shell:reactivatedShow")
    })
  },

  sessionEnd(entity) {
    entity.isDrawerOpen = false
    entity.isReactivated = false
  },
}
