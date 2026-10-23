// Wrap an encoded image in a File, which is what the storage upload takes.
export function createImageFile(blob, name) {
  return new File([blob], name, {
    type: blob.type,
    lastModified: Date.now(),
  })
}
