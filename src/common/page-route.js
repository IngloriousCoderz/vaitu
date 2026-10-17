// The route is the source of truth for which page is live, so a page opens and
// loads from its routeChange handler. Everything else reads the route rather
// than an `isOpen` flag, which is what used to make app.js a cascade.
//
// `open(entity, args, api)` runs when the route names this page, with whatever
// `select(payload)` picks out of the route; `close(entity)` runs otherwise.
export function pageRouteChange(open, close, select = () => undefined) {
  return function routeChange(entity, payload, api) {
    /* `payload.route`, never `api.getEntity("router").route`. This handler runs
       from inside the router's own notify, and a notification dispatched from a
       handler reads the state as it was before that handler's batch committed —
       so the router entity still named the route we are leaving. That made a
       back navigation look like the page we were on, and open() ran with the new
       route's empty params. The payload is the resolved route and cannot lag. */
    if (payload.route !== entity.id) {
      close(entity)
      return
    }
    open(entity, select(payload), api)
  }
}
