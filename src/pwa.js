import { isNative } from "@inglorious/web/mobile"
import { registerSW } from "virtual:pwa-register"

if (!isNative()) {
  registerSW()
}
