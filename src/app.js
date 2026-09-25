export const App = {
  render(_, api) {
    const detail = api.getEntity("detail")
    if (detail.eventId) return api.render("detail")
    return api.render("market")
  },
}
