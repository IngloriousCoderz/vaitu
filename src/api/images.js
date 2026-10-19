import { randomId } from "../text/index.js"
import { supabase } from "./client.js"

const BUCKET = "event-images"

const EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export function imageExtension(type) {
  return EXTENSIONS[type] ?? null
}

export async function uploadUserImage(file) {
  const extension = imageExtension(file.type)
  if (!extension) throw new Error("Unsupported image")
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not logged in")
  const path = `${user.id}/${randomId()}.${extension}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
  })
  if (error) throw error
  return {
    path,
    url: supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
  }
}

export async function deleteUserImage(path) {
  if (!path) return
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

export function imagePathFromUrl(url) {
  if (typeof url !== "string") return null
  const [, path] = url.split(`/${BUCKET}/`)
  return path ? decodeURIComponent(path) : null
}
