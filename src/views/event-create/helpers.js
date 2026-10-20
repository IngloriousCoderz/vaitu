import {
  COVER_HANDLE_HIT_PX,
  COVER_MIN_CROP,
  COVER_OUTPUT_HEIGHT,
  COVER_OUTPUT_WIDTH,
  HALF,
  PERCENT_SCALE,
  SINGULAR,
} from "../../constants/index.js"

export const CROP_HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"]

export function defaultCropRect() {
  return { x: 0, y: 0, w: 1, h: 1 }
}

export function readCropRect(entity) {
  return clampCropRect({
    x: entity?.cropX ?? 0,
    y: entity?.cropY ?? 0,
    w: entity?.cropW ?? 1,
    h: entity?.cropH ?? 1,
  })
}

export function writeCropRect(entity, rect) {
  const next = clampCropRect(rect)
  entity.cropX = next.x
  entity.cropY = next.y
  entity.cropW = next.w
  entity.cropH = next.h
  return next
}

export function clampCropRect({ x = 0, y = 0, w = 1, h = 1 } = {}) {
  const width = Math.min(SINGULAR, Math.max(COVER_MIN_CROP, w))
  const height = Math.min(SINGULAR, Math.max(COVER_MIN_CROP, h))
  const left = Math.min(Math.max(0, x), SINGULAR - width)
  const top = Math.min(Math.max(0, y), SINGULAR - height)
  return {
    x: left,
    y: top,
    w: Math.min(width, SINGULAR - left),
    h: Math.min(height, SINGULAR - top),
  }
}

// Which handle (or "move") is under the pointer. Coords are 0–1 on the photo.
export function cropHitTest(nx, ny, rect, stageWidth, stageHeight) {
  if (!stageWidth || !stageHeight) return null
  const r = clampCropRect(rect)
  const tx = Math.max(COVER_HANDLE_HIT_PX / stageWidth, 0.025)
  const ty = Math.max(COVER_HANDLE_HIT_PX / stageHeight, 0.025)
  const left = r.x
  const right = r.x + r.w
  const top = r.y
  const bottom = r.y + r.h
  const nearL = Math.abs(nx - left) <= tx
  const nearR = Math.abs(nx - right) <= tx
  const nearT = Math.abs(ny - top) <= ty
  const nearB = Math.abs(ny - bottom) <= ty
  const inX = nx >= left - tx && nx <= right + tx
  const inY = ny >= top - ty && ny <= bottom + ty

  if (nearT && nearL) return "nw"
  if (nearT && nearR) return "ne"
  if (nearB && nearL) return "sw"
  if (nearB && nearR) return "se"
  if (nearT && inX) return "n"
  if (nearB && inX) return "s"
  if (nearL && inY) return "w"
  if (nearR && inY) return "e"
  if (nx >= left && nx <= right && ny >= top && ny <= bottom) return "move"
  return null
}

export function applyCropPan(rect, dx, dy) {
  return clampCropRect({
    x: rect.x + dx,
    y: rect.y + dy,
    w: rect.w,
    h: rect.h,
  })
}

// Resize one edge/corner. dx/dy are normalised photo fractions.
export function applyCropResize(start, handle, dx, dy) {
  let { x, y, w, h } = start
  const right = start.x + start.w
  const bottom = start.y + start.h

  if (handle.includes("e")) {
    w = Math.min(SINGULAR - start.x, Math.max(COVER_MIN_CROP, start.w + dx))
  }
  if (handle.includes("w")) {
    x = Math.min(right - COVER_MIN_CROP, Math.max(0, start.x + dx))
    w = right - x
  }
  if (handle.includes("s")) {
    h = Math.min(SINGULAR - start.y, Math.max(COVER_MIN_CROP, start.h + dy))
  }
  if (handle.includes("n")) {
    y = Math.min(bottom - COVER_MIN_CROP, Math.max(0, start.y + dy))
    h = bottom - y
  }

  return clampCropRect({ x, y, w, h })
}

// Uniform scale around the rect centre (pinch / wheel / +/-).
export function scaleCropRect(rect, factor) {
  if (!factor || factor === SINGULAR) return clampCropRect(rect)
  const cx = rect.x + rect.w * HALF
  const cy = rect.y + rect.h * HALF
  const w = Math.min(SINGULAR, Math.max(COVER_MIN_CROP, rect.w * factor))
  const h = Math.min(SINGULAR, Math.max(COVER_MIN_CROP, rect.h * factor))
  return clampCropRect({
    x: cx - w * HALF,
    y: cy - h * HALF,
    w,
    h,
  })
}

export function cropSourceRect(imageWidth, imageHeight, rect) {
  if (!imageWidth || !imageHeight) {
    return { sx: 0, sy: 0, sw: 0, sh: 0 }
  }
  const r = clampCropRect(rect)
  return {
    sx: r.x * imageWidth,
    sy: r.y * imageHeight,
    sw: r.w * imageWidth,
    sh: r.h * imageHeight,
  }
}

// Cap at the cover target size; never upscale. Aspect follows the free rect.
export function cropOutputSize(sourceWidth, sourceHeight) {
  if (!sourceWidth || !sourceHeight) {
    return { width: COVER_OUTPUT_WIDTH, height: COVER_OUTPUT_HEIGHT }
  }
  const scale = Math.min(
    1,
    COVER_OUTPUT_WIDTH / sourceWidth,
    COVER_OUTPUT_HEIGHT / sourceHeight,
  )
  return {
    width: Math.max(1, Math.round(sourceWidth * scale)),
    height: Math.max(1, Math.round(sourceHeight * scale)),
  }
}

export function cropWindowStyle(rect) {
  const r = clampCropRect(rect)
  return [
    `left:${r.x * PERCENT_SCALE}%;`,
    `top:${r.y * PERCENT_SCALE}%;`,
    `width:${r.w * PERCENT_SCALE}%;`,
    `height:${r.h * PERCENT_SCALE}%;`,
  ].join("")
}
