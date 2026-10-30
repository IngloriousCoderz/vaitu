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

  sessionEnd(entity) {
    entity.isDrawerOpen = false
    entity.isReactivated = false
  },
}
