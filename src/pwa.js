import { isNative } from "@inglorious/web/native"
import { registerSW } from "virtual:pwa-register"

// The PwaUpdate type in the store keeps the installed app on this worker's
// latest version.
if (!isNative()) registerSW()
