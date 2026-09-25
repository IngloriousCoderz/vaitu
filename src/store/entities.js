export const entities = {
  market: {
    type: "MarketPage",
    query: "",
    activeCategory: "wedding",
    activeFilter: "all",
    events: [],
    status: "loading",
    error: null,
  },
  detail: {
    type: "EventDetail",
    eventId: null,
    event: null,
    senderName: null,
    status: "idle",
    error: null,
    fullName: "",
    website: "",
    instagram: "",
    motivation: "",
    submitted: false,
  },
}
