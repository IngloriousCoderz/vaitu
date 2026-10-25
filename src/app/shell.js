// The drawer's three states, as the package drawer names them. Below 64rem it
// is an overlay that opens and closes; from 64rem it is a sidebar that can be
// hidden, or collapsed to its icons.
export const Shell = {
  create(entity) {
    entity.isDrawerOpen = false
    entity.isDrawerHidden = false
    entity.isDrawerCollapsed = false
  },

  // `isWide` comes from the caller, which can read the viewport: the same
  // button opens the overlay on a small screen and hides the sidebar on a
  // wide one.
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

  sessionEnd(entity) {
    entity.isDrawerOpen = false
  },
}
