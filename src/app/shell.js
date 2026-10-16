// Drawer open/closed. A module flag would not re-render the shell.
export const Shell = {
  create(entity) {
    entity.isDrawerOpen = false
  },

  toggleDrawer(entity) {
    entity.isDrawerOpen = !entity.isDrawerOpen
  },

  closeDrawer(entity) {
    entity.isDrawerOpen = false
  },
}
