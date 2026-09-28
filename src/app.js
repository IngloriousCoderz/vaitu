export const App = {
  render(_, api) {
    const detail = api.getEntity("detail")
    if (detail.event_id) return api.render("detail")
    return api.render("market")
  },
}
