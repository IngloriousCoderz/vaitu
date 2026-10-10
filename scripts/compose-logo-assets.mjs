// WHY THIS EXISTS (and why it is not reimplementing @capacitor/assets)
//
// @capacitor/assets does ~95% of the work: it emits all 148 Android files and
// 14 iOS files, writes Contents.json, and handles dark variants and every
// density. This script only produces the five SOURCE images that Full Control
// mode consumes. Delete it and you lose per-target sizing, not the generator.
//
// The alternative — a hand-made square assets/logo.svg with the mark pre-inset
// — was tested and rejected. It works for icons, but splash scaling in
// @capacitor/assets is computed from the SOURCE FILE width, not the artwork
// (`asset.width * logoSplashScale`, see platforms/ios/index.js). So the correct
// flag is `--logoSplashScale 1.456`, a number derived from this specific logo's
// inset fraction. Change the logo and the splash silently shrinks to ~6% — no
// error, just a too-small mark. This script derives the size instead, so a
// different logo just produces different (correct) numbers.
//
// Two sharp traps this absorbs, both hit during development:
//
//  1. resize(w, h) defaults to fit:"cover" — it fills the box and CROPS the
//     overflow. On a non-square mark that slices the swoosh tips and the dot
//     off both sides. Pass width only, which preserves aspect.
//  2. Android adaptive icons are masked to the middle 72/108 of the canvas.
//     55% of the canvas is the largest size with zero pixels outside that
//     circle; 60% clips the tips, 70% loses ~10% of the mark.
//
// Cost of keeping it: 57 lines, and it uses sharp, already a devDependency.
// Worst case if it rots is wrong-sized icons, not a broken app.
//
// Run via `pnpm assets` (compose + generate).

import { mkdir, readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const LOGO = fileURLToPath(new URL("../public/logo.svg", import.meta.url))
const OUT = fileURLToPath(new URL("../assets/", import.meta.url))

const LIGHT = "#f6f3ea"
const DARK = "#2b2b26"

// Android adaptive icons are cropped to a circle covering the middle 72/108 of
// the canvas (the outer 18/108 bleeds away). Measured against that circle:
// 55% fits with nothing cut, 60% clips the swoosh tips, 65% loses ~5% of the
// mark. 55% is the largest size that survives every launcher's mask intact.
const ICON_MARK = 0.55
const ADAPTIVE_MARK = 0.55
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

  // Scale by WIDTH ONLY, so the mark spans `fraction` of the canvas width and
  // keeps its aspect. A two-argument resize() would default to fit:"cover",
  // which fills the square canvas and slices the left/right ends off the swoosh
  // and the dot (sharp 0.32+, hit on Android when the viewBox was cropped).
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