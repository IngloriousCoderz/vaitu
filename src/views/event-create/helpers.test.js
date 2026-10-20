import { describe, expect, it } from "vitest"

import {
  applyCropPan,
  applyCropResize,
  clampCropRect,
  cropHitTest,
  cropOutputSize,
  cropSourceRect,
  cropWindowStyle,
  defaultCropRect,
  scaleCropRect,
} from "./helpers.js"

describe("clampCropRect", () => {
  it("keeps the rect inside the photo", () => {
    expect(clampCropRect({ x: -1, y: 2, w: 3, h: 3 })).toEqual({
      x: 0,
      y: 0,
      w: 1,
      h: 1,
    })
  })

  it("enforces a minimum size", () => {
    const rect = clampCropRect({ x: 0.5, y: 0.5, w: 0.01, h: 0.01 })
    expect(rect.w).toBeGreaterThanOrEqual(0.1)
    expect(rect.h).toBeGreaterThanOrEqual(0.1)
  })
})

describe("applyCropResize", () => {
  const start = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 }

  it("widens from the east edge without changing height", () => {
    expect(applyCropResize(start, "e", 0.1, 0.5)).toEqual({
      x: 0.2,
      y: 0.2,
      w: 0.5,
      h: 0.4,
    })
  })

  it("shortens from the north edge without changing width", () => {
    const next = applyCropResize(start, "n", 0.5, 0.1)
    expect(next.x).toBeCloseTo(0.2)
    expect(next.y).toBeCloseTo(0.3)
    expect(next.w).toBeCloseTo(0.4)
    expect(next.h).toBeCloseTo(0.3)
  })

  it("can stretch to a full-width strip", () => {
    const tall = { x: 0.25, y: 0.4, w: 0.5, h: 0.2 }
    expect(applyCropResize(tall, "w", -0.25, 0)).toEqual({
      x: 0,
      y: 0.4,
      w: 0.75,
      h: 0.2,
    })
    expect(applyCropResize(tall, "e", 0.25, 0)).toEqual({
      x: 0.25,
      y: 0.4,
      w: 0.75,
      h: 0.2,
    })
  })
})

describe("applyCropPan", () => {
  it("moves the rect and clamps at the edges", () => {
    expect(applyCropPan({ x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, -1, 0)).toEqual({
      x: 0,
      y: 0.1,
      w: 0.5,
      h: 0.5,
    })
  })
})

describe("scaleCropRect", () => {
  it("grows both axes from the centre", () => {
    const next = scaleCropRect({ x: 0.25, y: 0.25, w: 0.5, h: 0.5 }, 2)
    expect(next.w).toBeCloseTo(1)
    expect(next.h).toBeCloseTo(1)
    expect(next.x).toBeCloseTo(0)
    expect(next.y).toBeCloseTo(0)
  })
})

describe("cropHitTest", () => {
  const rect = { x: 0.2, y: 0.2, w: 0.4, h: 0.4 }

  it("detects corner and edge handles", () => {
    expect(cropHitTest(0.2, 0.2, rect, 400, 400)).toBe("nw")
    expect(cropHitTest(0.6, 0.4, rect, 400, 400)).toBe("e")
    expect(cropHitTest(0.4, 0.4, rect, 400, 400)).toBe("move")
  })

  it("returns null outside the rect", () => {
    expect(cropHitTest(0.05, 0.05, rect, 400, 400)).toBeNull()
  })
})

describe("cropSourceRect", () => {
  it("maps the free rect onto source pixels", () => {
    const rect = cropSourceRect(1000, 500, { x: 0.1, y: 0.2, w: 0.5, h: 0.4 })
    expect(rect).toEqual({ sx: 100, sy: 100, sw: 500, sh: 200 })
  })

  it("defaults to the whole photo", () => {
    expect(cropSourceRect(800, 600, defaultCropRect())).toEqual({
      sx: 0,
      sy: 0,
      sw: 800,
      sh: 600,
    })
  })
})

describe("cropOutputSize", () => {
  it("caps a large crop at 1680x720", () => {
    expect(cropOutputSize(3360, 1440)).toEqual({ width: 1680, height: 720 })
  })

  it("does not upscale a small crop", () => {
    expect(cropOutputSize(800, 343)).toEqual({ width: 800, height: 343 })
  })
})

describe("cropWindowStyle", () => {
  it("positions from the top-left of the free rect", () => {
    const style = cropWindowStyle({ x: 0.1, y: 0.2, w: 0.5, h: 0.25 })
    expect(style).toContain("left:10%")
    expect(style).toContain("top:20%")
    expect(style).toContain("width:50%")
    expect(style).toContain("height:25%")
  })
})
