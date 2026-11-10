import { homedir } from "node:os"
import path from "node:path"
import process from "node:process"

export const PRIVATE_KEY_PATH =
  process.env.LIVE_UPDATE_PRIVATE_KEY ??
  path.join(homedir(), ".config", "vaitu", "live-update.pem")

export const PUBLIC_KEY_PATH = "live-update.pub.pem"
