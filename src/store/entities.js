export const entities = {
  market: {
    type: "MarketPage",
    query: "",
    active_category: "wedding",
    active_filter: "all",
    events: [],
    status: "loading",
    error: null,
  },
  detail: {
    type: "EventDetail",
    event_id: null,
    event: null,
    sender_name: null,
    status: "idle",
    error: null,
    full_name: "",
    website: "",
    instagram: "",
    motivation: "",
    submitted: false,
  },
}
