import {
  HALF,
  IMAGE_JPEG_QUALITY,
  IMAGE_JPEG_TYPE,
} from "../constants/index.js"

// Browser-side image work: decode once, then draw the requested source rectangle
// into a canvas. `createImageBitmap` is the path that can honour EXIF rotation;
// the <img> fallback is for browsers without it (and still respects the
// browser's own image-orientation rule).
export async function decodeImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" })
    } catch {
      // Some engines reject the options object (or the file itself). Try the
      // plain decoder before dropping to an HTMLImageElement.
      try {
        return await createImageBitmap(file)
      } catch {
        // Fall through to the element decoder.
      }
    }
  }
  return decodeWithImageElement(file)
}

export function sourceSize(source) {
  return {
    width: source.naturalWidth ?? source.width,
    height: source.naturalHeight ?? source.height,
  }
}

export function squareSourceRect(width, height) {
  const side = Math.min(width, height)
  return {
    sx: (width - side) * HALF,
    sy: (height - side) * HALF,
    sw: side,
    sh: side,
  }
}

export async function resizeSquareToBlob(
  source,
  size,
  type = IMAGE_JPEG_TYPE,
  quality = IMAGE_JPEG_QUALITY,
) {
  const { width, height } = sourceSize(source)
  const rect = squareSourceRect(width, height)
  return drawToBlob(source, rect, { width: size, height: size }, type, quality)
}

export function cropToBlob(
  source,
  rect,
  size,
  type = IMAGE_JPEG_TYPE,
  quality = IMAGE_JPEG_QUALITY,
) {
  return drawToBlob(source, rect, size, type, quality)
}

export function createImageFile(blob, name) {
  return new File([blob], name, {
    type: blob.type,
    lastModified: Date.now(),
  })
}

function drawToBlob(source, rect, size, type, quality) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    canvas.width = size.width
    canvas.height = size.height
    const context = canvas.getContext("2d")
    if (!context) {
      reject(new Error("Canvas is unavailable"))
      return
    }
    // JPEG has no alpha channel; paint the transparent parts white instead of
    // letting the encoder turn them black.
    context.fillStyle = "white"
    context.fillRect(0, 0, size.width, size.height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = "high"
    context.drawImage(
      source,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      0,
      0,
      size.width,
      size.height,
    )
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Could not encode image"))
      },
      type,
      quality,
    )
  })
}

function decodeWithImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Could not read image"))
    }
    image.src = url
  })
}
