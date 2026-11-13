import { App } from "@capacitor/app"
import { watchBackButton } from "@inglorious/web/native/back-button"

import { ROOT_PATHS } from "./app"

watchBackButton(App, { rootPaths: ROOT_PATHS })
