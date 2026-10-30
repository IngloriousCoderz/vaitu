// Why not @capacitor/assets alone: it scales the splash from the source file's
// width, not the artwork, so a hand-made logo needs a magic --logoSplashScale
// that breaks silently when the logo changes. This derives the sizes.
// Two traps it absorbs: resize(w, h) crops a non-square mark, so pass the width
// only; Android adaptive icons are masked to the middle 72/108, so the mark
// fits in 55% of the canvas.

import { mkdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const LOGO = fileURLToPath(new URL("../public/logo.svg", import.meta.url))
const OUT = fileURLToPath(new URL("../assets/", import.meta.url))

const LIGHT = "#f6f3ea"
const DARK = "#2b2b26"

const ICON_MARK = 0.75
const ADAPTIVE_MARK = 0.75
const SPLASH_MARK = 0.3

function rgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  }
}

async function main() {
  const svg = await readFile(LOGO)
  await mkdir(OUT, { recursive: true })

  const mark = (canvas, fraction) =>
    sharp(svg)
      .resize(Math.round(canvas * fraction))
      .png()
      .toBuffer()

  const canvas = (size, background) =>
    sharp({ create: { width: size, height: size, channels: 4, background } })

  await canvas(1024, rgb(LIGHT))
    .composite([{ input: await mark(1024, ICON_MARK), gravity: "centre" }])
    .png()
    .toFile(OUT + "icon-only.png")

  await canvas(1024, { r: 0, g: 0, b: 0, alpha: 0 })
    .composite([{ input: await mark(1024, ADAPTIVE_MARK), gravity: "centre" }])
    .png()
    .toFile(OUT + "icon-foreground.png")

  await canvas(1024, rgb(LIGHT))
    .png()
    .toFile(OUT + "icon-background.png")

  for (const [name, background] of [
    ["splash", rgb(LIGHT)],
    ["splash-dark", rgb(DARK)],
  ]) {
    await canvas(2732, background)
      .composite([{ input: await mark(2732, SPLASH_MARK), gravity: "centre" }])
      .png()
      .toFile(OUT + `${name}.png`)
  }

  const written = [
    "icon-only.png",
    "icon-foreground.png",
    "icon-background.png",
    "splash.png",
    "splash-dark.png",
  ]
  process.stdout.write(`composed ${written.length} sources in assets/\n`)
}

await main()
