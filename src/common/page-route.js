export function pageRouteChange(open, close, select = () => undefined) {
  return function routeChange(entity, payload, api) {
    /* `payload.route`, never the router entity: this runs inside the router's
       own notify, where the router still names the route being left. */
    if (payload.route !== entity.id) {
      close(entity)
      return
    }
    open(entity, select(payload), api)
  }
}
