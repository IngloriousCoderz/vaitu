export function createImageFile(blob, name) {
  return new File([blob], name, {
    type: blob.type,
    lastModified: Date.now(),
  })
}
