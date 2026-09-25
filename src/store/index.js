import { createStore } from "@inglorious/store"

import { MarketPage } from "../types/market-page/index.js"
import { entities } from "./entities"
import { middlewares } from "./middlewares"

export const store = createStore({
  types: { MarketPage },
  entities,
  middlewares,
})
